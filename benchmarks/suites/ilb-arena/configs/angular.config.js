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
 * next one if upstream adds it, and the reason the count is asserted below
 * rather than assumed.
 */

import angular from "@angular-eslint/eslint-plugin";

/** Rules that need a TypeScript program. Measured 2026-09-06, plugin 22.1.0. */
const NEEDS_TYPE_PROGRAM = new Set([
  "no-developer-preview",
  "no-experimental",
  "no-uncalled-signals",
]);

const runnable = Object.keys(angular.rules).filter(
  (rule) => !NEEDS_TYPE_PROGRAM.has(rule),
);

// If upstream adds another type-aware rule, this throws at config load —
// which the runner turns into a refusal to score, not a silent zero. A
// surprise here is the signal to re-run the bisect, not to widen the set.
const expected = Object.keys(angular.rules).length - NEEDS_TYPE_PROGRAM.size;
if (runnable.length !== expected) {
  throw new Error(
    `angular.config: expected ${expected} runnable rules, got ${runnable.length}`,
  );
}

export default [
  {
    files: ["**/*.js"],
    plugins: {
      "@angular-eslint": angular,
    },
    rules: Object.fromEntries(
      runnable.map((rule) => [`@angular-eslint/${rule}`, "warn"]),
    ),
  },
];
