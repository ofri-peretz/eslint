/**
 * Tests for mcp-sdk-security/no-duplicate-tool-name
 * CWE-694 — two tools with one name on the same server.
 *
 * Written test-first: every invalid case below failed against a stub rule
 * (backlog item 10 of benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { join } from 'node:path';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noDuplicateToolName } from './index';

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

/** A file beside the cross-file fixtures, so relative imports resolve from disk. */
const SERVER = join(
  __dirname,
  '..',
  '..',
  '..',
  'fixtures',
  'cross-file',
  'server.ts',
);

const SDK =
  "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
  "import { Server } from '@modelcontextprotocol/sdk/server/index.js';\n" +
  "import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';\n" +
  'const server = new McpServer({ name: "s", version: "1.0.0" });\n';

const dupReg = (name: string, line: number) => ({
  messageId: 'duplicateToolRegistration' as const,
  data: { name, line: String(line) },
});
const dupList = (name: string, line: number) => ({
  messageId: 'duplicateListedTool' as const,
  data: { name, line: String(line) },
});

/** Every loop statement whose body is an alternative, spelled out once. */
const LOOP_SHAPES: Record<string, (body: string) => string> = {
  ForStatement: (body) => `for (let i = 0; i < n; i++) { ${body} }`,
  ForInStatement: (body) => `for (const k in groups) { ${body} }`,
  ForOfStatement: (body) => `for (const t of tools) { ${body} }`,
  WhileStatement: (body) => `while (more()) { ${body} }`,
  DoWhileStatement: (body) => `do { ${body} } while (more());`,
};

