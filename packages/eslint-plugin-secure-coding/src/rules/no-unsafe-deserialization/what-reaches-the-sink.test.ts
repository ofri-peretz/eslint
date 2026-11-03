/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * What the rule counts as untrusted, and which callees it counts as sinks.
 *
 * Each case pins one decision the rule makes on the way to a finding — where
 * untrusted data comes from (a request, a parameter, a fetched body, a file),
 * how it travels (concatenation, templates, helper calls, bindings), and which
 * callees are the sink rather than something spelled like it. Written against
 * the surviving mutants of a Stryker run: every case here fails on at least one
 * mutated build of the rule.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noUnsafeDeserialization } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const EVAL = [{ messageId: 'dangerousEvalUsage' as const, suggestions: 1 }];
const UNSAFE = [{ messageId: 'unsafeDeserialization' as const }];
const YAML = [{ messageId: 'unsafeYamlParsing' as const }];

ruleTester.run(
  'no-unsafe-deserialization — what reaches the sink',
  noUnsafeDeserialization,
  {
    valid: [
      // ── what is NOT untrusted ───────────────────────────────────────────
      {
        name: 'a binding reassigned to a constant is not tainted by the assignment',
        code: "let code = '1 + 1'; code = '2 + 2'; eval(code);",
      },
      {
        name: 'arithmetic on request data yields a number, which eval cannot run as code',
        code: 'export const f = (req) => eval(req.body.count * 2);',
      },
      {
        name: 'concatenating two constants is not untrusted',
        code: "eval('1' + '2');",
      },
      {
        name: 'a method on a module table the file never taints is not untrusted',
        code: "const SNIPPETS = new Map(); eval(SNIPPETS.get('warmup'));",
      },
      {
        name: 'a helper fed only constants returns nothing untrusted',
        code: "eval(format('%d', 1));",
      },
      {
        name: 'a property of a module constant is not request data',
        code: "const CONFIG = { code: '1' }; eval(CONFIG.code);",
      },
      {
        name: 'a constant read inside a function is not that function’s parameter',
        code: "export function f(input) { const C = '1'; eval(C); return input; }",
      },
      // ── what is NOT the sink ────────────────────────────────────────────
      {
        name: 'a locally declared function spelled like a deserializer is the program’s own',
        code: 'const deserialize = (s) => s.trim(); export const f = (req) => deserialize(req.body);',
      },
      {
        name: 'super.deserialize chains to the parent class, not to a library sink',
        code: 'export class A extends B { m(req) { return super.deserialize(req.body); } }',
      },
      {
        name: 'an eval method on an object that is not the global object is that object’s method',
        code: 'export const f = (req) => math.eval(req.body.expr);',
      },
      {
        name: 'JSON.parse stays exempt even when dangerousFunctions lists parse',
        code: 'export const f = (req) => JSON.parse(req.body);',
        options: [{ dangerousFunctions: ['parse'] }],
      },
      {
        name: 'an arrow-function deserialize member of an object literal is a deserializer implementation',
        code: "import serialize from 'node-serialize'; export const codec = { deserialize: (s) => serialize.unserialize(s) };",
      },
      // ── js-yaml options ──────────────────────────────────────────────────
      {
        name: 'a safe schema still pins the loader when other options sit beside it',
        code: "import yaml from 'js-yaml'; export const f = (req) => yaml.load(req.body, { filename: 'upload.yml', schema: yaml.JSON_SCHEMA });",
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: "FP: a quoted 'schema' key pins the loader like a bare one",
        code: "import yaml from 'js-yaml'; export const f = (req) => yaml.load(req.body, { 'schema': yaml.JSON_SCHEMA });",
      },
    ],
    invalid: [
      // ── where untrusted data comes from ─────────────────────────────────
      {
        name: 'a binding declared from request data carries the taint to eval',
        code: 'const code = req.body.code; eval(code);',
        errors: EVAL,
      },
      {
        name: 'a fetched response body is untrusted even from a constant URL',
        code: "export async function f() { const res = await fetch('https://cdn.example/x.js'); eval(await res.text()); }",
        errors: EVAL,
      },
      {
        name: 'file contents read inline are untrusted',
        code: "import fs from 'node:fs'; eval(fs.readFileSync('./plugin.js', 'utf8'));",
        errors: EVAL,
      },
      {
        name: 'a function-expression parameter is untrusted',
        code: 'export const run = function (code) { eval(code); };',
        errors: EVAL,
      },
      {
        name: 'an arrow-function parameter is untrusted',
        code: 'export const run = (code) => eval(code);',
        errors: EVAL,
      },
      {
        name: 'any one parameter is enough, not only a sole one',
        code: 'export function run(code, options) { eval(code); return options; }',
        errors: EVAL,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a parameter with a default value is still a parameter',
        code: "export function run(code = '') { eval(code); }",
        errors: EVAL,
      },
      // ── how it travels ───────────────────────────────────────────────────
      {
        name: 'one untrusted part of a template is enough',
        code: 'export const f = (req) => eval(`${req.body.code};${1}`);',
        errors: EVAL,
      },
      {
        name: 'one untrusted argument taints a helper’s result',
        code: "export const f = (req) => eval(build(req.body.code, 'x'));",
        errors: EVAL,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: request data spread into a helper taints its result',
        code: 'export const f = (req) => eval(join(...req.body.parts));',
        errors: EVAL,
      },
      {
        name: 'a variable named like a deserializer that holds a call result is not an implementation',
        code: 'export function handler(req) { const unserialize = eval(req.body.code); return unserialize; }',
        errors: EVAL,
      },
      // ── which callees are sinks ──────────────────────────────────────────
      {
        name: 'a resolved node-serialize sink reports even when dangerousFunctions omits its name',
        code: "import { unserialize } from 'node-serialize'; export const f = (req) => unserialize(req.body);",
        options: [{ dangerousFunctions: ['eval'] }],
        errors: UNSAFE,
      },
      {
        name: 'a resolved v8.deserialize sink reports even when dangerousFunctions omits its name',
        code: "import v8 from 'node:v8'; export const f = (req) => v8.deserialize(req.body);",
        options: [{ dangerousFunctions: ['eval'] }],
        errors: UNSAFE,
      },
      {
        name: 'one dynamic argument is enough for an always-unsafe sink',
        code: "import { unserialize } from 'node-serialize'; const blob = getBlob(); unserialize(blob, '');",
        errors: UNSAFE,
      },
      // ── js-yaml options ──────────────────────────────────────────────────
      {
        name: 'an options object without a schema leaves the loader a sink',
        code: "import yaml from 'js-yaml'; export const f = (req) => yaml.load(req.body, { filename: 'upload.yml' });",
        errors: YAML,
      },
      {
        name: 'a spread options object names no schema',
        code: "import yaml from 'js-yaml'; export const f = (req, opts) => yaml.load(req.body, { ...opts });",
        errors: YAML,
      },
      {
        name: 'a schema named JSON_SCHEMA from another module is not js-yaml’s',
        code: "import yaml from 'js-yaml'; import { JSON_SCHEMA } from './schemas'; export const f = (req) => yaml.load(req.body, { schema: JSON_SCHEMA });",
        errors: YAML,
      },
      {
        name: 'a schema the file builds itself is not a known-safe js-yaml schema',
        code: "import yaml from 'js-yaml'; const JSON_SCHEMA = makeSchema(); export const f = (req) => yaml.load(req.body, { schema: JSON_SCHEMA });",
        errors: YAML,
      },
    ],
  },
);

ruleTester.run(
  'no-unsafe-deserialization — timers and module paths',
  noUnsafeDeserialization,
  {
    valid: [
      {
        name: 'a numeric timer handler compiles a number; later arguments are passed, never evaluated',
        code: 'export const f = (req) => setTimeout(0, req.body.code);',
      },
    ],
    invalid: [
      {
        name: 'a sink invoked through .call is still the sink',
        code: "import yaml from 'js-yaml'; export const f = (req) => yaml.load.call(yaml, req.body);",
        errors: YAML,
      },
    ],
  },
);
