/**
 * Tests for mcp-sdk-security/no-tool-description-injection
 * CWE-1427 — tool descriptions reach the model as instructions.
 *
 * The `valid` half is what makes this rule usable. Almost every MCP server
 * registers tools with descriptions, so anything short of "static text is
 * silent" would fire on nearly every correct file in the ecosystem.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import {
  noToolDescriptionInjection,
  isStaticText,
  modelFacingProperties,
} from './index';
import type { TSESTree } from '@typescript-eslint/utils';
import { join } from 'node:path';

/**
 * A file inside the cross-file fixture directory. Imports in these cases
 * resolve against it and are read from disk; the file itself need not exist.
 */
const SERVER = join(
  __dirname,
  '..',
  '..',
  '..',
  'fixtures',
  'cross-file',
  'server.ts',
);

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

/** Opens the SDK gate; see MCP_MODULE_PREFIX. */
const SDK =
  "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n";

describe('no-tool-description-injection', () => {
  describe('Valid — text the developer wrote', () => {
    ruleTester.run('valid', noToolDescriptionInjection, {
      valid: [
        {
          // @found mcp-sdk-security missing-detections pass 2026-10-11, rule crash on Object.prototype keys
          name: 'FP: a method named after an Object.prototype member does not crash the rule',
          code:
            "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
            'const id = `${Date.now().toString(36)}`; obj.hasOwnProperty("x"); obj.constructor();',
        },
        {
          name: 'a string literal',
          code:
            SDK +
            "server.registerTool('search', { description: 'Search the docs' }, handler);",
        },
        {
          name: 'a template with no interpolations',
          code:
            SDK +
            'server.registerTool("search", { description: `Search the docs` }, handler);',
        },
        {
          name: 'literals concatenated across lines',
          code:
            SDK +
            "server.registerTool('search', { description: 'Search the docs ' + 'for a term' }, handler);",
        },
        {
          name: 'a static title alongside a static description',
          code:
            SDK +
            "server.registerTool('search', { title: 'Search', description: 'Search the docs' }, handler);",
        },
        {
          name: 'no description at all',
          code:
            SDK +
            "server.registerTool('search', { inputSchema: {} }, handler);",
        },
        {
          // A config by reference could hold anything; reporting it would be
          // guessing, and the schema rule takes the same position.
          name: 'a config passed by reference',
          code: SDK + "server.registerTool('search', config, handler);",
        },
        {
          name: 'a file that never imports the MCP SDK',
          code: "server.registerTool('search', { description: `Search ${x}` }, handler);",
        },
        {
          name: 'a non-registration method',
          code: SDK + "logger.info('search', { description: `Search ${x}` });",
        },
        {
          // `server[method](...)` — the method name is not statically known,
          // so this cannot be shown to be a tool registration.
          name: 'a computed callee',
          code:
            SDK +
            'server[method]("search", { description: `Search ${x}` }, handler);',
        },
        {
          // A private method is the one non-computed property that is not an
          // Identifier, so it is the only way to reach that guard.
          name: 'a private method is not a registration',
          code:
            SDK +
            'class S { #registerTool() {} m() { this.#registerTool("s", { description: `S ${x}` }); } }',
        },
        {
          name: 'a bare function call is not a registration',
          code:
            SDK +
            'registerTool("search", { description: `Search ${x}` }, handler);',
        },
        {
          name: 'an unrelated import does not open the gate on its own',
          code: "import { z } from 'zod';\nserver.registerTool('s', { description: `S ${x}` }, h);",
        },
        {
          name: 'a computed key is not statically a description',
          code:
            SDK +
            "server.registerTool('search', { [key]: `Search ${x}` }, handler);",
        },
        // ---- FP fixes, 2026-10. Each is text the developer wrote, just not
        // inline at the call.
        {
          name: 'a const initialised from a literal',
          code:
            SDK +
            "const DESC = 'Search the docs';\nserver.registerTool('search', { description: DESC }, handler);",
        },
        {
          name: 'a const chain and an `as const` literal',
          code:
            SDK +
            "const BASE = 'Search' as const;\nconst DESC = BASE + ' the docs';\nserver.registerTool('search', { title: BASE, description: DESC }, handler);",
        },
        {
          name: 'a property of a const object of literals',
          code:
            SDK +
            "const TOOLS = { search: { description: 'Search the docs' } } as const;\n" +
            "server.registerTool('search', { description: TOOLS.search.description }, handler);",
        },
        {
          name: 'a quoted and a subscripted property of a const object',
          code:
            SDK +
            "const D = { 'search-tool': 'Search the docs' } satisfies Record<string, string>;\n" +
            "server.registerTool('search', { description: D['search-tool'] }, handler);",
        },
        {
          name: 'lines joined from an array of literals',
          code:
            SDK +
            "server.registerTool('query', { description: ['Run a read-only query.', 'SELECT only.'].join('\\n') }, handler);",
        },
        {
          name: 'an array of literals joined with the default separator',
          code:
            SDK +
            "server.registerTool('query', { description: ['a', `b`].join() }, handler);",
        },
        {
          name: 'a tagged template with nothing interpolated (dedent)',
          code:
            SDK +
            "server.registerTool('explain', { description: dedent`\n  Explain a query plan.\n` }, handler);",
        },
        {
          name: 'legacy tool(name, shape, cb) whose PARAMETERS are named title and description',
          code:
            SDK +
            "server.tool('create_issue', { title: z.string().max(200), description: z.string().optional() }, async ({ title, description }) => ({ content: [] }));",
        },
        {
          name: 'legacy tool(name, description, shape, cb) with a static description',
          code:
            SDK +
            "server.tool('search', 'Search the docs', { title: z.string() }, async ({ title }) => ({ content: [] }));",
        },
        {
          name: 'legacy tool(name, description, cb) with a const description',
          code:
            SDK +
            "const DESC = 'Search';\nserver.tool('search', DESC, { q: z.string() }, async ({ q }) => q);",
        },
        {
          name: 'a const object key written after a spread wins over it',
          code:
            SDK +
            "const TOOLS = { ...base, [k]: 'x', search: 'Search the docs' };\n" +
            "server.registerTool('search', { description: TOOLS.search }, handler);",
        },
        {
          name: 'a property of an object literal written in place',
          code:
            SDK +
            "server.registerTool('search', { description: ({ d: 'Search' }).d }, handler);",
        },
        {
          // Moved from invalid ('an imported value is decided in another
          // file'): the import does not resolve, so its text is unknown, and
          // the rule reports only a value it can show is dynamic.
          // @found mcp-sdk-security FP/FN audit 2026-10-10, residual 1 (imported description)
          name: 'FP: an import that does not resolve is not reported',
          filename: SERVER,
          code:
            SDK +
            "import { DESC } from './no-such-module';\nimport { PKG } from 'some-package';\n" +
            "server.registerTool('search', { title: PKG, description: DESC }, handler);",
        },
        {
          // @found mcp-sdk-security FP/FN audit 2026-10-10, residual 1 (imported description)
          name: 'FP: static descriptions imported from another file',
          filename: SERVER,
          code:
            SDK +
            "import { SEARCH, LIST, RENAMED, REEXPORTED, TOOLS } from './descriptions';\n" +
            "import DEFAULT_DESCRIPTION from './descriptions';\n" +
            "import * as D from './descriptions.js';\n" +
            "import { BRAND } from './barrel';\nimport { IN_DIR } from './dir';\n" +
            "server.registerTool('a', { title: SEARCH, description: LIST }, handler);\n" +
            "server.registerTool('b', { title: RENAMED, description: REEXPORTED }, handler);\n" +
            "server.registerTool('c', { title: TOOLS.search.description, description: DEFAULT_DESCRIPTION }, handler);\n" +
            "server.registerTool('d', { title: D.SEARCH, description: `${BRAND}: ${IN_DIR}` }, handler);\n" +
            "import { 'quoted-name' as QUOTED } from './descriptions';\n" +
            "server.registerTool('e', { title: QUOTED, description: QUOTED }, handler);",
        },
        {
          // @found mcp-sdk-security FP/FN audit 2026-10-10, residual 1 (imported description)
          name: 'FP: an imported value that cannot be read stays unknown, not dynamic',
          filename: SERVER,
          code:
            SDK +
            "import { FROM_PACKAGE, MISSING_TOO, NOPE } from './descriptions';\nimport { LOOP } from './cycle-a';\n" +
            "import { NOT_HERE } from './barrel';\nimport * as D from './descriptions';\n" +
            "server.registerTool('a', { title: FROM_PACKAGE, description: MISSING_TOO }, handler);\n" +
            "server.registerTool('b', { title: NOPE, description: LOOP }, handler);\n" +
            "server.registerTool('c', { title: NOT_HERE, description: D.NOPE }, handler);\n" +
            "import { GHOST } from './barrel';\nimport { PKG } from 'some-package';\nimport E = require('./descriptions');\n" +
            "server.registerTool('e', { title: GHOST, description: `Search ${PKG}` }, handler);\n" +
            "server.registerTool('f', { title: E.SEARCH, description: [PKG].join() }, handler);",
        },
        {
          // @found mcp-sdk-security FP/FN audit 2026-10-10, residual 1 (imported description)
          name: 'FP: a static const interpolated into a template is static text',
          code:
            SDK +
            "const PRODUCT = 'Acme';\nserver.registerTool('search', { description: `Search ${PRODUCT} docs`, title: dedent`${PRODUCT}` }, handler);",
        },
        {
          // Moved from invalid. The resolver is bounded and abstains when it
          // cannot reach a value (`unknown`), and reports only text it can
          // show is dynamic. A const cycle is a TDZ ReferenceError, not text.
          // @found mcp-sdk-security FP/FN audit 2026-10-10, residual 1 (imported description)
          name: 'FP: a const cycle resolves to nothing, so it is not reported',
          code:
            SDK +
            "const A = B;\nconst B = A;\nserver.registerTool('q', { description: A }, handler);",
        },
        {
          name: 'a static prompt description',
          code:
            SDK +
            "server.registerPrompt('summarize', { description: 'Summarize text' }, cb);",
        },
        {
          name: 'a static resource description',
          code:
            SDK +
            "server.registerResource('notes', 'notes://all', { description: 'All notes' }, cb);",
        },
        {
          name: 'a prompt config passed by reference',
          code: SDK + "server.registerPrompt('summarize', config, cb);",
        },
      ],
      invalid: [],
    });
  });

  /**
   * Text assembled at runtime from SERVER-LOCAL values. Every case here was
   * invalid until the 2026-10-11 real-code scan (modelcontextprotocol/servers,
   * typescript-sdk, mcp-handler, mcp-server-cloudflare): four of its findings
   * were descriptions built from a directory's filenames, a counter id, and a
   * helper's parameter — none of them controlled by a client. "Dynamic" is not
   * the defect; text a client, a remote party or a file's contents controls
   * is. These stay silent now; the untrusted sources are the invalid block
   * below.
   */
  describe('Valid — server-local text assembled at runtime (was: invalid)', () => {
    ruleTester.run('server-local', noToolDescriptionInjection, {
      invalid: [],
      valid: [
        {
          name: 'an interpolated template',
          code:
            SDK +
            'server.registerTool("search", { description: `Search ${scope}` }, handler);',
        },
        {
          // The advisory shape: text loaded per tenant, appended to the
          // instruction block.
          name: 'a value loaded from elsewhere',
          code:
            SDK +
            "server.registerTool('search', { description: tenantBlurb }, handler);",
        },
        {
          name: 'a call result',
          code:
            SDK +
            "server.registerTool('search', { description: buildDescription() }, handler);",
        },
        {
          name: 'a member access',
          code:
            SDK +
            "server.registerTool('search', { description: config.blurb }, handler);",
        },
        {
          name: 'concatenation with a non-literal',
          code:
            SDK +
            "server.registerTool('search', { description: 'Search ' + scope }, handler);",
        },
        {
          name: 'a dynamic title is the same defect',
          code:
            SDK +
            'server.registerTool("search", { title: `Search ${scope}` }, handler);',
        },
        {
          name: 'the legacy tool() arity',
          code:
            SDK +
            'server.tool("search", { description: `Search ${scope}` }, handler);',
        },
        // ---- FN fixes and the limits of the FP fixes, 2026-10.
        {
          name: 'the legacy positional description, interpolated',
          code:
            SDK +
            'server.tool("search", `Search ${await loadBlurb()}`, { q: z.string() }, async ({ q }) => q);',
        },
        {
          name: 'the legacy positional description with no schema',
          code:
            SDK +
            'server.tool("search", "Search " + blurb, async () => ({ content: [] }));',
        },
        {
          name: 'a legacy positional description held in a value this file does not fix',
          code:
            SDK +
            'server.tool("search", blurb, { q: z.string() }, async ({ q }) => q);',
        },
        {
          name: 'a let binding can be reassigned',
          code:
            SDK +
            "let DESC = 'Search';\nserver.registerTool('search', { description: DESC }, handler);",
        },
        {
          name: 'a const initialised from a call',
          code:
            SDK +
            "const DESC = loadBlurb();\nserver.registerTool('search', { description: DESC }, handler);",
        },
        {
          name: 'a destructured const',
          code:
            SDK +
            "const { DESC } = config;\nserver.registerTool('search', { description: DESC }, handler);",
        },
        {
          name: 'a const object property that is not a literal',
          code:
            SDK +
            "const TOOLS = { search: blurb, ...more };\nserver.registerTool('search', { description: TOOLS.search }, handler);",
        },
        {
          name: 'a const object property that does not exist, or a computed one',
          code:
            SDK +
            "const TOOLS = { search: 'S' };\nserver.registerTool('search', { title: TOOLS.other, description: TOOLS[k] }, handler);",
        },
        {
          name: 'a property of a const that is not an object literal',
          code:
            SDK +
            "const TOOLS = load();\nserver.registerTool('search', { description: TOOLS.search }, handler);",
        },
        {
          name: 'a joined array with a dynamic element',
          code:
            SDK +
            "server.registerTool('q', { description: ['Query', blurb].join('\\n') }, handler);",
        },
        {
          name: 'a joined array with a spread or a dynamic separator',
          code:
            SDK +
            "server.registerTool('q', { title: [...lines].join(), description: ['a'].join(sep) }, handler);",
        },
        {
          name: 'a join on something that is not an array literal',
          code:
            SDK +
            "server.registerTool('q', { description: lines.join('\\n') }, handler);",
        },
        {
          name: 'a tagged template that interpolates',
          code:
            SDK +
            "server.registerTool('q', { description: dedent`Search ${blurb}` }, handler);",
        },
        {
          name: 'a const object key a later spread may override',
          code:
            SDK +
            "const TOOLS = { search: 'S', ...overrides };\nserver.registerTool('search', { description: TOOLS.search }, handler);",
        },
        {
          name: 'a nested const path that does not exist',
          code:
            SDK +
            "const TOOLS = { search: { d: 'S' } };\nserver.registerTool('search', { description: TOOLS.missing.d }, handler);",
        },
        {
          name: 'a property of a call result',
          code:
            SDK +
            "server.registerTool('search', { description: load().search }, handler);",
        },
        {
          name: 'an awaited value',
          code:
            SDK +
            "server.registerTool('search', { description: await loadBlurb() }, handler);",
        },
        {
          name: 'an array method other than join, and a join with extra arguments',
          code:
            SDK +
            "server.registerTool('search', { title: ['a'].map(f), description: ['a'].join('', extra) }, handler);",
        },
        {
          name: 'an ambient declaration has no initializer to read',
          code:
            SDK +
            "declare const DESC: string;\nserver.registerTool('search', { description: DESC }, handler);",
        },
        {
          // (was: FN, residual 1) every value here is server-local.
          name: 'server-local descriptions imported from another file',
          filename: SERVER,
          code:
            SDK +
            "import { DYNAMIC, MUTABLE, TOOLS } from './descriptions';\nimport blurb, { ALIAS } from './dynamic-default';\n" +
            "import * as D from './descriptions';\n" +
            "server.registerTool('a', { title: DYNAMIC, description: MUTABLE }, handler);\n" +
            "server.registerTool('b', { title: TOOLS.dyn, description: blurb }, handler);\n" +
            "server.registerTool('c', { title: ALIAS, description: D.describeTool }, handler);\n" +
            "import describeDefault from './default-fn';\nimport { nsBrand } from './barrel';\n" +
            "server.registerTool('d', { title: describeDefault, description: nsBrand }, handler);",
        },
        {
          // (was: FN, residual 1) a namespace object is not client text.
          name: 'a namespace import used as text',
          filename: SERVER,
          code:
            SDK +
            "import * as D from './descriptions';\nserver.registerTool('a', { description: D }, handler);",
        },
        {
          name: 'a dynamic prompt description',
          code:
            SDK +
            "server.registerPrompt('summarize', { description: `Summarize. ${blurb}` }, cb);",
        },
        {
          name: 'a dynamic resource description (config is the third argument)',
          code:
            SDK +
            "server.registerResource('notes', template, { description: blurb }, cb);",
        },
        {
          // Regression: the scan returned on its first match, so a tool with
          // both a dynamic title and a dynamic description reported only one.
          // The second stayed hidden until the first was fixed — the developer
          // corrects a line, re-runs, and gets an error nobody mentioned.
          name: 'a dynamic title AND description report separately',
          code:
            SDK +
            'server.registerTool("s", { title: `T ${x}`, description: `D ${y}` }, handler);',
        },
        {
          name: 'a quoted key is still a description',
          code:
            SDK +
            'server.registerTool("search", { "description": `Search ${x}` }, handler);',
        },
        {
          // The tool name is only used for the message; a non-literal name
          // falls back to "unknown" rather than suppressing the finding.
          name: 'a non-literal tool name still reports',
          code:
            SDK +
            'server.registerTool(toolName, { description: `Search ${x}` }, handler);',
        },
        {
          name: 'the SDK import alongside unrelated imports',
          code:
            "import { z } from 'zod';\n" +
            SDK +
            'server.registerTool("search", { description: `Search ${x}` }, handler);',
        },
        {
          name: 'require() opens the same gate',
          code:
            "const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');\n" +
            'server.registerTool("search", { description: `Search ${x}` }, handler);',
        },
        {
          // Registrations are judged at Program:exit, so an import below them
          // still opens the gate.
          name: 'the import appearing after the registration',
          code:
            'server.registerTool("search", { description: `Search ${x}` }, handler);\n' +
            SDK,
        },
      ],
    });
  });
  /**
   * The defect: model-facing text derived from data a client, a remote party
   * or a file's contents controls. Written test-first against the rule as it
   * was after the missing-detections pass: every FP case below was reported,
   * and every untrusted-source case not already caught was missed.
   */
  describe('Untrusted sources (2026-10-11 real-code scan)', () => {
    const tool = (name: string, key: string, source: string) => ({
      messageId: 'dynamicDescription' as const,
      data: { tool: name, key, source },
    });
    const meta = (kind: string, name: string, key: string, source: string) => ({
      messageId: 'dynamicMetadata' as const,
      data: { kind, name, key, source },
    });
    ruleTester.run('untrusted', noToolDescriptionInjection, {
      valid: [
        {
          // @found modelcontextprotocol/servers:src/everything/resources/files.ts:49
          name: 'FP: a description built from a server-side directory listing',
          code:
            SDK +
            "import { readdirSync } from 'node:fs';\nimport { join } from 'node:path';\n" +
            'export const registerFileResources = (server) => {\n' +
            '  const docsDir = join(__dirname, "..", "docs");\n' +
            '  const entries = readdirSync(docsDir);\n' +
            '  for (const name of entries) {\n' +
            '    const description = `Static document file exposed from /docs: ${name}`;\n' +
            '    server.registerResource(name, `demo://doc/${name}`, { mimeType: "text/plain", description }, async (uri) => ({ contents: [] }));\n' +
            '  }\n' +
            '};',
        },
        {
          // @found modelcontextprotocol/typescript-sdk:examples/stickynotes/server.ts:40
          name: 'FP: a description built from a server counter id, through a helper a tool calls',
          code:
            SDK +
            "import * as z from 'zod/v4';\n" +
            'let nextId = 1;\n' +
            'function buildServer() {\n' +
            '  const server = new McpServer({ name: "stickynotes", version: "1.0.0" });\n' +
            '  const registerNote = (id, text) => {\n' +
            '    server.registerResource(`note-${id}`, `note:///${id}`, { mimeType: "text/plain", description: `Sticky note #${id}` }, async (uri) => ({ contents: [{ uri: uri.href, text }] }));\n' +
            '  };\n' +
            '  for (const [id, text] of notes) registerNote(id, text);\n' +
            '  server.registerTool("add_note", { description: "Add a note", inputSchema: z.object({ text: z.string() }) }, async ({ text }) => {\n' +
            '    const id = String(nextId++);\n' +
            '    registerNote(id, text);\n' +
            '    return { content: [] };\n' +
            '  });\n' +
            '  return server;\n' +
            '}',
        },
        {
          // @found modelcontextprotocol/servers:src/everything/resources/session.ts:80
          name: 'FP: a helper forwarding its own parameter, with no caller in the file',
          code:
            SDK +
            'export const registerSessionResource = (server, resource, type, payload) => {\n' +
            '  const { uri, name, mimeType, description, title } = resource;\n' +
            '  return server.registerResource(name, uri, { mimeType, description, title }, async () => ({ contents: [] }));\n' +
            '};',
        },
        {
          // @found modelcontextprotocol/servers:src/everything/tools/gzip-file-as-resource.ts:101
          name: 'FP: a tool passes a client-chosen NAME to a relative helper that forwards only description and title',
          filename: SERVER,
          code:
            SDK +
            "import { registerSessionResource } from './session-resource';\n" +
            'server.registerTool("gzip", cfg, async (args) => {\n' +
            '  const { name } = args;\n' +
            '  const resource = <Resource>{ uri: `demo://${name}`, name, mimeType: "application/gzip" };\n' +
            '  registerSessionResource(server, resource, blob);\n' +
            '  return { content: [] };\n' +
            '});',
        },
        {
          name: 'a helper call whose forwarded argument is server-local, and calls that resolve to nothing',
          filename: SERVER,
          code:
            SDK +
            "import registerDefault, { registerNoteResource, notAFunction } from './session-resource';\n" +
            "import { missing } from './nope';\nimport { fromPkg } from 'some-package';\n" +
            'server.registerTool("x", cfg, async (args) => {\n' +
            '  registerNoteResource(server, args.id, "fixed text");\n' +
            '  registerDefault(server, SERVER_BLURB);\n' +
            '  registerNoteResource(server, args.id);\n' +
            '  notAFunction(args.d); missing(args.d); fromPkg(args.d); (() => 0)(args.d);\n' +
            '  return { content: [] };\n' +
            '});',
        },
        {
          name: 'helper shapes that do not trace to a forwarded client value',
          filename: SERVER,
          code:
            SDK +
            "import * as H from './session-resource';\nimport { reassignable, declaredLater } from './session-resource';\n" +
            'let mutable = (server, text) => server.registerTool("m", { description: text }, h);\n' +
            'function computed(server, res) { server.registerTool("c", { description: res[k], title: `Fixed ${CONST}` }, h); }\n' +
            'function cycle(server) { const a = b.x; const b = a.y; server.registerTool("y", { description: a }, h); }\n' +
            'function patterned(server, { [k]: v, other = {} }, ...rest) { server.registerTool("p", { description: v, title: rest }, h); }\n' +
            'function local(server) { const { d } = CONFIG; server.registerTool("l", { description: d }, h); }\n' +
            'server.setRequestHandler(customSchema, async (req) => { server.registerTool("q", { description: req.params.q }, h); });\n' +
            "import { ListPromptsRequestSchema } from '@modelcontextprotocol/sdk/types.js';\nserver.setRequestHandler(ListPromptsRequestSchema, handleList);\n" +
            'server.registerTool("x", cfg, async (args) => {\n' +
            '  H(server, args.t); reassignable(server, args.t); declaredLater(args.t); mutable(server, args.t);\n' +
            '  computed(server, args); cycle(server); patterned(server, args, args.t); local(server);\n' +
            '  return { content: [] };\n' +
            '});',
        },
        {
          // @found modelcontextprotocol/typescript-sdk:examples/guides/clients/oauth.examples.ts:34 (crash on a bodiless declaration)
          name: 'FP: a declare-only function is not a helper with a body to read',
          code:
            SDK +
            'declare function onRedirect(server: unknown, url: string): void;\n' +
            'server.registerTool("x", cfg, async (args) => { onRedirect(server, args.url); return { content: [] }; });',
        },
        {
          name: 'a destructured helper parameter given an untainted object at the call site',
          code:
            SDK +
            'function reg(server, { description } = {}) { server.registerTool("r", { description }, h); }\n' +
            'server.registerTool("x", cfg, async (args) => { reg(server, SOME_OBJECT); reg(server); return { content: [] }; });',
        },
        {
          name: 'a same-file helper that forwards nothing model-facing from its parameters',
          code:
            SDK +
            'function register(server, value) { const fixed = "Fixed"; server.registerTool("t", { description: fixed, title: value.length > 1 ? "A" : "B" }, h); }\n' +
            'function other(server) { server.registerTool("u", { description: CONFIGURED }, h); }\n' +
            'server.registerTool("x", cfg, async (args) => { register(server, args.v); other(server, args.v); return { content: [] }; });',
        },
        {
          name: 'a file read that is not contents (a directory listing, a stat) and a fetch to nowhere',
          code:
            SDK +
            "import { readdirSync, statSync } from 'node:fs';\n" +
            'server.registerTool("a", { description: readdirSync(DIR).join(", ") }, h);\n' +
            'server.registerTool("b", { description: String(statSync(F).size) }, h);\n' +
            'server.registerTool("c", { description: (await cache.get(k)).text() }, h);\n' +
            'server.registerTool("d", { description: JSON.parse(CONFIG).description }, h);',
        },
        {
          name: 'an app route on something that is not an HTTP framework',
          code:
            SDK +
            "import { Router } from './router';\nconst app = new Router();\n" +
            'app.post("/t", (req) => server.registerTool("t", { description: req.body.d }, h));\n' +
            'other.post("/u", (req) => server.registerTool("u", { description: req.body.d }, h));',
        },
        {
          name: 'a description imported from a relative module that does not read a file',
          filename: SERVER,
          code:
            SDK +
            "import { LOCAL_DESCRIPTION } from './file-description';\nimport { loadBlurb } from './loader';\n" +
            'server.registerTool("a", { description: LOCAL_DESCRIPTION }, h);\n' +
            'server.registerTool("b", { description: loadBlurb() }, h);',
        },
      ],
      invalid: [
        {
          // Reported before too (as "dynamic"); now reported for the right reason.
          name: 'a tool registers a resource whose description is a tool argument',
          code:
            SDK +
            'server.registerTool("add_note", cfg, async ({ title, body }) => {\n' +
            '  server.registerResource(`note-${title}`, `note:///${title}`, { description: `Note: ${title}` }, async () => ({ contents: [] }));\n' +
            '  return { content: [] };\n' +
            '});',
          errors: [meta('resource', 'unknown', 'description', 'title')],
        },
        {
          name: 'a tool registered from a fetched manifest',
          code:
            SDK +
            'const res = await fetch("https://plugins.example.com/manifest.json");\n' +
            'const manifest = await res.json();\n' +
            'server.registerTool("plugin", { title: manifest.title, description: manifest.description }, h);',
          errors: [
            tool('plugin', 'title', 'manifest.title'),
            tool('plugin', 'description', 'manifest.description'),
          ],
        },
        {
          name: "a description read from a file's contents",
          code:
            SDK +
            "import { readFileSync } from 'node:fs';\nimport { readFile } from 'node:fs/promises';\n" +
            'const text = await readFile("./desc.md", "utf8");\n' +
            'server.registerTool("a", { description: text }, h);\n' +
            'server.registerTool("b", { description: JSON.parse(readFileSync("./tools.json", "utf8")).b.description }, h);',
          errors: [
            tool('a', 'description', 'readFile()'),
            tool('b', 'description', 'readFileSync().b.description'),
          ],
        },
        {
          // Reported before at the helper (as "dynamic"); now at the call that carries the argument.
          name: 'a tool argument forwarded into a description through a same-file helper',
          code:
            SDK +
            'const registerNote = (server, id, text) => server.registerResource(`note-${id}`, `note:///${id}`, { description: text }, cb);\n' +
            'server.registerTool("add_note", cfg, async ({ text }) => { registerNote(server, "1", text); return { content: [] }; });',
          errors: [meta('resource', 'unknown', 'description', 'text')],
        },
        {
          // @found modelcontextprotocol/servers:src/everything/tools/gzip-file-as-resource.ts:101 (the forwarding path, with a client-chosen description)
          name: 'FN: a tool argument forwarded through a relative helper (object field, positional, default export)',
          filename: SERVER,
          code:
            SDK +
            "import registerDefault, { registerSessionResource, registerNoteResource } from './session-resource';\n" +
            'server.registerTool("x", cfg, async (args) => {\n' +
            '  const resource = { uri: "u", name: "n", description: args.summary };\n' +
            '  registerSessionResource(server, resource, "");\n' +
            '  registerSessionResource(server, { uri: "u", name: "n", title: `About ${args.topic}` }, "");\n' +
            '  registerNoteResource(server, "1", args.body);\n' +
            '  registerDefault(server, args.blurb);\n' +
            '  return { content: [] };\n' +
            '});',
          errors: [
            meta('resource', 'unknown', 'description', 'args.summary'),
            meta('resource', 'unknown', 'title', 'args.topic'),
            meta('resource', 'unknown', 'description', 'args.body'),
            meta('prompt', 'p', 'description', 'args.blurb'),
          ],
        },
        {
          name: 'an overloaded helper is read through its implementation',
          code:
            SDK +
            'function reg(server: unknown): void;\nfunction reg(server: unknown, text: string): void;\n' +
            'function reg(server: any, text?: string) { server.registerTool("r", { description: text }, h); }\n' +
            'server.registerTool("x", cfg, async (args) => { reg(server, args.t); return { content: [] }; });',
          errors: [tool('r', 'description', 'args.t')],
        },
        {
          name: 'the whole arguments object handed to a helper that reads its description field',
          code:
            SDK +
            'function reg(server, meta, { title } = {}) { server.registerTool("r", { description: meta.description, title }, h); }\n' +
            'server.registerTool("x", cfg, async (args) => { reg(server, args); return { content: [] }; });',
          errors: [tool('r', 'description', 'args.description')],
        },
        {
          name: 'a request parameter, an HTTP body, a Hono body and axios data',
          code:
            SDK +
            "import express from 'express';\nimport { Hono } from 'hono';\nimport axios from 'axios';\n" +
            "import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';\n" +
            'server.setRequestHandler(ListToolsRequestSchema, async (request) => { server.registerPrompt("p", { description: request.params.cursor }, cb); return { tools: [] }; });\n' +
            'const app = express();\n' +
            'app.post("/tools", (req, res) => { server.registerTool("t", { description: req.body.description }, h); });\n' +
            'const hono = new Hono();\n' +
            'hono.post("/tools", async (c) => { const body = await c.req.json(); server.registerTool("u", { description: body.description }, h); });\n' +
            'const { data } = await axios.get("https://registry.example.com/tool");\n' +
            'server.registerTool("v", { description: data.description }, h);',
          errors: [
            meta('prompt', 'p', 'description', 'request.params.cursor'),
            tool('t', 'description', 'req.body.description'),
            tool('u', 'description', 'body.description'),
            tool('v', 'description', 'data.description'),
          ],
        },
        {
          name: 'the legacy positional description from a tool argument, and a file read in another module',
          filename: SERVER,
          code:
            SDK +
            "import { FILE_DESCRIPTION } from './file-description';\n" +
            'server.registerTool("x", cfg, async ({ label }) => { server.tool("child", `Child of ${label}`, async () => ({ content: [] })); return { content: [] }; });\n' +
            'server.registerTool("y", { description: FILE_DESCRIPTION }, h);',
          errors: [
            tool('child', 'description', 'label'),
            tool('y', 'description', 'FILE_DESCRIPTION'),
          ],
        },
      ],
    });
  });
});

