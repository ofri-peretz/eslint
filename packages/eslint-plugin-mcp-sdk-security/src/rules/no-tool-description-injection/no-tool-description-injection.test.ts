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

  describe('Invalid — text assembled at runtime', () => {
    ruleTester.run('invalid', noToolDescriptionInjection, {
      valid: [],
      invalid: [
        {
          name: 'an interpolated template',
          code:
            SDK +
            'server.registerTool("search", { description: `Search ${scope}` }, handler);',
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          // The advisory shape: text loaded per tenant, appended to the
          // instruction block.
          name: 'a value loaded from elsewhere',
          code:
            SDK +
            "server.registerTool('search', { description: tenantBlurb }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a call result',
          code:
            SDK +
            "server.registerTool('search', { description: buildDescription() }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a member access',
          code:
            SDK +
            "server.registerTool('search', { description: config.blurb }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'concatenation with a non-literal',
          code:
            SDK +
            "server.registerTool('search', { description: 'Search ' + scope }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a dynamic title is the same defect',
          code:
            SDK +
            'server.registerTool("search", { title: `Search ${scope}` }, handler);',
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'the legacy tool() arity',
          code:
            SDK +
            'server.tool("search", { description: `Search ${scope}` }, handler);',
          errors: [{ messageId: 'dynamicDescription' }],
        },
        // ---- FN fixes and the limits of the FP fixes, 2026-10.
        {
          name: 'the legacy positional description, interpolated',
          code:
            SDK +
            'server.tool("search", `Search ${await loadBlurb()}`, { q: z.string() }, async ({ q }) => q);',
          errors: [
            {
              messageId: 'dynamicDescription',
              data: { tool: 'search', key: 'description' },
            },
          ],
        },
        {
          name: 'the legacy positional description with no schema',
          code:
            SDK +
            'server.tool("search", "Search " + blurb, async () => ({ content: [] }));',
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a legacy positional description held in a value this file does not fix',
          code:
            SDK +
            'server.tool("search", blurb, { q: z.string() }, async ({ q }) => q);',
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a let binding can be reassigned',
          code:
            SDK +
            "let DESC = 'Search';\nserver.registerTool('search', { description: DESC }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a const initialised from a call',
          code:
            SDK +
            "const DESC = loadBlurb();\nserver.registerTool('search', { description: DESC }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a destructured const',
          code:
            SDK +
            "const { DESC } = config;\nserver.registerTool('search', { description: DESC }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a const object property that is not a literal',
          code:
            SDK +
            "const TOOLS = { search: blurb, ...more };\nserver.registerTool('search', { description: TOOLS.search }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a const object property that does not exist, or a computed one',
          code:
            SDK +
            "const TOOLS = { search: 'S' };\nserver.registerTool('search', { title: TOOLS.other, description: TOOLS[k] }, handler);",
          errors: [
            { messageId: 'dynamicDescription' },
            { messageId: 'dynamicDescription' },
          ],
        },
        {
          name: 'a property of a const that is not an object literal',
          code:
            SDK +
            "const TOOLS = load();\nserver.registerTool('search', { description: TOOLS.search }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a joined array with a dynamic element',
          code:
            SDK +
            "server.registerTool('q', { description: ['Query', blurb].join('\\n') }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a joined array with a spread or a dynamic separator',
          code:
            SDK +
            "server.registerTool('q', { title: [...lines].join(), description: ['a'].join(sep) }, handler);",
          errors: [
            { messageId: 'dynamicDescription' },
            { messageId: 'dynamicDescription' },
          ],
        },
        {
          name: 'a join on something that is not an array literal',
          code:
            SDK +
            "server.registerTool('q', { description: lines.join('\\n') }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a tagged template that interpolates',
          code:
            SDK +
            "server.registerTool('q', { description: dedent`Search ${blurb}` }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a const object key a later spread may override',
          code:
            SDK +
            "const TOOLS = { search: 'S', ...overrides };\nserver.registerTool('search', { description: TOOLS.search }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a nested const path that does not exist',
          code:
            SDK +
            "const TOOLS = { search: { d: 'S' } };\nserver.registerTool('search', { description: TOOLS.missing.d }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a property of a call result',
          code:
            SDK +
            "server.registerTool('search', { description: load().search }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'an awaited value',
          code:
            SDK +
            "server.registerTool('search', { description: await loadBlurb() }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'an array method other than join, and a join with extra arguments',
          code:
            SDK +
            "server.registerTool('search', { title: ['a'].map(f), description: ['a'].join('', extra) }, handler);",
          errors: [
            { messageId: 'dynamicDescription' },
            { messageId: 'dynamicDescription' },
          ],
        },
        {
          name: 'an ambient declaration has no initializer to read',
          code:
            SDK +
            "declare const DESC: string;\nserver.registerTool('search', { description: DESC }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          // @found mcp-sdk-security FP/FN audit 2026-10-10, residual 1 (imported description)
          name: 'FN: a dynamic description imported from another file',
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
          errors: [
            {
              messageId: 'dynamicDescription',
              data: { tool: 'a', key: 'title' },
            },
            {
              messageId: 'dynamicDescription',
              data: { tool: 'a', key: 'description' },
            },
            {
              messageId: 'dynamicDescription',
              data: { tool: 'b', key: 'title' },
            },
            {
              messageId: 'dynamicDescription',
              data: { tool: 'b', key: 'description' },
            },
            {
              messageId: 'dynamicDescription',
              data: { tool: 'c', key: 'title' },
            },
            {
              messageId: 'dynamicDescription',
              data: { tool: 'c', key: 'description' },
            },
            {
              messageId: 'dynamicDescription',
              data: { tool: 'd', key: 'title' },
            },
            {
              messageId: 'dynamicDescription',
              data: { tool: 'd', key: 'description' },
            },
          ],
        },
        {
          // @found mcp-sdk-security FP/FN audit 2026-10-10, residual 1 (imported description)
          name: 'FN: a namespace import used as text is not text',
          filename: SERVER,
          code:
            SDK +
            "import * as D from './descriptions';\nserver.registerTool('a', { description: D }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a dynamic prompt description',
          code:
            SDK +
            "server.registerPrompt('summarize', { description: `Summarize. ${blurb}` }, cb);",
          errors: [
            {
              messageId: 'dynamicMetadata',
              data: { kind: 'prompt', name: 'summarize', key: 'description' },
            },
          ],
        },
        {
          name: 'a dynamic resource description (config is the third argument)',
          code:
            SDK +
            "server.registerResource('notes', template, { description: blurb }, cb);",
          errors: [
            {
              messageId: 'dynamicMetadata',
              data: { kind: 'resource', name: 'notes', key: 'description' },
            },
          ],
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
          errors: [
            { messageId: 'dynamicDescription' },
            { messageId: 'dynamicDescription' },
          ],
        },
        {
          name: 'a quoted key is still a description',
          code:
            SDK +
            'server.registerTool("search", { "description": `Search ${x}` }, handler);',
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          // The tool name is only used for the message; a non-literal name
          // falls back to "unknown" rather than suppressing the finding.
          name: 'a non-literal tool name still reports',
          code:
            SDK +
            'server.registerTool(toolName, { description: `Search ${x}` }, handler);',
          errors: [
            {
              messageId: 'dynamicDescription',
              data: { tool: 'unknown', key: 'description' },
            },
          ],
        },
        {
          name: 'the SDK import alongside unrelated imports',
          code:
            "import { z } from 'zod';\n" +
            SDK +
            'server.registerTool("search", { description: `Search ${x}` }, handler);',
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'require() opens the same gate',
          code:
            "const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');\n" +
            'server.registerTool("search", { description: `Search ${x}` }, handler);',
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          // Registrations are judged at Program:exit, so an import below them
          // still opens the gate.
          name: 'the import appearing after the registration',
          code:
            'server.registerTool("search", { description: `Search ${x}` }, handler);\n' +
            SDK,
          errors: [{ messageId: 'dynamicDescription' }],
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
