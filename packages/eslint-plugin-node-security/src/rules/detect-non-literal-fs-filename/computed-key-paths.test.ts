/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A computed key makes the value unknowable, however well-known the object is.
 *
 * `containsFreeVariable` recursed through templates, call arguments and `+`,
 * but had no MemberExpression case — so the KEY of `obj[k]` was never visited.
 * The result was backwards: `readFile(dir)` reported while
 * `readFile(cfg[prop])` stayed silent, even though the second is strictly more
 * opaque than the first. It was the last uncovered case on
 * eslint-plugin-security's own must-detect corpus.
 *
 * The object is deliberately NOT recursed into, and the `process.env` cases
 * below are why: ESLint resolves no Node globals by default, so `process`
 * reads as a free variable and walking the object would report every
 * `process.env.HOME` in existence. Measured over the 20-repository real-source
 * corpus — 21,394 files, 3.10M lines — this rule reports zero findings, and the
 * branch only ever adds a `true`, so zero after means zero before. The recall
 * came without noise, which is the only reason it ships.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectNonLiteralFsFilename } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { ecmaVersion: 2022, sourceType: 'module' } },
});

ruleTester.run('detect-non-literal-fs-filename — computed keys', detectNonLiteralFsFilename, {
  valid: [
    {
      // Each of these reaches a `propertyName(...) ?? ''` fallback: the member
      // is computed with a non-static key, so no name resolves. They are the
      // negative half of widening to static subscripts — the rule must not
      // treat "cannot tell" as "matches".
      name: 'a dynamic process member is not a process input',
      code: `import fs from "fs";\nexport function read(k){ return fs.readFileSync(process[k]); }`,
    },
    {
      // The other half: a genuinely dynamic method must still be silent.
      // `propertyName` returns null here, so widening to static subscripts
      // did not widen to computed-anything.
      name: 'a dynamic fs method name is not resolvable, so not reported',
      code: `import fs from "fs";\nexport function read(req, m){ return fs[m](req.query.p); }`,
    },
    {
      // A STATIC key names one fixed slot. `import.meta.url` is the module's
      // own location, not input, and it must stay quiet — this is the control
      // that proves the branch keys on `computed`, not on MemberExpression.
      name: 'a static key on import.meta is the module location',
      code: `import fs from 'fs'; export const k = fs.readFileSync(import.meta.url);`,
    },
    {
      // The object is a free variable but the key is static. Recursing into the
      // object would report this — and every `process.env.HOME` with it.
      name: 'a static key on an unresolvable object is left alone',
      code: `import fs from 'fs'; export const k = fs.readFileSync(process.env.HOME);`,
    },
    {
      // Computed, but the key is a literal — still one fixed slot.
      name: 'a computed key that is a literal is still constant',
      code: `import fs from 'fs'; const cfg = { a: './a.txt' }; export const k = fs.readFileSync(cfg['a']);`,
    },
  ],
  invalid: [
    {
      // `req.query[k]` asks `vocabularyName` about the OUTER member first,
      // whose key is dynamic, so it resolves to the sentinel and is not a
      // request surface. The walk then reaches `req.query`, which is. The
      // sentinel has to fail closed on the way past — an unresolvable key is
      // not a reason to stop looking.
      name: 'a dynamic key under a request surface still reports',
      code: `import fs from "fs";\nexport function read(req, k){ return fs.readFileSync(req.query[k]); }`,
      errors: 1,
    },
    {
      // Reaches `vocabularyName` with an unresolvable key: `req[k]` has no
      // static property, so `REQUEST_SURFACE.has('')` is false. It still
      // reports — the filename is a value read off a request-shaped
      // parameter, and not being able to name the key does not make it safe.
      // That is the right direction for the sentinel to fail in.
      name: 'a request member reached by a dynamic key still reports',
      code: `import fs from "fs";\nexport function read(req, k){ const p = req[k]; return fs.readFileSync(p); }`,
      errors: 1,
    },
    {
      // Reaches the `propertyName(callee) ?? ''` fallback on the path-method
      // check: `path[m]` resolves to no name, so it is neither `join` nor
      // `resolve`. The report still stands — the filename came off the
      // request whatever wrapped it — which is the point: failing to resolve
      // a method name must not become a reason to stay quiet.
      name: 'a request path through a dynamic path method still reports',
      code: `import fs from "fs";\nimport path from "path";\nexport function read(req, m){ return fs.readFileSync(path[m](req.query.p)); }`,
      errors: 1,
    },
    {
      // FN: `fs['readFileSync']` reaches the same function as `fs.readFileSync`
      // and went unreported — `fsMethodName` bailed on `callee.computed`
      // before it could resolve the name. A minifier writes this, and so does
      // anyone indexing by a constant.
      // @found spelling gate
      name: 'FN: an fs call reached by a string subscript',
      code: `import fs from "fs";\nexport function read(req){ return fs["readFileSync"](req.query.p); }`,
      errors: 1,
    },
    {
      // The corpus case, verbatim from eslint-plugin-security's own suite.
      name: 'a computed key on import.meta, through path.resolve',
      code: `
        import fs from 'fs';
        import path from 'path';
        export const key = fs.readFileSync(path.resolve(import.meta[prop], './index.html'));
      `,
      errors: 1,
    },
    {
      // The same shape with nothing wrapped around it.
      name: 'a computed key read directly',
      code: `import fs from 'fs'; export const k = fs.readFileSync(import.meta[prop]);`,
      errors: 1,
    },
    {
      // Not special to import.meta — any object with an unresolvable key.
      name: 'a computed key on an ordinary object',
      code: `import fs from 'fs'; export const k = fs.readFileSync(cfg[prop]);`,
      errors: 1,
    },
  ],
});