describe('no-duplicate-tool-name', () => {
  ruleTester.run('no-duplicate-tool-name', noDuplicateToolName, {
    valid: [
      ...Object.entries(LOOP_SHAPES).map(([type, loop]) => ({
        name: `a registration in a loop body is not straight-line: ${type}`,
        code:
          SDK +
          loop('server.registerTool("y", cfg, h);') +
          '\nserver.registerTool("y", cfg, h);',
      })),
      {
        name: 'distinct names on one server',
        code:
          SDK +
          'server.registerTool("read", cfg, h);\nserver.registerTool("write", cfg, h);',
      },
      {
        name: 'the same name on two different server variables',
        code:
          SDK +
          'const admin = new McpServer({ name: "a", version: "1" });\n' +
          'server.registerTool("read", cfg, h);\nadmin.registerTool("read", cfg, h);',
      },
      {
        name: 'the same name in the two branches of an if/else',
        code:
          SDK +
          'if (readOnly) { server.registerTool("files", cfgRO, h); }\n' +
          'else { server.registerTool("files", cfgRW, h); }',
      },
      {
        name: 'the same name in the two branches of a ternary',
        code:
          SDK +
          'legacy ? server.tool("files", h) : server.registerTool("files", cfg, h);',
      },
      {
        name: 'one registration conditional, one not (only one may run)',
        code:
          SDK +
          'if (beta) server.registerTool("search", cfg, h);\n' +
          'server.registerTool("search", cfg2, h2);\n' +
          'enabled && server.registerTool("search", cfg3, h3);',
      },
      {
        name: 'two separate factory functions',
        code:
          SDK +
          'function makeA(s) { s.registerTool("read", cfg, h); }\n' +
          'function makeB(s) { s.registerTool("read", cfg, h); }',
      },
      {
        name: 'one call in a factory, one at the top level',
        code:
          SDK +
          'server.registerTool("read", cfg, h);\nconst add = () => server.registerTool("read", cfg, h);',
      },
      {
        name: 'switch cases, loops and catch blocks are alternatives',
        code:
          SDK +
          'switch (mode) { case "a": server.registerTool("x", cfg, h); break; default: server.registerTool("x", cfg, h); }\n' +
          'for (const t of tools) server.registerTool("y", cfg, h);\nserver.registerTool("y", cfg, h);\n' +
          'while (more) { server.registerTool("w", cfg, h); }\nserver.registerTool("w", cfg, h);\n' +
          'try { server.registerTool("z", cfg, h); } catch { server.registerTool("z", cfg, h); }',
      },
      {
        name: 'dynamic names',
        code:
          SDK +
          'server.registerTool(name, cfg, h);\nserver.registerTool(name, cfg, h);\n' +
          'server.registerTool(`${p}_x`, cfg, h);\nserver.registerTool(`${p}_x`, cfg, h);',
      },
      {
        name: 'receivers that are not a plain variable abstain',
        code:
          SDK +
          'this.server.registerTool("read", cfg, h);\nthis.server.registerTool("read", cfg, h);\n' +
          'getServer().registerTool("read", cfg, h);\ngetServer().registerTool("read", cfg, h);\n' +
          'undeclared.registerTool("read", cfg, h);\nundeclared.registerTool("read", cfg, h);',
      },
      {
        name: 'a call that is not a registration',
        code:
          SDK +
          'server.registerTool("read");\nserver.tool("read");\nserver.registerPrompt("read", cfg, h);\nserver.registerPrompt("read", cfg, h);',
      },
      {
        name: 'a file that never imports the MCP SDK',
        code: 'server.registerTool("read", cfg, h);\nserver.registerTool("read", cfg, h);',
      },
      {
        name: 'a tools/list response with distinct or dynamic names',
        code:
          SDK +
          'const low = new Server({ name: "s", version: "1" }, { capabilities: { tools: {} } });\n' +
          'low.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [{ name: "a" }, { name: "b" }, { name: n }, { name: n }, other, ...more, { [k]: "x" }, { "name": "c" }] }));',
      },
      {
        name: 'a list handler whose tools cannot be read',
        code:
          SDK +
          "import { TOOLS } from './descriptions';\n" +
          'low.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: buildTools() }));\n' +
          'low.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));\n' +
          'low.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));\n' +
          'low.setRequestHandler(ListToolsRequestSchema, async () => ({ ...base }));\n' +
          'low.setRequestHandler(ListToolsRequestSchema, async () => listing);\n' +
          'low.setRequestHandler(ListToolsRequestSchema, handler);\n' +
          'low.setRequestHandler(ListToolsRequestSchema);',
        filename: SERVER,
      },
      {
        name: 'a request handler for another method',
        code:
          SDK +
          "import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';\n" +
          'low.setRequestHandler(CallToolRequestSchema, async () => ({ tools: [{ name: "a" }, { name: "a" }] }));\n' +
          'low.setRequestHandler("prompts/list", async () => ({ tools: [{ name: "a" }, { name: "a" }] }));\n' +
          'low.setRequestHandler(Local, async () => ({ tools: [{ name: "a" }, { name: "a" }] }));\n' +
          'low[method](ListToolsRequestSchema, async () => ({ tools: [{ name: "a" }, { name: "a" }] }));',
      },
    ],
    invalid: [
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 10 (duplicate tool names)
        name: 'FN: two registerTool calls give one server the same name',
        code:
          SDK +
          'server.registerTool("search", { description: "Search docs" }, searchDocs);\n' +
          'server.registerTool("search", { description: "Search code" }, searchCode);',
        errors: [dupReg('search', 5)],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 10 (duplicate tool names)
        name: 'FN: a legacy tool() and a registerTool() with the same name',
        code:
          SDK +
          'server.tool("ping", async () => ({ content: [] }));\nserver.registerTool("ping", cfg, h);',
        errors: [dupReg('ping', 5)],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 10 (duplicate tool names)
        name: 'FN: a duplicate behind a try/catch is silently dropped at startup',
        code:
          SDK +
          'server.registerTool("deploy", cfg, safeDeploy);\n' +
          'try { server.registerTool("deploy", cfg, forceDeploy); } catch (e) { log(e); }',
        errors: [dupReg('deploy', 5)],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 10 (duplicate tool names)
        name: 'FN: a low-level Server lists two tools with one name',
        code:
          SDK +
          'const low = new Server({ name: "s", version: "1" }, { capabilities: { tools: {} } });\n' +
          'low.setRequestHandler(ListToolsRequestSchema, async () => ({\n' +
          '  tools: [\n' +
          '    { name: "query", description: "Read-only query", inputSchema: {} },\n' +
          '    { name: "query", description: "Run any SQL", inputSchema: {} },\n' +
          '  ],\n' +
          '}));',
        errors: [dupList('query', 8)],
      },
      {
        name: 'the same name held in a const, and imported from a relative module',
        filename: SERVER,
        code:
          SDK +
          "import { SEARCH } from './descriptions';\n" +
          'const NAME = "lookup";\n' +
          'server.registerTool(NAME, cfg, h);\nserver.registerTool("lookup", cfg, h);\n' +
          'server.registerTool(SEARCH, cfg, h);\nserver.registerTool(SEARCH, cfg, h);',
        errors: [dupReg('lookup', 7), dupReg('Search the docs', 9)],
      },
      {
        name: 'a third registration is reported against the first',
        code:
          SDK +
          'server.registerTool("a", cfg, h);\nserver.registerTool("a", cfg, h);\nserver.registerTool("a", cfg, h);',
        errors: [dupReg('a', 5), dupReg('a', 5)],
      },
      {
        name: 'straight-line inside one factory, a block, an if test and a try block',
        code:
          SDK +
          'function make(s) {\n' +
          '  s.registerTool("a", cfg, h);\n' +
          '  { s.registerTool("a", cfg, h); }\n' +
          '}\n' +
          'if (server.registerTool("b", cfg, h)) {}\n' +
          'try { server.registerTool("b", cfg, h); } finally {}',
        errors: [dupReg('a', 6), dupReg('b', 9)],
      },
      {
        name: 'within one branch, two registrations still collide',
        code:
          SDK +
          'if (beta) {\n' +
          '  server.registerTool("x", cfg, h);\n' +
          '  server.registerTool("x", cfg, h);\n' +
          '}',
        errors: [dupReg('x', 6)],
      },
      {
        name: 'a conditional earlier one is skipped, a straight-line one is matched',
        code:
          SDK +
          'if (beta) server.registerTool("x", cfg, h);\n' +
          'server.registerTool("x", cfg, h);\n' +
          'server.registerTool("x", cfg, h);',
        errors: [dupReg('x', 6)],
      },
      {
        name: "the v2 'tools/list' string, a const array, and tool objects held in consts",
        code:
          SDK +
          'const READ = { name: "read", inputSchema: {} };\n' +
          'const TOOLS = [READ, { name: "write" }, READ];\n' +
          'low.setRequestHandler("tools/list", async () => { return { tools: TOOLS }; });',
        errors: [dupList('read', 6)],
      },
      {
        name: 'a list handler declared as a named function, with as-const and satisfies',
        code:
          SDK +
          'async function listTools() {\n' +
          '  return { tools: [{ name: "a" }, { name: "a" }] as const } satisfies object;\n' +
          '}\n' +
          'low.setRequestHandler(ListToolsRequestSchema, listTools);\n' +
          'low.setRequestHandler(ListToolsRequestSchema, listTools);',
        errors: [dupList('a', 6)],
      },
    ],
  });
});
