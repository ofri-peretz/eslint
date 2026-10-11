/**
 * Tests for mcp-sdk-security/no-unvalidated-tool-args
 * CWE-20 — a handler reading a key its input schema does not declare.
 *
 * The `valid` half carries the weight: this rule compares two statically-read
 * shapes, and every way of writing a schema it *cannot* read has to stay
 * silent. Judging a handler against a shape the file does not contain would
 * report correct code.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import {
  noUnvalidatedToolArgs,
  declaredSchemaKeys,
  destructuredArgNames,
  propertyKey,
} from './index';
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

const SDK =
  "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n";

describe('no-unvalidated-tool-args', () => {
  describe('Valid', () => {
    ruleTester.run('valid', noUnvalidatedToolArgs, {
      valid: [
        {
          name: 'every read key is declared',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { path: z.string() } }, async ({ path }) => read(path));',
        },
        {
          name: 'reading a subset of the schema',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { path: z.string(), mode: z.string() } }, async ({ path }) => read(path));',
        },
        {
          name: 'reading nothing at all',
          code:
            SDK +
            'server.registerTool("ping", { inputSchema: { path: z.string() } }, async () => "pong");',
        },
        {
          // `options` can carry its own inputSchema, so the visible keys are
          // not necessarily the declared ones. Reporting `extra` here would be
          // judging the handler against a shape the file cannot see.
          name: 'a spread after inputSchema can replace it',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { path: z.string() }, ...options }, async ({ path, extra }) => read(path, extra));',
        },
        {
          // Not this rule's question — require-tool-input-schema owns it.
          name: 'no inputSchema declared',
          code:
            SDK +
            'server.registerTool("read", { title: "Read" }, async ({ path }) => read(path));',
        },
        // Moved to `invalid` (FN fix, 2026-10): `z.object({ … })` is not a schema
        // the file cannot see — its keys are written right there, and it is the
        // canonical form in SDK v2 (the raw shape is deprecated). What stays
        // silent is a call whose key set is NOT visible:
        {
          name: 'a schema built by a call whose keys are not visible',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: buildSchema() }, async ({ path, extra }) => read(path));',
        },
        {
          name: 'z.object of a shape held in a variable',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: z.object(ReadShape) }, async ({ path, extra }) => read(path));',
        },
        {
          name: 'z.object with a spread inside',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: z.object({ ...Base, path: z.string() }) }, async ({ path, extra }) => read(path));',
        },
        {
          name: '.extend() can add any key',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: z.object({ path: z.string() }).extend(More) }, async ({ path, extra }) => read(path));',
        },
        {
          name: 'a computed chained method',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: z.object({ path: z.string() })[m]() }, async ({ path, extra }) => read(path));',
        },
        {
          name: 'a schema built by a bare call',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: object({ path: z.string() }) }, async ({ path, extra }) => read(path));',
        },
        {
          name: 'z.object with two arguments is not a plain key set',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: z.object({ path: z.string() }, opts) }, async ({ path, extra }) => read(path));',
        },
        {
          name: 'every key read is declared in a z.object schema',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: z.object({ path: z.string() }).strict().describe("x") }, async ({ path }) => read(path));',
        },
        {
          // Moved from `invalid`. The legacy `tool()` has no config object:
          // its second argument is a params shape or annotations, decided by
          // whether the values are Zod schemas. `{ inputSchema: {…} }` is
          // neither a params shape (its value is not a schema) nor readable as
          // one, so the rule abstains rather than treat `inputSchema` as an
          // argument name. The legacy shape is now read correctly — see the
          // `tool(name, shape, cb)` cases under invalid.
          name: 'a legacy object with an inputSchema key is not a config',
          code:
            SDK +
            'server.tool("read", { inputSchema: { path: z.string() } }, async ({ extra }) => read(extra));',
        },
        {
          name: 'a legacy shape that declares every key read',
          code:
            SDK +
            'server.tool("read", "Read a file", { path: z.string() }, async ({ path }) => read(path));',
        },
        {
          name: 'a legacy annotations object declares no schema to compare against',
          code:
            SDK +
            'server.tool("read", { readOnlyHint: true }, async ({ path }) => read(path));',
        },
        {
          name: 'a legacy object of schemas held in variables is not readable',
          code:
            SDK +
            'server.tool("read", { path: PathSchema }, async ({ path, extra }) => read(path));',
        },
        {
          name: 'a legacy shape held in a variable',
          code:
            SDK +
            'server.tool("read", ReadShape, async ({ path, extra }) => read(path));',
        },
        {
          name: 'a handler passed by a name that is not a function in this file',
          code:
            SDK +
            'import { handleRead } from "./handlers";\nserver.registerTool("read", { inputSchema: { path: z.string() } }, handleRead);',
        },
        {
          name: 'a schema spread from elsewhere',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { ...base, path: z.string() } }, async ({ path, extra }) => read(path));',
        },
        {
          name: 'a schema with a computed key',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { [k]: z.string() } }, async ({ path }) => read(path));',
        },
        {
          name: 'a schema referenced by name',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: ReadSchema }, async ({ path, extra }) => read(path));',
        },
        {
          // Following every `args.x` through a body is the data-flow analysis
          // this rule is built to avoid.
          name: 'the whole-args form is out of scope',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { path: z.string() } }, async (args) => read(args.extra));',
        },
        {
          name: 'a rest element names no specific key',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { path: z.string() } }, async ({ path, ...rest }) => read(path, rest));',
        },
        {
          name: 'a computed key in the handler pattern',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { path: z.string() } }, async ({ [k]: v }) => read(v));',
        },
        {
          name: 'a handler passed by reference',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { path: z.string() } }, handleRead);',
        },
        {
          name: 'a config passed by reference',
          code:
            SDK +
            'server.registerTool("read", cfg, async ({ path }) => read(path));',
        },
        {
          name: 'a file that never imports the MCP SDK',
          code: 'server.registerTool("read", { inputSchema: { path: z.string() } }, async ({ extra }) => read(extra));',
        },
        {
          name: 'an unrelated import does not open the gate',
          code:
            "import { z } from 'zod';\n" +
            'server.registerTool("read", { inputSchema: { path: z.string() } }, async ({ extra }) => read(extra));',
        },
        {
          // A private method is the one non-computed property that is not an
          // Identifier, so it is the only way to reach that guard.
          name: 'a private method is not a registration',
          code:
            SDK +
            'class S { #registerTool() {} m() { this.#registerTool("r", { inputSchema: {} }, ({ x }) => x); } }',
        },
        {
          name: 'a quoted schema key matches a plain read',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { "path": z.string() } }, async ({ path }) => read(path));',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid — read but never declared', () => {
    ruleTester.run('invalid', noUnvalidatedToolArgs, {
      valid: [],
      invalid: [
        {
          name: 'one undeclared key',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { path: z.string() } }, async ({ path, encoding }) => read(path, encoding));',
          errors: [
            {
              messageId: 'undeclaredArg',
              data: { tool: 'read', arg: 'encoding' },
            },
          ],
        },
        {
          name: 'two undeclared keys report separately',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { path: z.string() } }, async ({ path, encoding, flags }) => read(path));',
          errors: [
            { messageId: 'undeclaredArg' },
            { messageId: 'undeclaredArg' },
          ],
        },
        {
          name: 'an empty schema declares nothing',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: {} }, async ({ path }) => read(path));',
          errors: [
            { messageId: 'undeclaredArg', data: { tool: 'read', arg: 'path' } },
          ],
        },
        {
          name: 'a renamed destructure is judged on the key, not the local name',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { path: z.string() } }, async ({ encoding: enc }) => read(enc));',
          errors: [
            {
              messageId: 'undeclaredArg',
              data: { tool: 'read', arg: 'encoding' },
            },
          ],
        },
        {
          name: 'a defaulted destructure is still a read',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { path: z.string() } }, async ({ encoding = "utf8" }) => encoding);',
          errors: [
            {
              messageId: 'undeclaredArg',
              data: { tool: 'read', arg: 'encoding' },
            },
          ],
        },
        {
          name: 'a function expression handler',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: { path: z.string() } }, async function ({ extra }) { return read(extra); });',
          errors: [{ messageId: 'undeclaredArg' }],
        },
        {
          name: 'a non-literal tool name falls back to unknown',
          code:
            SDK +
            'server.registerTool(toolName, { inputSchema: { path: z.string() } }, async ({ extra }) => read(extra));',
          errors: [
            {
              messageId: 'undeclaredArg',
              data: { tool: 'unknown', arg: 'extra' },
            },
          ],
        },
        {
          name: 'a z.object schema (the canonical SDK v2 form)',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: z.object({ path: z.string() }) }, async ({ path, encoding }) => read(path, encoding));',
          errors: [
            {
              messageId: 'undeclaredArg',
              data: { tool: 'read', arg: 'encoding' },
            },
          ],
        },
        {
          name: 'a z.strictObject schema with chained modifiers',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: z.strictObject({ path: z.string() }).describe("x").strict() }, async ({ path, encoding }) => read(path, encoding));',
          errors: [{ messageId: 'undeclaredArg' }],
        },
        {
          name: 'a passthrough schema lets the undeclared key through unvalidated',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: z.object({ path: z.string() }).passthrough() }, async ({ path, encoding }) => read(path, encoding));',
          errors: [
            {
              messageId: 'undeclaredArgPassthrough',
              data: { tool: 'read', arg: 'encoding' },
            },
          ],
        },
        {
          name: 'a zod 4 .loose() schema',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: z.object({ path: z.string() }).loose() }, async ({ path, encoding }) => read(path, encoding));',
          errors: [{ messageId: 'undeclaredArgPassthrough' }],
        },
        {
          name: 'a z.looseObject schema',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: z.looseObject({ path: z.string() }) }, async ({ path, encoding }) => read(path, encoding));',
          errors: [{ messageId: 'undeclaredArgPassthrough' }],
        },
        {
          name: 'the legacy tool(name, shape, cb) form',
          code:
            SDK +
            'server.tool("read", { path: z.string() }, async ({ path, encoding }) => read(path, encoding));',
          errors: [
            {
              messageId: 'undeclaredArg',
              data: { tool: 'read', arg: 'encoding' },
            },
          ],
        },
        {
          name: 'the legacy tool(name, description, shape, cb) form',
          code:
            SDK +
            'server.tool("read", "Read a file", { path: z.string() }, async ({ path, encoding }) => read(path, encoding));',
          errors: [{ messageId: 'undeclaredArg' }],
        },
        {
          name: 'the legacy form with annotations after the shape',
          code:
            SDK +
            'server.tool("read", "Read a file", { path: z.string() }, { readOnlyHint: true }, async ({ path, encoding }) => read(path, encoding));',
          errors: [{ messageId: 'undeclaredArg' }],
        },
        {
          name: 'a legacy empty shape declares nothing',
          code:
            SDK + 'server.tool("read", {}, async ({ path }) => read(path));',
          errors: [{ messageId: 'undeclaredArg' }],
        },
        {
          name: 'a same-file handler passed by reference',
          code:
            SDK +
            'async function handleRead({ path, encoding }) { return read(path, encoding); }\n' +
            'server.registerTool("read", { inputSchema: { path: z.string() } }, handleRead);',
          errors: [{ messageId: 'undeclaredArg' }],
        },
        {
          name: 'an SDK v2 server',
          code:
            "import { McpServer } from '@modelcontextprotocol/server';\n" +
            'server.registerTool("read", { inputSchema: z.object({ path: z.string() }) }, async ({ path, encoding }) => read(path, encoding));',
          errors: [{ messageId: 'undeclaredArg' }],
        },
        {
          name: 'require() opens the same gate',
          code:
            "const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');\n" +
            'server.registerTool("read", { inputSchema: { path: z.string() } }, async ({ extra }) => read(extra));',
          errors: [{ messageId: 'undeclaredArg' }],
        },
        {
          name: 'the import appearing after the registration',
          code:
            'server.registerTool("read", { inputSchema: { path: z.string() } }, async ({ extra }) => read(extra));\n' +
            SDK,
          errors: [{ messageId: 'undeclaredArg' }],
        },
      ],
    });
  });
});

const objOf = (code: string): TSESTree.ObjectExpression =>
  (parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement)
    .expression as TSESTree.ObjectExpression;

describe('propertyKey', () => {
  const firstProp = (code: string) => objOf(code).properties[0]!;

  it('reads an identifier and a string-literal key', () => {
    expect(propertyKey(firstProp('({ path: 1 })'))).toBe('path');
    expect(propertyKey(firstProp('({ "path": 1 })'))).toBe('path');
  });

  // Changed 2026-10-10: `{ 0: 1 }` and `{ ['path']: 1 }` declare real keys;
  // devkit's objectKeyName reads them (the spellings gate forbids the blind spot).
  it('reads a numeric and a computed string-literal key', () => {
    expect(propertyKey(firstProp('({ 0: 1 })'))).toBe('0');
    expect(propertyKey(firstProp('({ ["path"]: 1 })'))).toBe('path');
  });

  it('returns undefined for a dynamic computed or spread member', () => {
    expect(propertyKey(firstProp('({ [k]: 1 })'))).toBeUndefined();
    expect(propertyKey(firstProp('({ ...base })'))).toBeUndefined();
  });
});

describe('declaredSchemaKeys', () => {
  it('reads a plain object schema', () => {
    const keys = declaredSchemaKeys(objOf('({ inputSchema: { a: 1, b: 2 } })'));
    expect([...keys!].sort()).toEqual(['a', 'b']);
  });

  it('reads a z.object schema written in place (was: "gives up" — FN fix)', () => {
    const keys = declaredSchemaKeys(
      objOf('({ inputSchema: z.object({ a: 1 }) })'),
    );
    expect([...keys!]).toEqual(['a']);
  });

  it('reads an empty schema as declaring nothing', () => {
    expect([...declaredSchemaKeys(objOf('({ inputSchema: {} })'))!]).toEqual(
      [],
    );
  });

  it('gives up rather than half-read a schema it cannot see', () => {
    // Each of these could declare anything; a partial read would report
    // correct handlers.
    expect(
      declaredSchemaKeys(objOf('({ inputSchema: buildSchema() })')),
    ).toBeUndefined();
    expect(
      declaredSchemaKeys(objOf('({ inputSchema: Schema })')),
    ).toBeUndefined();
    expect(
      declaredSchemaKeys(objOf('({ inputSchema: { ...base } })')),
    ).toBeUndefined();
    expect(
      declaredSchemaKeys(objOf('({ inputSchema: { [k]: 1 } })')),
    ).toBeUndefined();
  });

  it('returns undefined when there is no inputSchema at all', () => {
    expect(declaredSchemaKeys(objOf('({ title: "t" })'))).toBeUndefined();
  });

  it('gives up when a spread follows inputSchema and can replace it', () => {
    // `options.inputSchema` wins at runtime, so the visible keys are not the
    // declared ones — judging a handler against them would report correct code.
    expect(
      declaredSchemaKeys(objOf('({ inputSchema: { a: 1 }, ...options })')),
    ).toBeUndefined();
  });

  it('reads past an ordinary property that follows inputSchema', () => {
    const keys = declaredSchemaKeys(
      objOf('({ inputSchema: { a: 1 }, title: "t" })'),
    );
    expect([...keys!]).toEqual(['a']);
  });

  it('still reads a schema when the spread comes first', () => {
    // The explicit key wins over an earlier spread, so this one is readable.
    const keys = declaredSchemaKeys(
      objOf('({ ...options, inputSchema: { a: 1 } })'),
    );
    expect([...keys!]).toEqual(['a']);
  });
});

describe('destructuredArgNames', () => {
  const fnOf = (code: string): TSESTree.Node =>
    (
      parser.parse(code, { range: true })
        .body[0] as TSESTree.ExpressionStatement
    ).expression;

  it('reads the destructured keys', () => {
    expect(
      destructuredArgNames(fnOf('({ a, b }) => {}')).map((r) => r.name),
    ).toEqual(['a', 'b']);
  });

  it('reads the key, not the renamed local', () => {
    expect(
      destructuredArgNames(fnOf('({ a: x }) => {}')).map((r) => r.name),
    ).toEqual(['a']);
  });

  it('reads a defaulted key', () => {
    expect(
      destructuredArgNames(fnOf('({ a = 1 }) => {}')).map((r) => r.name),
    ).toEqual(['a']);
  });

  it('skips a rest element, which names no specific key', () => {
    expect(
      destructuredArgNames(fnOf('({ a, ...rest }) => {}')).map((r) => r.name),
    ).toEqual(['a']);
  });

  it('skips a computed key', () => {
    expect(destructuredArgNames(fnOf('({ [k]: v }) => {}'))).toEqual([]);
  });

  it('returns nothing for the whole-args form', () => {
    expect(destructuredArgNames(fnOf('(args) => {}'))).toEqual([]);
  });

  it('returns nothing for a non-function or a parameterless one', () => {
    expect(destructuredArgNames(fnOf('handleRead'))).toEqual([]);
    expect(destructuredArgNames(fnOf('() => {}'))).toEqual([]);
  });
});
