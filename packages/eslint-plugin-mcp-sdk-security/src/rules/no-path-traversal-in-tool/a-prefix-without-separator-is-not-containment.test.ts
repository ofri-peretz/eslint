/**
 * A `startsWith` prefix check contains a path only when the prefix ends at a
 * path separator. `'/srv/data-secrets/key'.startsWith('/srv/data')` is true, so
 * an unanchored prefix lets every sibling directory that shares the name through.
 *
 * Ground truth: GHSA-hc55-p739-j48w (CVE-2025-53110),
 * @modelcontextprotocol/server-filesystem <= 0.6.2, whose validatePath() ran
 * `allowedDirectories.some(dir => normalizedRequested.startsWith(dir))`. The
 * fix (2025.7.1) compares `p === dir || p.startsWith(dir + path.sep)`. The
 * corpus pair lives in benchmarks/corpus/CVE/CVE-2025-53110-*.
 *
 * Written test-first: the invalid cases below passed silently before the rule
 * required the separator. The valid cases pin the escape test on a
 * `path.relative` result (`rel.startsWith('..')`), which is not a root prefix.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noPathTraversalInTool } from './index';

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
  "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
  "import * as fsp from 'node:fs/promises';\n" +
  "import path from 'node:path';\n" +
  "import { sep } from 'node:path';\n" +
  "const ROOT = '/srv/data';\n" +
  'const ALLOWED = process.argv.slice(2);\n' +
  "const server = new McpServer({ name: 'f', version: '1' });\n" +
  'const cfg = { description: "d", inputSchema: {} };\n';

const err = (arg: string, sink: string) => ({
  messageId: 'toolArgToPath' as const,
  data: { arg, sink },
});

ruleTester.run(
  'no-path-traversal-in-tool: separator-anchored prefix',
  noPathTraversalInTool,
  {
    valid: [
      {
        name: 'root + path.sep',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const t = path.resolve(ROOT, p);\n' +
          '  if (!t.startsWith(ROOT + path.sep)) throw new Error("outside");\n' +
          '  return fsp.readFile(t);\n' +
          '});',
      },
      {
        name: 'root + imported sep',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const t = path.resolve(ROOT, p);\n' +
          '  if (!t.startsWith(ROOT + sep)) throw new Error("outside");\n' +
          '  return fsp.readFile(t);\n' +
          '});',
      },
      {
        name: 'a template ending in a slash',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const t = path.resolve(ROOT, p);\n' +
          '  if (!t.startsWith(`${ROOT}/`)) throw new Error("outside");\n' +
          '  return fsp.readFile(t);\n' +
          '});',
      },
      {
        name: 'a literal root that already ends in a slash',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const t = path.resolve(ROOT, p);\n' +
          '  if (!t.startsWith("/srv/data/")) throw new Error("outside");\n' +
          '  return fsp.readFile(t);\n' +
          '});',
      },
      {
        name: 'the fixed server-filesystem shape: equal, or below dir + sep',
        code:
          SDK +
          'function within(abs) { const n = path.normalize(path.resolve(abs)); return ALLOWED.some((dir) => n === dir || n.startsWith(dir + path.sep)); }\n' +
          'async function validatePath(req) { const abs = path.resolve(process.cwd(), req); if (!within(abs)) throw new Error("denied"); return abs; }\n' +
          'server.registerTool("r", cfg, async ({ p }) => fsp.readFile(await validatePath(p)));',
      },
      {
        name: 'an escape test on a path.relative result is not a root prefix',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const t = path.resolve(ROOT, p);\n' +
          '  const rel = path.relative(ROOT, t);\n' +
          '  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("outside");\n' +
          '  return fsp.readFile(t);\n' +
          '});',
      },
      {
        name: 'a template whose last part is path.sep',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const t = path.resolve(ROOT, p);\n' +
          '  if (!t.startsWith(`${ROOT}${path.sep}`)) throw new Error("outside");\n' +
          '  return fsp.readFile(t);\n' +
          '});',
      },
    ],
    invalid: [
      {
        name: 'startsWith(ROOT) alone admits /srv/data-secrets',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const t = path.resolve(ROOT, p);\n' +
          '  if (!t.startsWith(ROOT)) throw new Error("outside");\n' +
          '  return fsp.readFile(t);\n' +
          '});',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'a literal root with no trailing separator',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const t = path.resolve(ROOT, p);\n' +
          '  if (!t.startsWith("/srv/data")) throw new Error("outside");\n' +
          '  return fsp.readFile(t);\n' +
          '});',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'the read wrapped in an unanchored check',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const t = path.resolve(ROOT, p);\n' +
          '  if (t.startsWith(ROOT)) { return fsp.readFile(t); }\n' +
          '});',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'the vulnerable server-filesystem shape (<= 0.6.2): some(dir => p.startsWith(dir)) in a helper',
        code:
          SDK +
          'async function validatePath(req) {\n' +
          '  const abs = path.resolve(process.cwd(), req);\n' +
          '  const n = path.normalize(abs);\n' +
          '  const isAllowed = ALLOWED.some((dir) => n.startsWith(dir));\n' +
          '  if (!isAllowed) throw new Error("denied");\n' +
          '  return abs;\n' +
          '}\n' +
          'server.registerTool("r", cfg, async ({ p }) => fsp.readFile(await validatePath(p)));',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'a template whose last part is not a separator',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const t = path.resolve(ROOT, p);\n' +
          '  if (!t.startsWith(`${ROOT}${p}`)) throw new Error("outside");\n' +
          '  return fsp.readFile(t);\n' +
          '});',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'a template ending in a non-separator character',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const t = path.resolve(ROOT, p);\n' +
          '  if (!t.startsWith(`${ROOT}-x`)) throw new Error("outside");\n' +
          '  return fsp.readFile(t);\n' +
          '});',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'a spread argument proves nothing',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const t = path.resolve(ROOT, p);\n' +
          '  if (!t.startsWith(...[ROOT])) throw new Error("outside");\n' +
          '  return fsp.readFile(t);\n' +
          '});',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'a call with no prefix proves nothing',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const t = path.resolve(ROOT, p);\n' +
          '  if (!t.startsWith()) throw new Error("outside");\n' +
          '  return fsp.readFile(t);\n' +
          '});',
        errors: [err('p', 'readFile')],
      },
    ],
  },
);
