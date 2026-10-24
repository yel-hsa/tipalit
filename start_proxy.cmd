@echo off
title AgentRouter Stream Proxy (Port 3080)
echo Starting AgentRouter stream proxy on http://127.0.0.1:3080 ...
node "%~dp0agentrouter_proxy.cjs"
pause
