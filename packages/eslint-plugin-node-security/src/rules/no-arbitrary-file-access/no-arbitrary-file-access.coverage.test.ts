/**
 * Coverage-gap tests for no-arbitrary-file-access (dual-layer doctrine, Layer 1).
 * Targets: the startsWith-guard analyzer (cached validation, direct throw /
 * return consequents, empty / non-guard blocks, enclosing-if validation) and
 * the path-argument shape guards.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noArbitraryFileAccess } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-arbitrary-file-access coverage gaps', () => {
  ruleTester.run('no-arbitrary-file-access', noArbitraryFileAccess, {
    // Every case below carries a call site feeding the parameter from `req`,
    // so the ONLY difference between the valid and invalid halves is the
    // startsWith guard under test. Without that call site the valid cases
    // would pass for the wrong reason — provenance unresolved — and the guard
    // they exist to exercise would never run.
    valid: [
      // A dynamic fs method names nothing, so it is neither a read nor a write
      // this rule knows — the sentinel must fail closed.
      {
        name: 'a dynamic fs method is neither a read nor a write',
        code: "const fs = require('fs'); function f(m, req) { return fs[m](req.query.p); }",
      },
      // Declarator without initializer → tracking guard returns early
      { code: "let pending;\nfs.readFileSync('/etc/hosts');" },
      // The guards below are separator-anchored (`base + path.sep`): a bare
      // `startsWith(base)` is the prefix bug (`/safebad` passes `/safe`) and no
      // longer counts as a guard (PR #1126 review).
      // Guard validates once; the second fs call hits the validated cache
      {
        code: [
          'function readTwice(userPath, base, data) {',
          "  if (!userPath.startsWith(base + path.sep)) throw new Error('outside');",
          '  fs.readFile(userPath);',
          '  fs.writeFile(userPath, data);',
          '}',
          'readTwice(req.query.p, base, data);',
        ].join('\n'),
      },
      // Direct ReturnStatement consequent guard
      {
        code: [
          'function readOnce(userPath, base) {',
          '  if (!userPath.startsWith(base + path.sep)) return null;',
          '  return fs.readFile(userPath);',
          '}',
          'readOnce(req.query.p, base);',
        ].join('\n'),
      },
      // fs call INSIDE an if whose test validates the variable via startsWith
      {
        code: [
          'function readIf(userPath, base) {',
          '  if (userPath.startsWith(base + path.sep)) {',
          '    fs.readFile(userPath);',
          '  }',
          '}',
          'readIf(req.query.p, base);',
        ].join('\n'),
      },
      // Path argument is a call expression → no identifier/member analysis
      { code: 'fs.readFile(getPath());' },
      // Member path whose object is not a user-input source
      { code: 'fs.readFile(config.path);' },
    ],
    invalid: [
      // Unrelated if in the same block → guard text check fails
      {
        code: [
          'function f(userPath) {',
          '  if (flag) { doThing(); }',
          '  fs.readFile(userPath);',
          '}',
          'f(req.query.p);',
        ].join('\n'),
        errors: [{ messageId: 'violationDetected' }],
      },
      // startsWith if whose consequent block is NOT a throw/return guard
      {
        code: [
          'function f(userPath, base) {',
          '  if (!userPath.startsWith(base)) { log(); }',
          '  fs.readFile(userPath);',
          '}',
          'f(req.query.p, base);',
        ].join('\n'),
        errors: [{ messageId: 'violationDetected' }],
      },
      // startsWith if with an EMPTY consequent block → guard rejected
      {
        code: [
          'function f(userPath, base) {',
          '  if (!userPath.startsWith(base)) {}',
          '  fs.readFile(userPath);',
          '}',
          'f(req.query.p, base);',
        ].join('\n'),
        errors: [{ messageId: 'violationDetected' }],
      },
      // fs call inside an if with an unrelated test → enclosing-if check fails
      {
        code: [
          'function f(userPath) {',
          '  if (flag) { fs.readFile(userPath); }',
          '}',
          'f(req.query.p);',
        ].join('\n'),
        errors: [{ messageId: 'violationDetected' }],
      },
      // startsWith guard for a DIFFERENT variable → varName operand false
      {
        code: [
          'function f(userPath, other, base) {',
          '  if (other.startsWith(base)) { fs.readFile(userPath); }',
          '}',
          'f(req.query.p, other, base);',
        ].join('\n'),
        errors: [{ messageId: 'violationDetected' }],
      },
      // ── FN sealed 2026-09-16, from the burgee FP/FN sweep ───────────────
      // `readsUserInput` dispatched on `node.type` and fell through to
      // `default: return false` for every TS type wrapper, so a cast anywhere
      // on the tainted operand blanked the rule — including on the bare
      // whole-value form, which is this rule's own ❌ Incorrect shape.
      // Assertions are erased at compile time; the runtime is byte-identical
      // to the controls above.
      {
        // @found rule review
        name: 'FN: `as string` on the request value still reports',
        code: `export function h(req: any) { return fs.readFileSync('/data/' + (req.query.f as string)); }`,
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        // @found rule review
        name: 'FN: a cast on the whole path value still reports',
        code: `export function h(req: any) { return fs.readFileSync(req.query.f as string); }`,
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  });
});
