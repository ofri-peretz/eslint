/**
 * `ctx` and `context` are SPELLINGS, and this rule was treating them as evidence.
 *
 * ## What the census found
 *
 * After the literal and `process.pid` fixes, all 15 remaining findings over the
 * 20-repo corpus went through one branch — `readsTaintSource` — and every one was
 * a variable that merely carried a name in `DEFAULT_TAINT_ROOTS`:
 *
 *   webpack     path.resolve(context, "package.json")     the compiler's context DIRECTORY
 *   serverless  const context = dockerConfig.path || '.'  a Docker build context
 *   strapi      ctx.runtimeDir  where  (ctx: BuildContext) a build context, SO ANNOTATED
 *
 * The strapi case is the sharpest: the file says in TypeScript that the parameter
 * is a `BuildContext`, and the rule reported it because the identifier is three
 * letters long and spelled `ctx`.
 *
 * This is the defect class CLAUDE.md opens with — "A rule decides by evidence.
 * Never by a name." It evaded `lint:name-inference` because the match lives in a
 * data table rather than in a `.includes()` call, which is the documented way that
 * gate has been defeated before.
 *
 * ## The evidence required now
 *
 * For `ctx` / `context` only — the two ambiguous roots — taint requires a MEMBER
 * ACCESS naming a request surface: `.query`, `.params`, `.body`, `.request`,
 * `.headers`, `.cookies`. Koa's `ctx.query.file` has it. A bare `context` passed
 * whole to `path.resolve` does not, and neither does `ctx.runtimeDir`.
 *
 * `req`, `request` and `event` keep the old behaviour: they are not ambiguous in
 * the same way, and no measured false positive came from them.
 *
 * ## Taint as a PREFIX, with literal suffixes
 *
 * `path.join(process.env.HOME, '.terraform.d', 'credentials.tfrc.json')` — the
 * only non-literal is the BASE, and every segment after it is fixed. There is
 * nothing for a caller to steer. This is the same argument
 * `WHOLE_VALUE_TRUSTED_ROOTS` already makes for a whole-value `process`, one step
 * further along, and it is deliberately limited to those roots: an attacker who
 * picks the base directory (`path.join(req.body.dir, 'f.txt')`) picks the file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectNonLiteralFsFilename } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('detect-non-literal-fs-filename — taint needs evidence, not a spelling', () => {
  ruleTester.run('detect-non-literal-fs-filename', detectNonLiteralFsFilename, {
    valid: [
      {
        // webpack lib/config/defaults.js:1634
        name: 'webpack: `context` is the compiler directory',
        code: `import fs from 'fs';
import path from 'path';
export function read(context) {
  const pkgPath = path.resolve(context, 'package.json');
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}`,
      },
      {
        // serverless .../docker/builder.js:143-191
        name: 'serverless: `context` is a Docker build context',
        code: `import fs from 'fs/promises';
import path from 'path';
export async function build(dockerConfig, servicePath) {
  const context = dockerConfig.path || '.';
  const contextPath = path.resolve(servicePath, context);
  await fs.access(path.resolve(contextPath, 'package.json'));
}`,
      },
      {
        // strapi packages/core/strapi/src/node/staticFiles.ts:86
        name: 'strapi: `ctx` is annotated BuildContext',
        code: `import fs from 'fs/promises';
interface BuildContext { runtimeDir: string }
export async function prepare(ctx: BuildContext) {
  await fs.mkdir(ctx.runtimeDir, { recursive: true });
}`,
      },
      {
        // serverless .../terraform/terraform.js:261
        name: 'an env var as the BASE with literal segments after it',
        code: `import fs from 'fs';
import path from 'path';
export const read = () =>
  fs.readFileSync(path.join(process.env.HOME, '.terraform.d', 'credentials.tfrc.json'), 'utf-8');`,
      },
    ],
    invalid: [
      {
        // CONTROL — the corpus fixture this root exists for. Koa's ctx IS a
        // request, and it proves it by the property being read off it.
        name: 'CONTROL: koa ctx.query.file still reports',
        code: `import fs from 'fs';
export function download(ctx) {
  ctx.body = fs.readFileSync(ctx.query.file);
}`,
        errors: 1,
      },
      {
        name: 'CONTROL: ctx.request.body composed into a path still reports',
        code: `import fs from 'fs';
export function save(ctx) {
  return fs.writeFileSync('/uploads/' + ctx.request.body.name, 'x');
}`,
        errors: 1,
      },
      {
        // CONTROL — `req` is untouched by this change.
        name: 'CONTROL: req.query.file still reports',
        code: `import fs from 'fs';
export function read(req) {
  return fs.readFileSync(req.query.file);
}`,
        errors: 1,
      },
      {
        // CONTROL for the prefix rule. An attacker who picks the base directory
        // picks the file, so taint-as-prefix is safe ONLY for the trusted roots.
        name: 'CONTROL: a REQUEST as the base with literal suffixes still reports',
        code: `import fs from 'fs';
import path from 'path';
export function read(req) {
  return fs.readFileSync(path.join(req.body.dir, 'config.json'), 'utf8');
}`,
        errors: 1,
      },
      {
        // An unresolvable `ctx` — declared nowhere in the file. There is no
        // binding to scan for evidence, so the name proves nothing and the
        // free-variable rule decides: unknowable provenance reports.
        name: 'an undeclared global ctx has no evidence to find',
        code: `import fs from 'fs';
export const read = () => fs.readFileSync(ctx.runtimeDir, 'utf8');`,
        errors: 1,
      },
      {
        // The taint reaches the sink through a call that is NOT a `path.*`
        // helper, so nothing normalises it and the prefix rule does not apply.
        // Only `path.*` normalisation is recognised as leaving a whole value
        // whole. The rule cannot know what an arbitrary callee does to a string,
        // so it does not assume — `String()` happens to be identity, the next
        // wrapper may not be.
        name: 'a non-path call around an env var is not a whole value',
        code: `import fs from 'fs';
export const read = () => fs.readFileSync(String(process.env.HOME), 'utf8');`,
        errors: 1,
      },
      {
        // CONTROL — env as the base is only safe when what follows is fixed.
        name: 'CONTROL: env base with a NON-literal segment after it still reports',
        code: `import fs from 'fs';
import path from 'path';
export function read(req) {
  return fs.readFileSync(path.join(process.env.HOME, req.query.f), 'utf8');
}`,
        errors: 1,
      },
    ],
  });
});

/**
 * Taint that IS the base, versus taint that EXTENDS one.
 *
 * The lock header states the distinction for whole values: "whoever sets the
 * environment or argv of a process already chooses which files it opens; for a
 * CLI, `readFile(argv[2])` IS the feature." The composed form still reports
 * because `'/safe/' + argv[2]` lets an argument escape a base THE PROGRAM chose.
 *
 * `path.join(process.argv[2], file)` is the other way round: the invoker chose
 * the base, and the segment after it cannot escape a directory that invoker
 * already named. Both remaining real-source findings after the taint-evidence
 * fix were this shape —
 *
 *   n8n         readFileSync(join(inputDir, file))     inputDir = process.argv[2]
 *   serverless  stat(path.join(packageDir, rel))       packageDir = process.argv[2]
 *
 * The exemption applies only when EVERY taint in the path traces to a
 * whole-value-trusted root. One request-derived part anywhere and it reports.
 */