describe('isStaticText', () => {
  const exprOf = (code: string): TSESTree.Node =>
    (
      parser.parse(code, { range: true })
        .body[0] as TSESTree.ExpressionStatement
    ).expression;

  it('accepts what a developer can be said to have written', () => {
    expect(isStaticText(exprOf("'Search the docs'"))).toBe(true);
    expect(isStaticText(exprOf('`Search the docs`'))).toBe(true);
    expect(isStaticText(exprOf("'Search ' + 'the docs'"))).toBe(true);
    expect(isStaticText(exprOf("'a' + 'b' + 'c'"))).toBe(true);
  });

  it('rejects anything whose value is decided elsewhere', () => {
    expect(isStaticText(exprOf('`Search ${x}`'))).toBe(false);
    expect(isStaticText(exprOf('blurb'))).toBe(false);
    expect(isStaticText(exprOf('build()'))).toBe(false);
    expect(isStaticText(exprOf('config.blurb'))).toBe(false);
    expect(isStaticText(exprOf("'Search ' + scope"))).toBe(false);
    expect(isStaticText(exprOf('scope + 42'))).toBe(false);
  });

  it('rejects a non-string literal', () => {
    expect(isStaticText(exprOf('42'))).toBe(false);
    expect(isStaticText(exprOf('null'))).toBe(false);
  });

  it('rejects an operator that is not concatenation', () => {
    expect(isStaticText(exprOf("'a' - 'b'"))).toBe(false);
  });
});

