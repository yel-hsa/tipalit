#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const progressFile = path.join(rootDir, 'PROGRESS.md');

function runGit(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export function syncProgress() {
  if (!fs.existsSync(progressFile)) {
    console.warn(`[sync-progress] ${progressFile} not found.`);
    return;
  }

  const branch = runGit('rev-parse --abbrev-ref HEAD') || 'master';
  const commitHash = runGit('rev-parse --short HEAD') || 'unknown';
  const commitMsg = runGit('log -1 --pretty=format:%s') || 'No commits';
  
  // Recent 5 commits
  const recentLog = runGit('log -n 5 --pretty=format:"- **%h** *(%cd)*: %s" --date=format:"%Y-%m-%d %H:%M"') || '';
  
  // Check working tree status (ignoring PROGRESS.md)
  const statusOutput = runGit('status --porcelain') || '';
  const nonProgressChanges = statusOutput
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.endsWith('PROGRESS.md'));
  const treeStatus = nonProgressChanges.length === 0 ? 'Clean' : `Modified (${nonProgressChanges.length} files changed)`;

  let content = fs.readFileSync(progressFile, 'utf8').replace(/\r\n/g, '\n');

  // Replace or inject Primary Branch line
  const branchLineRegex = /- \*\*Primary Branch \([^)]+\)\:\*\* At commit .*/;
  const newBranchLine = `- **Primary Branch (\`${branch}\`):** At commit \`${commitHash}\` (*"${commitMsg.replace(/"/g, '\\"')}"*).`;

  if (branchLineRegex.test(content)) {
    content = content.replace(branchLineRegex, newBranchLine);
  }

  // Replace Working Tree line if present
  const treeLineRegex = /- \*\*Working Tree:\*\* .*/;
  if (treeLineRegex.test(content)) {
    content = content.replace(treeLineRegex, `- **Working Tree:** ${treeStatus}.`);
  }

  // Add / update Last Auto-Sync timestamp
  const now = new Date();
  const timestampStr = now.toISOString().replace('T', ' ').substring(0, 19);
  const syncLineRegex = /- \*\*Last Auto-Sync:\*\* .*/;
  if (syncLineRegex.test(content)) {
    content = content.replace(syncLineRegex, `- **Last Auto-Sync:** ${timestampStr}`);
  } else {
    content = content.replace(newBranchLine, `${newBranchLine}\n- **Last Auto-Sync:** ${timestampStr}`);
  }

  // Format recent commits block
  const formattedRecent = `### Recent Commits (Auto-Synced)\n${recentLog}\n`;
  const recentBlockRegex = /### Recent Commits \(Auto-Synced\)[\s\S]*?(?=\n---|\n## |$)/;

  if (recentBlockRegex.test(content)) {
    content = content.replace(recentBlockRegex, formattedRecent);
  } else {
    // Insert before Section 3
    const sec3Marker = '## 3. Completed Streams Archive';
    const sec3Pos = content.indexOf(sec3Marker);
    if (sec3Pos !== -1) {
      const beforeSec3 = content.slice(0, sec3Pos).trimEnd();
      const afterSec3 = content.slice(sec3Pos);
      content = `${beforeSec3}\n\n${formattedRecent}\n---\n\n${afterSec3}`;
    }
  }

  fs.writeFileSync(progressFile, content, 'utf8');
  console.log(`[sync-progress] Synced PROGRESS.md with commit ${commitHash} on ${branch} (${treeStatus}).`);
}

syncProgress();
