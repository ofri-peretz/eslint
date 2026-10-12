/**
 * Tests for mcp-sdk-security/no-path-traversal-in-tool
 * CWE-22 — a tool argument or resource-template variable choosing an fs path.
 *
 * Written test-first: every invalid case below failed against a plugin with no
 * such rule (backlog item 1 of benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md).
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
  "import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
  "import { readFile, writeFile, rm, existsSync } from 'node:fs';\n" +
  "import * as fsp from 'node:fs/promises';\n" +
  "import path from 'node:path';\n" +
  "const ROOT = '/srv/data';\n";

const err = (arg: string, sink: string) => ({
  messageId: 'toolArgToPath' as const,
  data: { arg, sink },
});

/** Every fs export the rule treats as a path sink, spelled out once. */
const ONE_PATH = [
  'readFile',
  'readFileSync',
  'writeFile',
  'writeFileSync',
  'appendFile',
  'appendFileSync',
  'createReadStream',
  'createWriteStream',
  'open',
  'openSync',
  'opendir',
  'opendirSync',
  'readdir',
  'readdirSync',
  'mkdir',
  'mkdirSync',
  'rm',
  'rmSync',
  'rmdir',
  'rmdirSync',
  'unlink',
  'unlinkSync',
  'truncate',
  'truncateSync',
  'chmod',
  'chmodSync',
  'chown',
  'chownSync',
  'readlink',
  'readlinkSync',
];
const TWO_PATH = [
  'copyFile',
  'copyFileSync',
  'cp',
  'cpSync',
  'rename',
  'renameSync',
  'symlink',
  'symlinkSync',
  'link',
  'linkSync',
];