describe('modelFacingProperties', () => {
  const objOf = (code: string): TSESTree.ObjectExpression =>
    (
      parser.parse(code, { range: true })
        .body[0] as TSESTree.ExpressionStatement
    ).expression as TSESTree.ObjectExpression;

  it('finds a dynamic description', () => {
    expect(
      modelFacingProperties(objOf('({ description: `a ${b}` })'))[0]?.key,
    ).toBe('description');
  });

  it('finds a dynamic title', () => {
    expect(modelFacingProperties(objOf('({ title: blurb })'))[0]?.key).toBe(
      'title',
    );
  });

  it('returns undefined when every model-facing key is static', () => {
    expect(
      modelFacingProperties(objOf("({ title: 'S', description: 'D' })")),
    ).toEqual([]);
  });

  it('ignores keys the model never sees', () => {
    expect(
      modelFacingProperties(objOf('({ inputSchema: buildSchema() })')),
    ).toEqual([]);
    expect(modelFacingProperties(objOf('({ handler: fn })'))).toEqual([]);
  });

  it('walks past a spread rather than stopping at it', () => {
    // A spread is not a Property; the scan must continue to the keys after it.
    expect(
      modelFacingProperties(objOf('({ ...base, description: blurb })'))[0]?.key,
    ).toBe('description');
  });

  it('ignores a computed key', () => {
    expect(modelFacingProperties(objOf('({ [k]: blurb })'))).toEqual([]);
  });

  it('returns both when title and description are each dynamic', () => {
    const found = modelFacingProperties(
      objOf('({ title: a, description: b })'),
    );
    expect(found.map((f) => f.key)).toEqual(['title', 'description']);
  });

  it('ignores a numeric key', () => {
    expect(modelFacingProperties(objOf('({ 0: blurb })'))).toEqual([]);
  });
});
