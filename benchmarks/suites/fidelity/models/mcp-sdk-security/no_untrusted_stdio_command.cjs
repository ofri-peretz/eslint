const { tag } = require('../../lib.cjs');
const { SDK, indent } = require('../../mcp-sdk.cjs');

const TRANSPORTS = {
  V1: `import { StdioClientTransport } from '${SDK}/client/stdio.js';`,
  V1Require: `const { StdioClientTransport } = require('${SDK}/client/stdio.js');`,
  ClientV2:
    "import { StdioClientTransport } from '@modelcontextprotocol/client';",
  NodeV2: "import { StdioClientTransport } from '@modelcontextprotocol/node';",
  LocalClass: `import { Client } from '${SDK}/client/index.js';\nclass StdioClientTransport {\n  constructor(readonly options: object) {}\n}`,
  NoMcp: "import { StdioClientTransport } from './stdio';",
};

/**
 * Source tag -> { pre, inTool?, entry }: statements that obtain `entry`, an
 * object with `command`, `args` and `pkg` fields (or a tool's arguments).
 */
const SOURCES = {
  ToolArg: { tool: 'z.string()' },
  EnumArg: { tool: "z.enum(['git', 'time'])" },
  FetchJson: { pre: 'const entry = await (await fetch(REGISTRY_URL)).json();' },
  AxiosData: { pre: 'const { data: entry } = await axios.get(REGISTRY_URL);' },
  ProjectJson: {
    pre: "const config = JSON.parse(readFileSync('.mcp.json', 'utf8'));",
    loop: 'for (const [name, entry] of Object.entries<any>(config.mcpServers)) {',
  },
  CwdJoinJson: {
    pre: "const config = JSON.parse(await readFile(path.join(process.cwd(), '.cursor', 'mcp.json'), 'utf8'));",
    loop: 'for (const entry of Object.values<any>(config.mcpServers)) {',
  },
  HomeJson: {
    pre: "const config = JSON.parse(readFileSync(path.join(os.homedir(), '.config', 'mcp', 'servers.json'), 'utf8'));",
    loop: 'for (const entry of Object.values<any>(config.mcpServers)) {',
  },
  AbsoluteJson: {
    pre: "const config = JSON.parse(readFileSync('/etc/mcp/servers.json', 'utf8'));",
    loop: 'for (const entry of Object.values<any>(config.mcpServers)) {',
  },
  AllowlistLookup: { tool: 'z.string()', lookup: true },
  Literal: {
    pre: "const entry = { command: 'uvx', args: ['mcp-server-time'], pkg: 'mcp-server-time', dir: 'docs' };",
  },
};

/** Position tag -> (field) => options text; `field(k)` reads key k of the untrusted entry. */
const POSITIONS = {
  Command: (f) => `{ command: ${f('command')}, args: ['--stdio'] }`,
  ShellScript: (f) => `{ command: 'sh', args: ['-c', ${f('command')}] }`,
  RunnerPackage: (f) => `{ command: 'npx', args: ['-y', ${f('pkg')}] }`,
  FixedServerArg: (f) =>
    `{ command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', ${f('dir')}] }`,
  NonShellArg: (f) => `{ command: 'node', args: ['server.js', ${f('dir')}] }`,
  EnvVar: (f) =>
    `{ command: 'node', args: ['server.js'], env: { MCP_PROFILE: ${f('dir')} } }`,
  Cwd: (f) => `{ command: 'node', args: ['server.js'], cwd: ${f('dir')} }`,
  WholeOptions: (f, whole) => whole,
  Spread: (f, whole) => `{ ...${whole}, stderr: 'inherit' }`,
  SpreadOverridden: (f, whole) =>
    `{ ...${whole}, command: 'node', args: ['server.js'] }`,
};

const HEAD = [
  `import { Client } from '${SDK}/client/index.js';`,
  "import { readFileSync } from 'node:fs';",
  "import { readFile } from 'node:fs/promises';",
  "import path from 'node:path';",
  "import os from 'node:os';",
  "import axios from 'axios';",
  "import { z } from 'zod';",
  "const REGISTRY_URL = 'https://registry.example.com/servers/latest';",
  "const ALLOWED: Record<string, { command: string; args: string[]; pkg: string; dir: string }> = {\n  git: { command: 'uvx', args: ['mcp-server-git'], pkg: 'mcp-server-git', dir: 'repo' },\n};",
  "const client = new Client({ name: 'hub', version: '1.0.0' });",
].join('\n');

module.exports = {
  rule: 'no-untrusted-stdio-command',
  // Positions: 10 sources x 10 positions = 100. Wiring: 3 sources x 6 transports = 18.
  domain: 118,
  traces: 1400,
  key: (s) => [s.part, s.src, s.position, s.transport].map(tag).join('|'),
  code: (s) => {
    const src = SOURCES[tag(s.src)];
    const position = POSITIONS[tag(s.position)];
    const head = `${TRANSPORTS[tag(s.transport)]}\n${HEAD}`;
    if (src.tool) {
      // A hub tool: the entry is the tool's arguments, or a lookup by one.
      const toolHead = `import { McpServer } from '${SDK}/server/mcp.js';\nconst server = new McpServer({ name: 'hub', version: '1.0.0' });`;
      const pre = src.lookup
        ? "const entry = ALLOWED[args.command];\nif (!entry) throw new Error('unknown server');"
        : '';
      const entry = src.lookup ? 'entry' : 'args';
      const opts = position((k) => `${entry}.${k}`, entry);
      const body = [
        pre,
        `await client.connect(new StdioClientTransport(${opts}));`,
        'return { content: [] };',
      ]
        .filter(Boolean)
        .join('\n');
      return `${head}\n${toolHead}\nserver.registerTool('launch', { inputSchema: { command: ${src.tool}, pkg: ${src.tool}, dir: ${src.tool} } }, async (args) => {\n${indent(body, 2)}\n});\n`;
    }
    const opts = position((k) => `entry.${k}`, 'entry');
    const launch = `await client.connect(new StdioClientTransport(${opts}));`;
    const body = src.loop ? `${src.loop}\n${indent(launch, 2)}\n}` : launch;
    return `${head}\nexport async function start() {\n${indent(`${src.pre}\n${body}`, 2)}\n}\n`;
  },
};
