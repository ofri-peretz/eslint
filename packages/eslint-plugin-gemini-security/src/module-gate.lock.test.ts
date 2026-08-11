/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: no rule in this plugin reports in a file that does not use
 * Gemini.
 *
 * It reported nothing off-SDK across the 107-repository corpus, but its
 * hand-written rule had no gate, so nothing stopped it from doing so. "Did not
 * happen to fire" is not "cannot".
 *
 * Written over the whole rule registry rather than per rule, so a rule added
 * later is covered the day it lands: it will fail here until it is gated too.
 * Revert the gate in any single rule and this test goes red.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import plugin from './index';

const RULES = Object.keys(plugin.rules);

/** The SDK import that is the whole difference between the two halves below. */
const SDK = "import { GoogleGenerativeAI } from '@google/generative-ai';";

/**
 * A real violation of `no-disabled-safety-settings`. It appears twice on purpose: once
 * without the import (must be silent) and once with it (must report). One
 * fixture proving both directions is what stops this suite passing with the
 * gate shut on everything.
 */
const VIOLATION = `const cfg = { safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }] };`;

/** Files that use no Gemini at all. */
const NON_SDK_SOURCES: ReadonlyArray<readonly [string, string]> = [
  ['the violation itself, minus the import', VIOLATION],
  [
    'a plain helper',
    `export function parse(s: string) {
       try { return JSON.parse(s); } catch { return null; }
     }`,
  ],
  [
    'a React component',
    `export default function Panel({ items }) {
       return items.map((i) => i.name).join(', ');
     }`,
  ],
  [
    'a config module',
    `export const config = { token: process.env.API_TOKEN, retries: 3 };`,
  ],
];

const lint = (code: string, rule: string): Linter.LintMessage[] => {
  // `configType: 'flat'` because a bare `new Linter()` still defaults to
  // eslintrc on the declared ESLint floor, which would ignore the config below
  // and skip every rule — a suite that passes having run nothing.
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: parser as unknown as Linter.Parser,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      },
      plugins: { g: plugin as unknown as Linter.Plugin },
      rules: { [`g/${rule}`]: 'error' },
    },
    // Without a filename the Linter lints `<input>`, which matches no `files`
    // entry — every rule skipped, every negative below vacuously true.
    'sample.ts',
  );
};

describe('Gemini module gate', () => {
  it('the registry is non-empty, so the sweep below is not vacuous', () => {
    expect(RULES.length).toBeGreaterThan(0);
  });

  describe.each(NON_SDK_SOURCES)('%s', (_name, code) => {
    it.each(RULES)('%s reports nothing', (rule) => {
      const messages = lint(code, rule);
      // A parse or config error also yields zero *rule* findings, so it is
      // asserted away rather than counted as a pass.
      expect(messages.filter((m) => !m.ruleId)).toHaveLength(0);
      expect(messages.map((m) => m.ruleId)).toEqual([]);
    });
  });

  describe('positive control — the gate must open for real Gemini code', () => {
    it('the same violation reports once the file imports the SDK', () => {
      expect(lint(`${SDK}\n${VIOLATION}`, 'no-disabled-safety-settings').length).toBeGreaterThan(0);
    });

    it('and is silent with the import removed', () => {
      expect(lint(VIOLATION, 'no-disabled-safety-settings')).toHaveLength(0);
    });
  });
});
