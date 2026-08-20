/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Every spelling that reaches the RegExp intrinsic, driven through BOTH rules.
 *
 * This resolver exists because the two regex rules disagreed about which
 * spellings count, so a case that only proves one of them is not proof. Each
 * shape here is asserted against `detect-non-literal-regexp` and
 * `no-redos-vulnerable-regex` together.
 *
 * The three additions on 2026-08-19 came from an adversarial wave, not from the
 * corpus — the fixtures contain none of them:
 *
 *     const { RegExp: R } = globalThis; new R(p)
 *     class My extends RegExp {}; new My(p)
 *     Reflect.construct(RegExp, [p])
 *
 * All three compile a pattern at runtime, and all three were silent.
 */
import { describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';
import { detectNonLiteralRegexp } from '../rules/detect-non-literal-regexp/index';
import { noRedosVulnerableRegex } from '../rules/no-redos-vulnerable-regex/index';

const linter = new Linter({ configType: 'flat' });

/** Reports from one rule, with an unlinted file treated as an error rather than a pass. */
const reports = (rule: unknown, code: string): number => {
  const messages = linter.verify(
    code,
    [
      {
        files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
        languageOptions: { parser: tsParser as never, ecmaVersion: 2022 as const, sourceType: 'module' as const },
        plugins: { p: { rules: { r: rule as never } } },
        rules: { 'p/r': 'error' as const },
      },
    ],
    'probe.ts',
  );
  const unmatched = messages.find((m) => /No matching configuration/.test(m.message));
  if (unmatched) throw new Error(`probe.ts was never linted: ${unmatched.message}`);
  const fatal = messages.find((m) => m.fatal);
  if (fatal) throw new Error(`probe did not parse: ${fatal.message}`);
  return messages.length;
};

// A pattern `recheck` calls exponential, so no-redos has something to find.
// Each spelling is written twice rather than rewritten by regex: the first
// attempt substituted into the code string and turned `function h(p)` into
// `function h('(x+x+)+y')`, so every no-redos row failed on a syntax error and
// looked like seven findings instead of one broken harness.
const EVIL = "'(x+x+)+y'";

describe('reaching the RegExp intrinsic', () => {
  const spellings: [string, string, string][] = [
    ['the plain constructor', `export function h(p) { return new RegExp(p); }`, `export const r = new RegExp(${EVIL});`],
    ['the call form', `export function h(p) { return RegExp(p); }`, `export const r = RegExp(${EVIL});`],
    ['a captured native binding', `const R = RegExp; export function h(p) { return new R(p); }`, `const R = RegExp; export const r = new R(${EVIL});`],
    ['a global namespace', `export function h(p) { return new globalThis.RegExp(p); }`, `export const r = new globalThis.RegExp(${EVIL});`],
    ['destructured from a global namespace', `const { RegExp: R } = globalThis; export function h(p) { return new R(p); }`, `const { RegExp: R } = globalThis; export const r = new R(${EVIL});`],
    ['a subclass of the intrinsic', `class My extends RegExp {} export function h(p) { return new My(p); }`, `class My extends RegExp {} export const r = new My(${EVIL});`],
    ['Reflect.construct', `export function h(p) { return Reflect.construct(RegExp, [p]); }`, `export const r = Reflect.construct(RegExp, [${EVIL}]);`],
  ];

  it.each(spellings)('detect-non-literal-regexp sees %s', (_name, dynamic) => {
    expect(reports(detectNonLiteralRegexp, dynamic)).toBeGreaterThan(0);
  });

  it.each(spellings)('no-redos-vulnerable-regex sees %s', (_name, _dynamic, evil) => {
    expect(reports(noRedosVulnerableRegex, evil)).toBeGreaterThan(0);
  });

  // The negative paths of the two spellings added above. Each is a shape a
  // reader could mistake for the real one, and each must NOT be treated as the
  // intrinsic — a resolver that says yes here reports code compiling nothing.
  const notTheIntrinsic: [string, string][] = [
    ['destructured from a non-global object', `const bag = { RegExp: String }; const { RegExp: R } = bag; export function h(p) { return new R(p); }`],
    ['destructured from a call result', `const { RegExp: R } = getSandbox(); export function h(p) { return new R(p); }`],
    ['a different key destructured from globalThis', `const { Function: R } = globalThis; export function h(p) { return new R(p); }`],
    ['Reflect.construct of something else', `export function h(p) { return Reflect.construct(Date, [p]); }`],
    ['Reflect.construct with a spread argument list', `export function h(p, args) { return Reflect.construct(RegExp, args); }`],
    ['a local Reflect', `const Reflect = { construct: (c, a) => new c(...a) }; export function h(p) { return Reflect.construct(String, [p]); }`],
  ];

  it.each(notTheIntrinsic)('stays silent on %s', (_name, code) => {
    expect(reports(detectNonLiteralRegexp, code)).toBe(0);
  });

  it('does not treat a local binding named RegExp as the intrinsic', () => {
    // The control the whole resolver exists for: a parameter that shadows the
    // name compiles nothing.
    expect(reports(detectNonLiteralRegexp, `export function h(RegExp, p) { return new RegExp(p); }`)).toBe(0);
  });

  it('does not treat a subclass of something else as the intrinsic', () => {
    expect(reports(detectNonLiteralRegexp, `class Other {} class My extends Other {} export function h(p) { return new My(p); }`)).toBe(0);
  });
});
