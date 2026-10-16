#!/usr/bin/env node
// Minimal newline-delimited JSON-RPC MCP server for proxy tests.
// tools/call → big log (or a big "file" for read_file); exits with
// FAKE_MCP_EXIT when stdin closes.
let buf = '';
const big = (tag) => Array.from({ length: 3000 }, (_, i) => i === 1500 ? 'ERROR: ' + tag + ' exploded' : 'line ' + i).join('\n');
process.stdin.on('data', (c) => {
  buf += c;
  let i;
  while ((i = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    const m = JSON.parse(line);
    if (m.id == null) continue;
    let result;
    if (m.method === 'initialize') result = { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'fake', version: '1' } };
    else if (m.method === 'tools/list') result = { tools: ['run_logs', 'read_file'].map(name => ({ name, description: 'fake ' + name, inputSchema: { type: 'object', properties: {} } })), filler: big('list') };
    else if (m.method === 'tools/call') result = { content: [{ type: 'text', text: big(m.params.name) }], isError: m.params.name === 'run_logs_fail' };
    else result = {};
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: m.id, result }) + '\n');
  }
});
process.stdin.on('end', () => process.exit(Number(process.env.FAKE_MCP_EXIT || 0)));