describe('no-path-traversal-in-tool', () => {
  ruleTester.run('no-path-traversal-in-tool', noPathTraversalInTool, {
    valid: [
      {
        name: 'a literal path',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => readFile("/etc/motd", cb));',
      },
      {
        name: 'a file that never imports the MCP SDK',
        code:
          "import { readFile } from 'node:fs';\n" +
          'server.registerTool("r", cfg, async ({ p }) => readFile(p, cb));',
      },
      {
        name: 'a path that is not a tool argument',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => readFile(configured, cb));',
      },
      {
        name: 'an fs call outside any tool handler',
        code: SDK + 'function load(p) { return readFile(p, cb); }',
      },
      {
        name: 'a readFile that is not fs (a method on some object)',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => store.readFile(p));',
      },
      {
        name: 'the data argument of writeFile is not a path',
        code:
          SDK +
          'server.registerTool("w", cfg, async ({ body }) => writeFile("/tmp/out", body, cb));',
      },
      {
        name: 'an existence probe is neither a sink nor a containment check',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => existsSync(p));',
      },
      {
        name: 'basename strips every directory',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ name }) => fsp.readFile(path.join(ROOT, path.basename(name))));',
      },
      {
        name: 'containment: startsWith(root + sep) before the read, with an exit',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const target = path.resolve(ROOT, p);\n' +
          '  if (!target.startsWith(ROOT + path.sep)) throw new Error("outside");\n' +
          '  return fsp.readFile(target, "utf8");\n' +
          '});',
      },
      {
        name: 'containment: path.relative / isAbsolute on a derived name',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const target = await fsp.realpath(path.join(ROOT, p));\n' +
          '  const rel = path.relative(ROOT, target);\n' +
          '  if (rel.startsWith("..") || path.isAbsolute(rel)) { return { isError: true, content: [] }; }\n' +
          '  return fsp.readFile(target, "utf8");\n' +
          '});',
      },
      {
        name: 'containment: the read wrapped inside the check',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const target = path.resolve(ROOT, p);\n' +
          '  if (target.startsWith(ROOT + path.sep)) { return fsp.readFile(target); }\n' +
          '});',
      },
      {
        name: 'containment: an allowlist includes() check',
        code:
          SDK +
          'const FILES = ["a.md", "b.md"];\n' +
          'server.registerTool("r", cfg, async ({ name }) => {\n' +
          '  if (!FILES.includes(name)) throw new Error("unknown");\n' +
          '  return fsp.readFile(path.join(ROOT, name));\n' +
          '});',
      },
      {
        name: 'containment: a same-file helper that checks before returning',
        code:
          SDK +
          'async function inside(requested) {\n' +
          '  const target = await fsp.realpath(path.resolve(ROOT, requested));\n' +
          '  const relative = path.relative(ROOT, target);\n' +
          '  const escapes = relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative);\n' +
          '  if (escapes) throw new Error("outside");\n' +
          '  return target;\n' +
          '}\n' +
          'server.registerTool("r", cfg, async ({ p }) => fsp.readFile(await inside(p)));',
      },
      {
        name: 'containment: an imported validator in the test',
        code:
          SDK +
          "import { isInside } from './paths';\n" +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const target = path.join(ROOT, p);\n' +
          '  if (!isInside(ROOT, target)) return { content: [] };\n' +
          '  return readFile(target, cb);\n' +
          '});',
      },
      {
        name: 'a resource template read whose variable is checked',
        code:
          SDK +
          'server.registerResource("doc", new ResourceTemplate("docs://{name}", { list: undefined }), {}, async (uri, { name }) => {\n' +
          '  if (!/^[a-z-]+$/.test(name)) throw new Error("bad name");\n' +
          '  return { contents: [{ uri: uri.href, text: await fsp.readFile(path.join(ROOT, name), "utf8") }] };\n' +
          '});',
      },
      {
        name: 'a static resource is not a template — its uri is fixed',
        code:
          SDK +
          'server.registerResource("doc", "docs://readme", {}, async (uri, vars) => fsp.readFile(vars.name));',
      },
      {
        name: 'a resource whose callback is not in this file',
        code:
          SDK +
          'const tpl = new ResourceTemplate("docs://{name}", { list: undefined });\n' +
          'server.resource("doc", tpl, handleDoc);',
      },
      {
        name: 'a resource registered with a template built elsewhere',
        code:
          SDK +
          'server.resource("doc", makeTemplate(), async (uri, { name }) => fsp.readFile(name));',
      },
      // Boundaries pinned on purpose: these are not containment, and a check
      // that only looks like one must not silence the rule — see the invalid
      // side for `endsWith`, `typeof` and existence probes.
      {
        name: 'a guard on a DIFFERENT argument is not this path’s guard, but a closed set is the allowlist',
        code:
          SDK +
          "import { z } from 'zod';\n" +
          'server.registerTool("r", { inputSchema: { which: z.enum(["a.md", "b.md"]) } }, async ({ which }) => fsp.readFile(path.join(ROOT, which)));',
      },
      {
        name: 'a callee that resolves to nothing is not a sink',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => getReader()(p));',
      },
      {
        name: 'a namespace import of another module is not fs',
        code:
          SDK +
          "import * as store from './store';\n" +
          'server.registerTool("r", cfg, async ({ p }) => store.readFile(p));',
      },
      {
        name: 'fs.promises itself is not a sink',
        code:
          SDK +
          "import fs from 'node:fs';\n" +
          'server.registerTool("r", cfg, async ({ p }) => fs.promises(p));',
      },
      {
        name: 'a local URL class is not the WHATWG URL',
        code:
          SDK +
          'class URL { constructor(x) {} }\n' +
          'server.registerTool("r", cfg, async ({ p }) => fsp.readFile(new URL(p)));',
      },
      {
        name: 'a URL constructed from a non-identifier callee',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => fsp.readFile(new globalThis.URL(p)));',
      },
      {
        name: 'a fs call whose result is not a path (reading a list file)',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => fsp.readFile(await fsp.readFile(LIST)));',
      },
      {
        name: 'extname is not a path the argument chooses',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => fsp.readFile(path.join(ROOT, "x" + path.extname(p))));',
      },
      {
        name: 'the path module called as a function is not a joiner',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => fsp.readFile(path(p)));',
      },
      {
        name: 'containment: a validator given an options object (shorthand and computed keys)',
        code:
          SDK +
          "import { isInside } from './paths';\n" +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  if (!isInside({ root: ROOT, p, [mode]: true })) throw new Error("outside");\n' +
          '  return fsp.readFile(path.join(ROOT, p));\n' +
          '});',
      },
      {
        name: 'a url export other than fileURLToPath',
        code:
          SDK +
          "import { pathToFileURL } from 'node:url';\n" +
          'server.registerTool("r", cfg, async ({ p }) => fsp.readFile(pathToFileURL(ROOT)));',
      },
    ],
    invalid: [
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 1 (path traversal, EscapeRoute CVE-2025-53109/53110)
        name: 'FN: a tool argument joined onto a root and read',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => fsp.readFile(path.join(ROOT, p), "utf8"));',
        errors: [err('p', 'readFile')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 1 (path traversal, EscapeRoute CVE-2025-53109/53110)
        name: 'FN: a resource template variable read from disk',
        code:
          SDK +
          'server.registerResource("doc", new ResourceTemplate("docs://{name}", { list: undefined }), {}, async (uri, { name }) => ({\n' +
          '  contents: [{ uri: uri.href, text: await fsp.readFile(path.join(ROOT, name), "utf8") }],\n' +
          '}));',
        errors: [err('name', 'readFile')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 1 (path traversal, EscapeRoute CVE-2025-53109/53110)
        name: 'FN: the legacy resource() form with a template held in a const',
        code:
          SDK +
          'const tpl = new ResourceTemplate("file:///{+path}", { list: undefined });\n' +
          'server.resource("file", tpl, async (uri, variables) => ({ contents: [{ uri: uri.href, text: await fsp.readFile(variables.path, "utf8") }] }));',
        errors: [err('variables.path', 'readFile')],
      },
      {
        name: 'the argument used directly, callback style',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => readFile(p, cb));',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'a write and a recursive delete',
        code:
          SDK +
          'server.registerTool("w", cfg, async ({ p, body }) => { writeFile(p, body, cb); rm(path.resolve(ROOT, p), { recursive: true }, cb); });',
        errors: [err('p', 'writeFile'), err('p', 'rm')],
      },
      {
        name: 'both paths of a two-path call',
        code:
          SDK +
          'server.registerTool("mv", cfg, async ({ from, to }) => fsp.rename(from, to));',
        errors: [err('from', 'rename'), err('to', 'rename')],
      },
      {
        name: 'a template path, the whole-args form, and fs.promises through a default import',
        code:
          SDK +
          "import fs from 'node:fs';\n" +
          'server.registerTool("r", cfg, async (args) => fs.promises.readFile(`${ROOT}/${args.file}`));',
        errors: [err('args.file', 'readFile')],
      },
      {
        name: 'require() of fs, fs-extra and graceful-fs',
        code:
          SDK +
          "const fse = require('fs-extra');\nconst gfs = require('graceful-fs');\nconst { readFileSync } = require('fs');\n" +
          'server.registerTool("r", cfg, async ({ p }) => { fse.readFile(p); gfs.readFileSync(p); readFileSync(p); });',
        errors: [
          err('p', 'readFile'),
          err('p', 'readFileSync'),
          err('p', 'readFileSync'),
        ],
      },
      {
        name: 'path.posix / path.win32, dirname, realpath and fileURLToPath keep the argument',
        code:
          SDK +
          "import { fileURLToPath } from 'node:url';\n" +
          'server.registerTool("r", cfg, async ({ a, b, c, d }) => {\n' +
          '  await fsp.readdir(path.posix.join(ROOT, a));\n' +
          '  await fsp.readdir(path.win32.dirname(b));\n' +
          '  await fsp.readFile(await fsp.realpath(c));\n' +
          '  await fsp.readFile(fileURLToPath(new URL(d, "file:///srv/")));\n' +
          '});',
        errors: [
          err('a', 'readdir'),
          err('b', 'readdir'),
          err('c', 'readFile'),
          err('d', 'readFile'),
        ],
      },
      {
        name: 'low-level Server: request.params.arguments',
        code:
          SDK +
          "import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';\n" +
          'server.setRequestHandler(CallToolRequestSchema, async (request) => {\n' +
          '  const { path: p } = request.params.arguments;\n' +
          '  return fsp.readFile(String(p), "utf8");\n' +
          '});',
        errors: [err('request.params.arguments.path', 'readFile')],
      },
      {
        name: 'spread path segments from the arguments',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ segments }) => fsp.readFile(path.join(ROOT, ...segments)));',
        errors: [err('segments', 'readFile')],
      },
      {
        name: 'a handler passed by reference',
        code:
          SDK +
          'async function readHandler({ p }) { return fsp.readFile(path.join(ROOT, p)); }\n' +
          'server.registerTool("r", cfg, readHandler);',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'endsWith is not containment',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  if (!p.endsWith(".md")) throw new Error("markdown only");\n' +
          '  return fsp.readFile(path.join(ROOT, p));\n' +
          '});',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'an existence probe in the test is not containment',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const target = path.join(ROOT, p);\n' +
          '  if (!existsSync(target)) throw new Error("not found");\n' +
          '  return fsp.readFile(target);\n' +
          '});',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'a type check, a join in the test, and a guard that does not exit are not containment',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  if (typeof p !== "string") throw new Error("bad");\n' +
          '  if (path.join(ROOT, p) === ROOT) throw new Error("bad");\n' +
          '  if (!p.startsWith(ROOT)) console.warn("outside");\n' +
          '  return fsp.readFile(path.join(ROOT, p));\n' +
          '});',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'a check below the read does not guard it',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const data = await fsp.readFile(p);\n' +
          '  if (!p.startsWith(ROOT)) throw new Error("too late");\n' +
          '  return data;\n' +
          '});',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'a guard on another argument does not guard this one',
        code:
          SDK +
          'const OPS = new Set(["read"]);\n' +
          'server.registerTool("r", cfg, async ({ op, p }) => {\n' +
          '  if (!OPS.has(op)) throw new Error("bad op");\n' +
          '  return fsp.readFile(path.join(ROOT, p));\n' +
          '});',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'a same-file helper with no check passes the argument through',
        code:
          SDK +
          'function under(root, p) { const log = () => p; const full = path.join(root, p); return full; }\n' +
          'function noParams() { if (!ok()) throw new Error("x"); return "/tmp"; }\n' +
          'const arrow = (p) => path.join(ROOT, p);\n' +
          'server.registerTool("r", cfg, async ({ p, q }) => { await fsp.readFile(under(ROOT, p)); await fsp.readFile(arrow(q)); await fsp.readFile(noParams()); });',
        errors: [err('p', 'readFile'), err('q', 'readFile')],
      },
      {
        name: 'a reassigned path and a lib global in the lineage',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  let target = process.cwd();\n' +
          '  target = path.join(target, p);\n' +
          '  if (!process.env.READ_OK) throw new Error("disabled");\n' +
          '  return fsp.readFile(target);\n' +
          '});',
        errors: [err('p', 'readFile')],
      },
      {
        name: 'a check inside a nested callback does not guard the outer read',
        code:
          SDK +
          'server.registerTool("r", cfg, async ({ p }) => {\n' +
          '  const ok = () => p.startsWith(ROOT);\n' +
          '  if (!ok) throw new Error("x");\n' +
          '  return fsp.readFile(p);\n' +
          '});',
        errors: [err('p', 'readFile')],
      },
      ...ONE_PATH.map((sink) => ({
        name: `every one-path fs sink: ${sink}`,
        code:
          SDK +
          `import * as fs from 'node:fs';\nserver.registerTool("r", cfg, async ({ p }) => fs.${sink}(p));`,
        errors: [err('p', sink)],
      })),
      ...TWO_PATH.map((sink) => ({
        name: `every two-path fs sink: ${sink}`,
        code:
          SDK +
          `import * as fs from 'node:fs';\nserver.registerTool("r", cfg, async ({ a, b }) => fs.${sink}(a, b));`,
        errors: [err('a', sink), err('b', sink)],
      })),
    ],
  });
});
