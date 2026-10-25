/**
 * Every rule declares where it runs, and the declaration matches the evidence.
 *
 * `meta.interop.runtimes` is what tells an oxlint or Vite+ user whether a rule
 * behaves there as it does on ESLint (INTEROP_PHILOSOPHY.md). A missing value
 * is a rule nobody has measured; a value that disagrees with the evidence is a
 * claim the tests do not back. Both fail here.
 *
 * The evidence and the rule live in scripts/lib/oxlint-runtimes.mts: oxlint
 * only for a rule that is not type-aware and whose own suite passed on oxlint's
 * RuleTester (`.agent/oxlint-runtime-survey.json`). A rule that claims oxlint
 * is then held to it on every test run by vitest.dual-rule-tester.ts.
 *
 * See docs/intents/oxlint-native-plugin-names (R11).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadEvidence,
  nativeEquivalents,
  runtimesFor,
} from '../lib/oxlint-runtimes.mts';

const ROOT = path.resolve(__dirname, '../..');
const evidence = loadEvidence(ROOT);
const natives = nativeEquivalents(ROOT);
const plugins = fs
  .readdirSync(path.join(ROOT, 'packages'))
  .filter((dir) => dir.startsWith('eslint-plugin-'))
  .sort();

type Rule = {
  meta?: {
    interop?: { runtimes?: readonly string[]; nativeEquivalent?: string };
  };
};

describe('meta.interop.runtimes', () => {
  it('finds the plugins (guards against a broken glob)', () => {
    expect(plugins.length).toBeGreaterThan(20);
  });

  it.each(plugins)(
    '%s: every rule declares runtimes the evidence backs',
    async (dir) => {
      // The scripts vitest config aliases each plugin to its src/index.ts.
      const { rules } = (await import(dir)) as { rules: Record<string, Rule> };
      const wrong = Object.entries(rules).flatMap(([id, rule]) => {
        const declared = rule.meta?.interop?.runtimes;
        const { runtimes, reason } = runtimesFor(evidence, `${dir}/${id}`);
        if (!declared)
          return [
            `${id}: no meta.interop.runtimes (evidence says [${runtimes.join(', ')}])`,
          ];
        return JSON.stringify(declared) === JSON.stringify(runtimes)
          ? []
          : [
              `${id}: declares [${declared.join(', ')}], evidence says [${runtimes.join(', ')}] — ${reason}`,
            ];
      });
      // nativeEquivalent: from docs/oxlint-builtin-overlap.json `equivalent`
      // rows. Resolved per rule OBJECT — legacy alias IDs share one meta.
      const short = dir.replace(/^eslint-plugin-/, '');
      const expectedNative = new Map<Rule, string | undefined>();
      for (const [id, rule] of Object.entries(rules)) {
        const native = natives.get(`${short}/${id}`);
        if (native || !expectedNative.has(rule))
          expectedNative.set(rule, native);
      }
      for (const [id, rule] of Object.entries(rules)) {
        const declared = rule.meta?.interop?.nativeEquivalent;
        const expected = expectedNative.get(rule);
        if (declared !== expected) {
          wrong.push(
            `${id}: nativeEquivalent is ${declared ?? 'absent'}, the overlap triage says ${expected ?? 'none'}`,
          );
        }
      }
      expect(wrong).toEqual([]);
    },
  );
});
