const http = require('http');
const https = require('https');

const PORT = 3080;
const TARGET_HOST = 'agentrouter.org';

function prioritizeTools(tools, messages, max = 80) {
  if (!Array.isArray(tools) || tools.length <= max) return tools;

  const coreToolNames = new Set([
    'Bash', 'Glob', 'Grep', 'Read', 'Edit', 'Write', 'Task', 'Skill',
    'WebFetch', 'WebSearch', 'NotebookRead', 'NotebookEdit', 'Todo',
    'Stash', 'View', 'FileRead', 'FileEdit', 'FileCreate'
  ]);

  const historyToolNames = new Set();
  if (Array.isArray(messages)) {
    for (const m of messages) {
      if (Array.isArray(m.content)) {
        for (const c of m.content) {
          if (c.type === 'tool_use' && c.name) historyToolNames.add(c.name);
        }
      }
    }
  }

  const prioritized = [];
  const secondary = [];
  const remaining = [];

  for (const t of tools) {
    if (coreToolNames.has(t.name) || historyToolNames.has(t.name)) {
      prioritized.push(t);
    } else if (t.name.startsWith('mcp__') && !t.name.startsWith('mcp__aws__')) {
      secondary.push(t);
    } else {
      remaining.push(t);
    }
  }

  return [...prioritized, ...secondary, ...remaining].slice(0, max);
}

function forwardRequest(clientReq, bodyBuffer, clientRes, attempt = 1) {
  const headers = {
    ...clientReq.headers,
    host: TARGET_HOST,
    'user-agent': 'cline/4.1.19',
    'content-length': bodyBuffer.length,
    'accept-encoding': 'identity'
  };
  delete headers['connection'];

  const options = {
    hostname: TARGET_HOST,
    port: 443,
    path: clientReq.url,
    method: clientReq.method,
    headers
  };

  const proxyReq = https.request(options, proxyRes => {
    const isStream = proxyRes.headers['content-type']?.includes('text/event-stream');

    // If AgentRouter hits a broken upstream channel that returns 400 (reasoning_effort), retry on another channel
    if (proxyRes.statusCode === 400 && attempt < 4) {
      let errBuf = '';
      proxyRes.on('data', c => errBuf += c);
      proxyRes.on('end', () => {
        if (errBuf.includes('reasoning_effort') || errBuf.includes('chat/completions')) {
          console.log(`[Proxy] Hit bad upstream channel (attempt ${attempt}). Retrying on working channel...`);
          return forwardRequest(clientReq, bodyBuffer, clientRes, attempt + 1);
        }
        // If it's a different 400, send it back
        clientRes.writeHead(400, proxyRes.headers);
        clientRes.end(errBuf);
      });
      return;
    }

    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);

    let hasMessageStop = false;
    let blockIndex = 0;
    let stopReason = 'end_turn';

    proxyRes.on('data', chunk => {
      if (isStream) {
        const str = chunk.toString('utf8');
        if (str.includes('event: message_stop')) hasMessageStop = true;
        if (str.includes('"type":"tool_use"')) stopReason = 'tool_use';
        const matches = str.matchAll(/"index":\s*(\d+)/g);
        for (const m of matches) {
          blockIndex = parseInt(m[1], 10);
        }
      }
      clientRes.write(chunk);
    });

    proxyRes.on('end', () => {
      if (isStream && !hasMessageStop) {
        const completion = [
          `\nevent: content_block_stop`,
          `data: {"type":"content_block_stop","index":${blockIndex}}`,
          ``,
          `event: message_delta`,
          `data: {"type":"message_delta","delta":{"stop_reason":"${stopReason}","stop_sequence":null},"usage":{"output_tokens":0}}`,
          ``,
          `event: message_stop`,
          `data: {"type":"message_stop"}`,
          ``,
          ``
        ].join('\n');
        clientRes.write(completion);
      }
      clientRes.end();
    });
  });


  proxyReq.on('error', e => {
    console.error(`[Proxy Error] (attempt ${attempt}):`, e.message);
    if (attempt < 4) {
      return forwardRequest(clientReq, bodyBuffer, clientRes, attempt + 1);
    }
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'content-type': 'application/json' });
      clientRes.end(JSON.stringify({ error: { message: e.message } }));
    }
  });

  if (bodyBuffer.length > 0) {
    proxyReq.write(bodyBuffer);
  }
  proxyReq.end();
}

const server = http.createServer((clientReq, clientRes) => {
  const chunks = [];
  clientReq.on('data', chunk => chunks.push(chunk));
  clientReq.on('end', () => {
    let body = Buffer.concat(chunks);

    if (clientReq.headers['content-type']?.includes('application/json') && body.length > 0) {
      try {
        const json = JSON.parse(body.toString('utf8'));
        let modified = false;

        // 1. OpenAI limits tools array to max 128. Cap to 80 prioritizing core & active tools.
        if (Array.isArray(json.tools) && json.tools.length > 80) {
          console.log(`[Proxy] Trimming tools from ${json.tools.length} to 80 (OpenAI 128 max limit)`);
          json.tools = prioritizeTools(json.tools, json.messages, 80);
          modified = true;
        }

        // 2. Inject adaptive thinking so AgentRouter routes to /v1/responses
        if (json.tools && json.tools.length > 0 && !json.thinking) {
          json.thinking = { type: 'adaptive' };
          modified = true;
        }

        if (modified) {
          body = Buffer.from(JSON.stringify(json), 'utf8');
        }
      } catch (e) {}
    }

    forwardRequest(clientReq, body, clientRes, 1);
  });

  clientReq.on('error', err => {
    console.error('[Client Error]:', err.message);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[AgentRouter Proxy] Listening on http://127.0.0.1:${PORT} -> https://${TARGET_HOST}`);
});