describe('detect-non-literal-fs-filename — taint as the base', () => {
  ruleTester.run('detect-non-literal-fs-filename', detectNonLiteralFsFilename, {
    valid: [
      {
        name: 'n8n: a CLI reading files out of the directory it was given',
        code: `import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
const inputDir = process.argv[2];
export const all = () => readdirSync(inputDir).map((file) => readFileSync(join(inputDir, file), 'utf8'));`,
      },
      {
        /**
         * The recursion bound, stated honestly.
         *
         * `containsUntrustedRoot` stops after 6 binding hops — without a bound,
         * `const a = b; const b = a;` recurses forever. Past that depth it
         * answers "no untrusted root found", so a request laundered through
         * SEVEN aliases keeps the invoker-base exemption and goes quiet.
         *
         * That is a known false negative and it is the price of terminating. It
         * is pinned here rather than left undiscovered: if the bound ever
         * changes, this case changes with it.
         */
        name: 'BOUND: a request seven binding hops deep is past the recursion limit',
        code: `import fs from 'fs';
import path from 'path';
export const read = (req) => {
  const a = req.query.f;
  const b = a;
  const c = b;
  const d = c;
  const e = d;
  const f = e;
  const g = f;
  return fs.readFileSync(path.join(process.argv[2], g), 'utf8');
};`,
      },
      {
        name: 'serverless: argv base with a computed relative segment',
        code: `import { stat } from 'fs/promises';
import path from 'path';
const packageDir = process.argv[2];
export const check = (from, to) => stat(path.join(packageDir, path.relative(from, to)));`,
      },
    ],
    invalid: [
      {
        // Reaches `containsUntrustedRoot` through a TEMPLATE. The base is
        // argv, so the exemption path is taken and the walk has to find the
        // request inside the interpolation to override it.
        name: 'CONTROL: argv base with a request in a template segment reports',
        code: `import fs from 'fs';
import path from 'path';
export const read = (req) => fs.readFileSync(path.join(process.argv[2], \`\${req.query.f}\`), 'utf8');`,
        errors: 1,
      },
      {
        // The same shape with a REQUEST inside the concatenation. One untrusted
        // part anywhere defeats the exemption, and it has to be found through a
        // BinaryExpression to do so.
        name: 'CONTROL: argv base with a concatenated request segment reports',
        code: `import fs from 'fs';
import path from 'path';
const baseDir = process.argv[2];
export const read = (req) => fs.readFileSync(path.join(baseDir, 'a/' + req.query.f), 'utf8');`,
        errors: 1,
      },
      {
        // CONTROL — the composed form the lock header protects. The PROGRAM
        // chose `/safe`, and argv extends it, so argv can escape it.
        name: 'CONTROL: argv extending a program-chosen base still reports',
        code: `import fs from 'fs';
import path from 'path';
export const read = () => fs.readFileSync(path.join('/safe', process.argv[2]), 'utf8');`,
        errors: 1,
      },
      {
        // CONTROL — one request-derived part anywhere defeats the exemption.
        name: 'CONTROL: an argv base with a REQUEST segment still reports',
        code: `import fs from 'fs';
import path from 'path';
const baseDir = process.argv[2];
export const read = (req) => fs.readFileSync(path.join(baseDir, req.query.f), 'utf8');`,
        errors: 1,
      },
    ],
  });
});
