const { tag } = require('../../lib.cjs');
const { GATES, indent } = require('../../mcp-sdk.cjs');

/**
 * Source tag -> { imports, pre, text, around(reg) }: `text` is the
 * expression holding the source's text, available after `pre` and inside
 * `around`.
 */
const SOURCES = {
  Literal: { text: "'Search the project docs'" },
  ToolArg: {
    text: 'title',
    around: (reg) =>
      `server.registerTool('add_note', { description: 'Add a note', inputSchema: { title: z.string() } }, async ({ title }) => {\n${indent(reg, 2)}\n  return { content: [] };\n});`,
  },
  FetchJson: {
    pre: 'const manifest = await (await fetch(MANIFEST_URL)).json();',
    text: 'manifest.description',
  },
  AxiosData: {
    imports: "import axios from 'axios';",
    pre: 'const { data: plugin } = await axios.get(MANIFEST_URL);',
    text: 'plugin.summary',
  },
  ReadFileCwd: {
    imports: "import { readFile } from 'node:fs/promises';",
    pre: "const blurb = await readFile('./desc.md', 'utf8');",
    text: 'blurb',
  },
  ParsedJsonFile: {
    imports: "import { readFileSync } from 'node:fs';",
    pre: "const tools = JSON.parse(readFileSync('tools.json', 'utf8'));",
    text: 'tools.search.description',
  },
  ExpressBody: {
    imports: "import express from 'express';",
    pre: 'const app = express();',
    text: 'req.body.description',
    around: (reg) =>
      `app.post('/tools', (req, res) => {\n${indent(reg, 2)}\n  res.sendStatus(201);\n});`,
  },
  HonoBody: {
    imports: "import { Hono } from 'hono';",
    pre: 'const app = new Hono();',
    text: 'body.description',
    around: (reg) =>
      `app.post('/tools', async (c) => {\n  const body = await c.req.json();\n${indent(reg, 2)}\n  return c.text('ok');\n});`,
  },
  DirnameFile: {
    imports:
      "import { readFileSync } from 'node:fs';\nimport path from 'node:path';",
    pre: "const blurb = readFileSync(path.join(__dirname, 'descriptions', 'search.md'), 'utf8');",
    text: 'blurb',
  },
  ImportMetaFile: {
    imports: "import { readFile } from 'node:fs/promises';",
    pre: "const blurb = await readFile(new URL('./search.md', import.meta.url), 'utf8');",
    text: 'blurb',
  },
  Readdir: {
    imports: "import { readdirSync } from 'node:fs';",
    pre: '',
    text: 'name',
    around: (reg) =>
      `for (const name of readdirSync(DOCS_DIR)) {\n${indent(reg, 2)}\n}`,
  },
  ConfigImport: {
    imports: "import { config } from './config';",
    text: 'config.searchScope',
  },
  OpaqueCall: {
    imports: "import { t } from './i18n';",
    text: "t('tools.search')",
  },
  EnvVar: { text: "process.env.SEARCH_SCOPE ?? 'docs'" },
  Counter: { pre: 'let nextId = 0;\nconst id = ++nextId;', text: 'String(id)' },
};

/** Slot tag -> (text) => registration. */
const SLOTS = {
  ToolDescription: (t) =>
    `server.registerTool('search', { description: ${t}, inputSchema: SHAPE }, handler);`,
  ToolTitle: (t) =>
    `server.registerTool('search', { title: ${t}, description: 'Search', inputSchema: SHAPE }, handler);`,
  LegacyPositional: (t) =>
    `server.tool('search', ${t}, { q: z.string() }, handler);`,
  AnnotationsTitle: (t) =>
    `server.tool('search', 'Search', { q: z.string() }, { title: ${t}, readOnlyHint: true }, handler);`,
  PromptDescription: (t) =>
    `server.registerPrompt('summarize', { description: ${t} }, () => ({ messages: [] }));`,
  ResourceDescription: (t) =>
    "server.registerResource('note', 'notes://latest', { description: " +
    t +
    " }, async (uri: URL) => ({ contents: [{ uri: uri.href, text: 'note' }] }));",
  ConfigByRef: (t) =>
    `const searchConfig = { description: ${t}, inputSchema: SHAPE };\nserver.registerTool('search', searchConfig, handler);`,
};

module.exports = {
  rule: 'no-tool-description-injection',
  // Sources: 15 x 7 slots x 2 wraps = 210.
  // Gates: 3 sources x (7 gates x 3 slots - V2's legacy slot) = 60.
  domain: 270,
  traces: 2800,
  key: (s) => [s.part, s.src, s.slot, s.wrap, s.gate].map(tag).join('|'),
  code: (s) => {
    const G = GATES[tag(s.gate)];
    const src = SOURCES[tag(s.src)];
    const text =
      tag(s.wrap) === 'Whole' ? src.text : `\`Search \${${src.text}}\``;
    const reg = SLOTS[tag(s.slot)](text);
    const placed = src.around ? src.around(reg) : reg;
    const shape = G.v2 ? 'z.object({ q: z.string() })' : '{ q: z.string() }';
    const common = [
      "const MANIFEST_URL = 'https://plugins.example.com/search/manifest.json';",
      "const DOCS_DIR = '/srv/docs';",
      `const SHAPE = ${shape};`,
      'const handler = async () => ({ content: [] });',
    ].join('\n');
    const setup = [src.pre, placed].filter(Boolean).join('\n');
    const serverPart = G.wrap
      ? `export const mcp = createMcpHandler(async (server: any) => {\n${indent(setup, 2)}\n});`
      : `${G.decl}\n${setup}`;
    return (
      [G.head, G.zod, src.imports, common, serverPart]
        .filter(Boolean)
        .join('\n') + '\n'
    );
  },
};
