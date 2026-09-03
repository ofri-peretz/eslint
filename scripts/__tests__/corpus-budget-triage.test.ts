/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `--update` must not eat the recorded reasons.
 *
 * `.agent/corpus-findings-budget.json` carries a `triage` key holding, for
 * every budgeted rule, the answer to "why is this allowed". It is the only
 * place that answer exists. `--update` rebuilt the file from the scan totals
 * alone, so one run silently erased eight entries that had taken a day to
 * write — and because the budgets themselves were correct afterwards, nothing
 * failed and nothing warned.
 *
 * This pins both halves: every budget has a reason, and the writer carries the
 * reasons forward.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const BUDGET = path.join(ROOT, '.agent', 'corpus-findings-budget.json');
const SCAN = path.join(ROOT, 'scripts', 'corpus-scan.ts');

describe('corpus budget triage', () => {
  const budget = JSON.parse(readFileSync(BUDGET, 'utf-8')) as {
    budgets: Record<string, number>;
    triage?: Record<string, string>;
  };

  it('every budgeted rule records why it is allowed', () => {
    const unexplained = Object.entries(budget.budgets)
      .filter(([, allowed]) => allowed > 0)
      .map(([rule]) => rule)
      .filter((rule) => !budget.triage?.[rule]?.trim());
    expect(unexplained).toEqual([]);
  });

  it('--update carries `triage` forward instead of rebuilding without it', () => {
    // The regression was a fresh object literal with only $comment/generated/
    // budgets. Assert the writer still spreads the existing triage in.
    const source = readFileSync(SCAN, 'utf-8');
    expect(source).toContain('budget.triage ? { triage: budget.triage } : {}');
  });
});
