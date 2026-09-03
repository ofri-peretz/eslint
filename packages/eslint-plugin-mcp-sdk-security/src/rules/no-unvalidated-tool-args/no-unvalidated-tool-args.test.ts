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
        {
          // Every shape the rule cannot read must be silent, or it judges a
          // handler against a schema this file does not contain.
          name: 'a schema built by a call',
          code:
            SDK +
            'server.registerTool("read", { inputSchema: z.object({ path: z.string() }) }, async ({ path, extra }) => read(path));',
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
          name: 'the legacy tool() arity',
          code:
            SDK +
            'server.tool("read", { inputSchema: { path: z.string() } }, async ({ extra }) => read(extra));',
          errors: [{ messageId: 'undeclaredArg' }],
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

  it('returns undefined for a computed, numeric or spread member', () => {
    expect(propertyKey(firstProp('({ [k]: 1 })'))).toBeUndefined();
    expect(propertyKey(firstProp('({ 0: 1 })'))).toBeUndefined();
    expect(propertyKey(firstProp('({ ...base })'))).toBeUndefined();
  });
});

describe('declaredSchemaKeys', () => {
  it('reads a plain object schema', () => {
    const keys = declaredSchemaKeys(objOf('({ inputSchema: { a: 1, b: 2 } })'));
    expect([...keys!].sort()).toEqual(['a', 'b']);
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
      declaredSchemaKeys(objOf('({ inputSchema: z.object({}) })')),
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
