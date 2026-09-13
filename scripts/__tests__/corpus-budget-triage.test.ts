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
    command?: string;
    unparsed?: Record<string, number>;
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

  // Same defect as `triage`, one field over, found on the 2026-09-13 ratchet.
  // Fourteen other `.agent/*.json` baselines carry a `command` naming what
  // regenerates them; this file did too, and `--update` dropped it. Nothing
  // reads the key, so nothing failed — the convention just quietly left the
  // one file whose own command had to be rediscovered by reading the script.
  it('names the command that regenerates it, like every other .agent baseline', () => {
    expect(budget.command).toBe('npx tsx scripts/corpus-scan.ts --update');
  });

  // `scanTarget` used to `continue` past every `fatal` message, so a file that
  // failed to PARSE reported nothing for any rule and nothing said so — 138
  // files across three targets. Every budget was computed over a corpus that
  // much smaller than it claimed, and a file that stops parsing would lower
  // counts that no rule improved.
  it('records how many files failed to parse, per target', () => {
    expect(budget.unparsed).toBeDefined();
    expect(Object.keys(budget.unparsed ?? {}).length).toBeGreaterThan(0);
    for (const [target, n] of Object.entries(budget.unparsed ?? {})) {
      expect(Number.isInteger(n), `${target} must record an integer`).toBe(
        true,
      );
      expect(n, `${target} must record a positive count`).toBeGreaterThan(0);
    }
  });

  it('counts a fatal rather than skipping it', () => {
    const source = readFileSync(SCAN, 'utf-8');
    // The regression was `if (!message.ruleId || message.fatal) continue;`.
    expect(source).not.toMatch(/message\.fatal\)\s*continue/);
    expect(source).toContain('unparsed += 1');
  });

  it('fails the gate when more files fail to parse than recorded', () => {
    const source = readFileSync(SCAN, 'utf-8');
    expect(source).toContain('unparsedRisen');
    expect(source).toContain('over.length > 0 || unparsedRisen.length > 0');
  });

  it('--update carries `command` forward instead of dropping it', () => {
    const source = readFileSync(SCAN, 'utf-8');
    expect(source).toContain(
      'budget.command ? { command: budget.command } : {}',
    );
  });
});
