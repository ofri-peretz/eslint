/**
 * ESLint Configuration for @angular-eslint/eslint-plugin
 * Angular best practices — 2.25M+ weekly downloads
 *
 * Three of its 50 rules need a TypeScript program and throw "requires type
 * information" against this corpus, which is plain .js with no project. That
 * threw the whole run, and before run failures became fatal it scored the
 * plugin a silent 0/40 — a fabricated measurement (#897).
 *
 * They are listed BY NAME because they cannot be found any other way:
 * `requiresTypeChecking` is set on 0 of the 50 rules, so metadata filtering
 * finds nothing to filter. The list came from running each rule alone against
 * the corpus and recording which threw — the same method that will find the
 * next one if upstream adds it, and the reason the shape is asserted below
 * rather than assumed.
 */

import angular from '@angular-eslint/eslint-plugin';

/**
 * Rules that need a TypeScript program. Bisected 2026-09-06 against 22.1.0 and
 * re-checked against 22.2.0, which the lockfile installs: identical rule names,
 * same 50, `requiresTypeChecking` still on none of them.
 */
const NEEDS_TYPE_PROGRAM = new Set([
  'no-developer-preview',
  'no-experimental',
  'no-uncalled-signals',
]);

/** Rule count in 22.1.0 and 22.2.0 alike. */
const MEASURED_RULE_TOTAL = 50;

const all = Object.keys(angular.rules);

// Two assertions, because they catch opposite things and neither implies the
// other. A surprise from either is the signal to re-run the per-rule bisect,
// not to widen the set — and both throw at config load, which the runner turns
// into a refusal to score rather than a silent zero.
//
// (1) The total. `runnable.length` is DEFINED as total − |set ∩ rules|, so
// comparing it against total − |set| is arithmetic that cancels: an upstream
// rule we have never seen passes it unnoticed, gets enabled, throws at lint
// time, and lands the plugin in "crashed". Pinning the total is what actually
// notices a rule arriving or leaving.
if (all.length !== MEASURED_RULE_TOTAL) {
  throw new Error(
    `angular.config: measured ${MEASURED_RULE_TOTAL} rules, upstream now has ${all.length}. Re-run the per-rule bisect.`,
  );
}

// (2) The names. A rename keeps the total at 50 while leaving a dead entry
// here and a live type-aware rule enabled.
const stale = [...NEEDS_TYPE_PROGRAM].filter((rule) => !all.includes(rule));
if (stale.length > 0) {
  throw new Error(
    `angular.config: no longer published by the plugin: ${stale.join(', ')}. Re-run the per-rule bisect.`,
  );
}

const runnable = all.filter((rule) => !NEEDS_TYPE_PROGRAM.has(rule));

export default [
  {
    files: ['**/*.js'],
    plugins: {
      '@angular-eslint': angular,
    },
    rules: Object.fromEntries(
      runnable.map((rule) => [`@angular-eslint/${rule}`, 'warn']),
    ),
  },
];
