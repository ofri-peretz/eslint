/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * eslint-plugin-react's own test cases, run against this plugin's rules.
 *
 * `upstream-parity/<rule>.json` holds the cases of eslint-plugin-react@7.37.5
 * (`tests/lib/rules/<rule>.js`, MIT) that this plugin got wrong until it read
 * `settings.react`, accepted upstream's option shapes, or exported the rule at
 * all. Every case failed on the code before that change; they are kept as the
 * guard against going back. They are the incumbent's verdicts, not ours:
 *
 *   valid    the rule reports nothing;
 *   invalid  the rule reports exactly as many problems as upstream expects.
 *
 * Messages, positions and fixes are not compared: this plugin words its own.
 * The rule runs the way a user's config runs it, under the name `react/<rule>`
 * (what an alias install of `eslint-plugin-react` gives), through ESLint's own
 * `Linter` so a case can switch a core rule on beside it (`no-unused-vars` for
 * the `jsx-uses-*` rules) and carry its own `settings`.
 *
 * The full grade, all 11,289 upstream cases with the incumbent as control, is
 * benchmarks/suites/ilb-competitor-parity/react-drop-in.mts.
 */
import fs from 'node:fs';
import path from 'node:path';
import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import { rules } from '../../index';

type UpstreamCase = {
  kind: 'valid' | 'invalid';
  n: number;
  code: string;
  errors?: number;
  options?: unknown[];
  settings?: Record<string, unknown>;
  parser?: string;
  coreRule?: string;
  ecmaVersion: number;
  sourceType: 'module' | 'script';
  parserOptions?: Record<string, unknown>;
  globals?: Record<string, boolean>;
};

const dir = path.join(__dirname, 'upstream-parity');

describe('eslint-plugin-react test cases', () => {
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const { rule, cases } = JSON.parse(
      fs.readFileSync(path.join(dir, file), 'utf8'),
    ) as { rule: string; cases: UpstreamCase[] };

    describe(rule, () => {
      it.each(cases)('$kind #$n: $code', (c) => {
        const messages = new Linter({ configType: 'flat' }).verify(c.code, {
          files: ['**/*.js'],
          plugins: { react: { rules } },
          languageOptions: {
            ecmaVersion: c.ecmaVersion as 2018,
            sourceType: c.sourceType,
            ...(c.parser ? { parser } : {}),
            ...(c.parserOptions ? { parserOptions: c.parserOptions } : {}),
            ...(c.globals ? { globals: c.globals } : {}),
          },
          ...(c.settings ? { settings: c.settings } : {}),
          rules: {
            [`react/${rule}`]: ['error', ...(c.options ?? [])],
            ...(c.coreRule ? { [c.coreRule]: 'error' } : {}),
          },
        } as unknown as Linter.Config);

        expect(messages.filter((m) => m.fatal)).toEqual([]);
        // A core rule switched on beside the plugin's own is part of the verdict.
        const mine = messages.filter(
          (m) => c.coreRule || m.ruleId === `react/${rule}`,
        );
        expect(mine).toHaveLength(c.kind === 'valid' ? 0 : (c.errors ?? 0));
      });
    });
  }
});
