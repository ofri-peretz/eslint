// Renders one state of models/mcp-sdk-security.no-path-traversal-in-tool.qnt.
// Spells the shape only; the verdict is the model's `expected`.
import { bind } from './_mcp.mjs';

export const plugin = 'mcp-sdk-security';
export const rule = 'no-path-traversal-in-tool';
export const dimensions = ['source', 'transform', 'guard', 'sink', 'binding'];

const TRANSFORM = {
  NoTransform: (e) => e,
  JoinRoot: (e) => `path.join(ROOT, ${e})`,
  ResolveRoot: (e) => `path.resolve(ROOT, ${e})`,
  Basename: (e) => `path.join(ROOT, path.basename(${e}))`,
};

const SINK = {
  ReadFileNamed: [
    "import { readFile } from 'node:fs/promises';",
    (v) => `await readFile(${v}, 'utf8');`,
  ],
  ReadFileSyncDefault: [
    "import fs from 'node:fs';",
    (v) => `fs.readFileSync(${v}, 'utf8');`,
  ],
  PromisesNamespace: [
    "import * as fsp from 'fs/promises';",
    (v) => `await fsp.rm(${v}, { recursive: true });`,
  ],
  RequireWrite: ['', (v) => `require('node:fs').writeFileSync(${v}, 'x');`],
  FsExtra: [
    "import fse from 'fs-extra';",
    (v) => `await fse.readFile(${v}, 'utf8');`,
  ],
  StoreLookalike: [
    'declare const store: { readFile(key: string): Promise<string> };',
    (v) => `await store.readFile(${v});`,
  ],
};

/** The statements that check `v` and then call the sink on what was checked. */
const GUARD = {
  NoGuard: (sink) => (v) => sink(v),
  StartsWithExit: (sink) => (v) =>
    `const t = path.resolve(ROOT, ${v});\n  if (!t.startsWith(ROOT + path.sep)) throw new Error('outside');\n  ${sink('t')}`,
  RelativeExit: (sink) => (v) =>
    `const t = path.resolve(ROOT, ${v});\n  const rel = path.relative(ROOT, t);\n  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('outside');\n  ${sink('t')}`,
  EndsWithLookalike: (sink) => (v) =>
    `if (!String(${v}).endsWith('.md')) throw new Error('markdown only');\n  ${sink(v)}`,
  ExistsLookalike: (sink) => (v) =>
    `if (!existsSync(${v})) throw new Error('missing');\n  ${sink(v)}`,
  NonExiting: (sink) => (v) =>
    `const t = path.resolve(ROOT, ${v});\n  if (!t.startsWith(ROOT + path.sep)) console.warn('outside');\n  ${sink('t')}`,
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  const [imp, sink] = SINK[c.sink];
  const raw = { ToolArg: 'p', TemplateVar: 'String(name)', ServerConst: 'DOC' }[
    c.source
  ];
  const { top, body } = bind(
    c.binding,
    TRANSFORM[c.transform](raw),
    GUARD[c.guard](sink),
  );
  const handler =
    c.source === 'TemplateVar'
      ? "server.registerResource('doc', new ResourceTemplate('doc:///{name}', { list: undefined }), {}, async (uri, { name }) => {"
      : "server.registerTool('read', { inputSchema: { p: z.string() } }, async ({ p }) => {";
  return [
    "import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';",
    "import { z } from 'zod';",
    "import path from 'node:path';",
    "import { existsSync } from 'node:fs';",
    imp,
    "const ROOT = '/srv/data';",
    "const DOC = 'README.md';",
    "const server = new McpServer({ name: 'x', version: '1.0.0' });",
    top,
    handler,
    body,
    '  return { contents: [], content: [] };',
    '});',
    '',
  ]
    .filter(Boolean)
    .join('\n');
}
