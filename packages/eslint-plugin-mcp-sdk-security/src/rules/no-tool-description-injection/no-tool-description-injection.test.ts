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
import { noToolDescriptionInjection, isStaticText, modelFacingProperties } from './index';
import type { TSESTree } from '@typescript-eslint/utils';

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
const SDK = "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n";

describe('no-tool-description-injection', () => {
  describe('Valid — text the developer wrote', () => {
    ruleTester.run('valid', noToolDescriptionInjection, {
      valid: [
        {
          name: 'a string literal',
          code: SDK + "server.registerTool('search', { description: 'Search the docs' }, handler);",
        },
        {
          name: 'a template with no interpolations',
          code: SDK + 'server.registerTool("search", { description: `Search the docs` }, handler);',
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
          code: SDK + "server.registerTool('search', { inputSchema: {} }, handler);",
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
          code: SDK + 'server[method]("search", { description: `Search ${x}` }, handler);',
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
          code: SDK + 'registerTool("search", { description: `Search ${x}` }, handler);',
        },
        {
          name: 'an unrelated import does not open the gate on its own',
          code: "import { z } from 'zod';\nserver.registerTool('s', { description: `S ${x}` }, h);",
        },
        {
          name: 'a computed key is not statically a description',
          code: SDK + "server.registerTool('search', { [key]: `Search ${x}` }, handler);",
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
          code: SDK + 'server.registerTool("search", { description: `Search ${scope}` }, handler);',
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          // The advisory shape: text loaded per tenant, appended to the
          // instruction block.
          name: 'a value loaded from elsewhere',
          code: SDK + "server.registerTool('search', { description: tenantBlurb }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a call result',
          code: SDK + "server.registerTool('search', { description: buildDescription() }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a member access',
          code: SDK + "server.registerTool('search', { description: config.blurb }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'concatenation with a non-literal',
          code:
            SDK + "server.registerTool('search', { description: 'Search ' + scope }, handler);",
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'a dynamic title is the same defect',
          code: SDK + 'server.registerTool("search", { title: `Search ${scope}` }, handler);',
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          name: 'the legacy tool() arity',
          code: SDK + 'server.tool("search", { description: `Search ${scope}` }, handler);',
          errors: [{ messageId: 'dynamicDescription' }],
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
          errors: [{ messageId: 'dynamicDescription' }, { messageId: 'dynamicDescription' }],
        },
        {
          name: 'a quoted key is still a description',
          code: SDK + 'server.registerTool("search", { "description": `Search ${x}` }, handler);',
          errors: [{ messageId: 'dynamicDescription' }],
        },
        {
          // The tool name is only used for the message; a non-literal name
          // falls back to "unknown" rather than suppressing the finding.
          name: 'a non-literal tool name still reports',
          code: SDK + 'server.registerTool(toolName, { description: `Search ${x}` }, handler);',
          errors: [{ messageId: 'dynamicDescription', data: { tool: 'unknown', key: 'description' } }],
        },
        {
          name: 'the SDK import alongside unrelated imports',
          code:
            "import { z } from 'zod';\n" + SDK +
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
            'server.registerTool("search", { description: `Search ${x}` }, handler);\n' + SDK,
          errors: [{ messageId: 'dynamicDescription' }],
        },
      ],
    });
  });
});

describe('isStaticText', () => {
  const exprOf = (code: string): TSESTree.Node =>
    (parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement).expression;

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
    (parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement)
      .expression as TSESTree.ObjectExpression;

  it('finds a dynamic description', () => {
    expect(modelFacingProperties(objOf('({ description: `a ${b}` })'))[0]?.key).toBe('description');
  });

  it('finds a dynamic title', () => {
    expect(modelFacingProperties(objOf('({ title: blurb })'))[0]?.key).toBe('title');
  });

  it('returns undefined when every model-facing key is static', () => {
    expect(modelFacingProperties(objOf("({ title: 'S', description: 'D' })"))).toEqual([]);
  });

  it('ignores keys the model never sees', () => {
    expect(modelFacingProperties(objOf('({ inputSchema: buildSchema() })'))).toEqual([]);
    expect(modelFacingProperties(objOf('({ handler: fn })'))).toEqual([]);
  });

  it('walks past a spread rather than stopping at it', () => {
    // A spread is not a Property; the scan must continue to the keys after it.
    expect(modelFacingProperties(objOf('({ ...base, description: blurb })'))[0]?.key).toBe(
      'description',
    );
  });

  it('ignores a computed key', () => {
    expect(modelFacingProperties(objOf('({ [k]: blurb })'))).toEqual([]);
  });

  it('returns both when title and description are each dynamic', () => {
    const found = modelFacingProperties(objOf('({ title: a, description: b })'));
    expect(found.map((f) => f.key)).toEqual(['title', 'description']);
  });

  it('ignores a numeric key', () => {
    expect(modelFacingProperties(objOf('({ 0: blurb })'))).toEqual([]);
  });
});
