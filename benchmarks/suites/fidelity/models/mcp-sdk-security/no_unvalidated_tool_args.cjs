const { tag } = require('../../lib.cjs');
const { GATES, indent } = require('../../mcp-sdk.cjs');

const FIELDS = 'path: z.string(), mode: z.string()';

/** Schema tag -> [pre, registration(handler)]; legacy forms use tool(). */
const SCHEMAS = {
  RawShape: [
    '',
    (h) => `server.registerTool('read', { inputSchema: { ${FIELDS} } }, ${h});`,
  ],
  ZObject: [
    '',
    (h) =>
      `server.registerTool('read', { inputSchema: z.object({ ${FIELDS} }) }, ${h});`,
  ],
  ZStrictObject: [
    '',
    (h) =>
      `server.registerTool('read', { inputSchema: z.strictObject({ ${FIELDS} }) }, ${h});`,
  ],
  StrictChain: [
    '',
    (h) =>
      `server.registerTool('read', { inputSchema: z.object({ ${FIELDS} }).strict() }, ${h});`,
  ],
  DescribeChain: [
    '',
    (h) =>
      `server.registerTool('read', { inputSchema: z.object({ ${FIELDS} }).describe('Read a file') }, ${h});`,
  ],
  Partial: [
    '',
    (h) =>
      `server.registerTool('read', { inputSchema: z.object({ ${FIELDS} }).partial() }, ${h});`,
  ],
  Passthrough: [
    '',
    (h) =>
      `server.registerTool('read', { inputSchema: z.object({ ${FIELDS} }).passthrough() }, ${h});`,
  ],
  LooseObject: [
    '',
    (h) =>
      `server.registerTool('read', { inputSchema: z.looseObject({ ${FIELDS} }) }, ${h});`,
  ],
  LegacyShape: [
    '',
    (h) => `server.tool('read', 'Read a file', { ${FIELDS} }, ${h});`,
  ],
  LegacyConstFields: [
    "const PathSchema = z.string();\nconst ModeSchema = z.enum(['r', 'w']);",
    (h) => `server.tool('read', { path: PathSchema, mode: ModeSchema }, ${h});`,
  ],
  EmptyShape: [
    '',
    (h) => `server.registerTool('read', { inputSchema: {} }, ${h});`,
  ],
  SharedRef: [
    "import { ReadSchema } from './schemas';",
    (h) => `server.registerTool('read', { inputSchema: ReadSchema }, ${h});`,
  ],
  FactoryCall: [
    "import { buildSchema } from './schemas';",
    (h) =>
      `server.registerTool('read', { inputSchema: buildSchema('read') }, ${h});`,
  ],
  ShapeVar: [
    "import { readShape } from './schemas';",
    (h) =>
      `server.registerTool('read', { inputSchema: z.object(readShape) }, ${h});`,
  ],
  Extend: [
    "import { Base } from './schemas';",
    (h) =>
      `server.registerTool('read', { inputSchema: Base.extend({ path: z.string() }) }, ${h});`,
  ],
  SpreadShape: [
    "import { common } from './schemas';",
    (h) =>
      `server.registerTool('read', { inputSchema: { ...common, path: z.string() } }, ${h});`,
  ],
  NoSchema: [
    '',
    (h) => `server.registerTool('read', { description: 'Read a file' }, ${h});`,
  ],
};

const ok = "({ content: [{ type: 'text', text: 'ok' }] })";
/** Read tag -> [pre, handler expression]. */
const READS = {
  Declared: [
    '',
    `async ({ path, mode }: any) => (readFile(path, mode), ${ok})`,
  ],
  Undeclared: [
    '',
    `async ({ path, encoding }: any) => (readFile(path, encoding), ${ok})`,
  ],
  RenamedUndeclared: [
    '',
    `async ({ encoding: enc }: any) => (readFile('/tmp/x', enc), ${ok})`,
  ],
  RenamedDeclared: ['', `async ({ path: p }: any) => (readFile(p), ${ok})`],
  DefaultUndeclared: [
    '',
    `async ({ path, encoding = 'utf8' }: any) => (readFile(path, encoding), ${ok})`,
  ],
  Subset: ['', `async ({ path }: any) => (readFile(path), ${ok})`],
  WholeArgs: [
    '',
    `async (args: any) => (readFile(args.path, args.encoding), ${ok})`,
  ],
  Rest: ['', `async ({ path, ...rest }: any) => (readFile(path, rest), ${ok})`],
  NamedUndeclared: [
    `async function readHandler({ path, encoding }: any) {\n  readFile(path, encoding);\n  return ${ok};\n}`,
    'readHandler',
  ],
  NamedDeclared: [
    `async function readHandler({ path, mode }: any) {\n  readFile(path, mode);\n  return ${ok};\n}`,
    'readHandler',
  ],
};

module.exports = {
  rule: 'no-unvalidated-tool-args',
  // Schemas: 17 x 10 reads = 170. Wiring: 6 gates x 2 reads = 12.
  domain: 182,
  traces: 2000,
  key: (s) => [s.part, s.gate, s.schema, s.read].map(tag).join('|'),
  code: (s) => {
    const G = GATES[tag(s.gate)];
    const [sPre, reg] = SCHEMAS[tag(s.schema)];
    const [rPre, h] = READS[tag(s.read)];
    const imports = sPre.startsWith('import') ? sPre : '';
    const local = [sPre.startsWith('import') ? '' : sPre, rPre, reg(h)]
      .filter(Boolean)
      .join('\n');
    const serverPart = G.wrap
      ? `export const handler = createMcpHandler((server: any) => {\n${indent(local, 2)}\n});`
      : `${G.decl}\n${local}`;
    return (
      [
        G.head,
        G.zod,
        "import { readFile } from './files';",
        imports,
        serverPart,
      ]
        .filter(Boolean)
        .join('\n') + '\n'
    );
  },
};
