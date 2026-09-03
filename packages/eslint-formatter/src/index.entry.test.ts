/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Layer-2 unit tests for the formatter entry point (`src/index.ts`):
 * mode resolution, char-budget resolution, render dispatch, budget
 * trimming, and the `formatter()` function ESLint invokes via `-f`.
 *
 * Env-sensitive: every test saves/restores the env vars + isTTY it touches.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as indexModule from './index';
import {
  formatter,
  resolveMode,
  resolveCharBudget,
  dispatchRender,
  applyCharBudget,
  groupByRule,
  computeSummary,
} from './index';
import { renderHuman } from './renderers/human';
import type { LintResult, FormatterContext, OutputMode } from './types';

// ---------------------------------------------------------------------------
// Env + TTY harness
// ---------------------------------------------------------------------------

const ENV_KEYS = ['ESLINT_FORMAT_MODE', 'ESLINT_FORMAT_CHAR_BUDGET', 'CI', 'NO_COLOR', 'FORCE_COLOR'] as const;
let savedEnv: Record<string, string | undefined>;
let savedIsTTY: PropertyDescriptor | undefined;

beforeEach(() => {
  savedEnv = {};
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  savedIsTTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  if (savedIsTTY) Object.defineProperty(process.stdout, 'isTTY', savedIsTTY);
  else Reflect.deleteProperty(process.stdout, 'isTTY');
});

function setTTY(value: boolean): void {
  Object.defineProperty(process.stdout, 'isTTY', { value, configurable: true });
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeResult(filePath: string, ruleId: string, severity: 1 | 2, message: string): LintResult {
  return {
    filePath,
    messages: [{ ruleId, severity, message, line: 1, column: 1, nodeType: null }],
    errorCount: severity === 2 ? 1 : 0,
    warningCount: severity === 1 ? 1 : 0,
    fixableErrorCount: 0,
    fixableWarningCount: 0,
  };
}

const context: FormatterContext = { cwd: '/project' };

const threeRuleResults: LintResult[] = [
  makeResult('/project/src/a.ts', 'rule-alpha', 2, 'alpha broke'),
  makeResult('/project/src/b.ts', 'rule-beta', 1, 'beta iffy'),
  makeResult('/project/src/c.ts', 'rule-gamma', 1, 'gamma iffy'),
];

// ---------------------------------------------------------------------------
// resolveMode
// ---------------------------------------------------------------------------

describe('resolveMode', () => {
  it.each(['human', 'compact', 'json', 'ndjson', 'xml'] as const)(
    'returns %s when ESLINT_FORMAT_MODE=%s (env var wins over auto-detection)',
    mode => {
      process.env['ESLINT_FORMAT_MODE'] = mode;
      process.env['CI'] = 'true'; // would otherwise force compact
      expect(resolveMode()).toBe(mode);
    },
  );

  it('falls through to auto-detection on an unrecognized ESLINT_FORMAT_MODE value', () => {
    process.env['ESLINT_FORMAT_MODE'] = 'stylish';
    process.env['CI'] = 'true';
    expect(resolveMode()).toBe('compact');
  });

  it('auto-detects compact when CI is set', () => {
    process.env['CI'] = '1';
    setTTY(true); // CI wins even on a TTY
    expect(resolveMode()).toBe('compact');
  });

  it('auto-detects compact when stdout is not a TTY (piped output)', () => {
    setTTY(false);
    expect(resolveMode()).toBe('compact');
  });

  it('auto-detects human on an interactive terminal (TTY, no CI)', () => {
    setTTY(true);
    expect(resolveMode()).toBe('human');
  });
});

// ---------------------------------------------------------------------------
// resolveCharBudget
// ---------------------------------------------------------------------------

describe('resolveCharBudget', () => {
  it('returns null when ESLINT_FORMAT_CHAR_BUDGET is unset', () => {
    expect(resolveCharBudget()).toBeNull();
  });

  it('returns null for an empty string', () => {
    process.env['ESLINT_FORMAT_CHAR_BUDGET'] = '';
    expect(resolveCharBudget()).toBeNull();
  });

  it('returns null for a non-numeric value', () => {
    process.env['ESLINT_FORMAT_CHAR_BUDGET'] = 'lots';
    expect(resolveCharBudget()).toBeNull();
  });

  it('returns null for zero (budget must be positive)', () => {
    process.env['ESLINT_FORMAT_CHAR_BUDGET'] = '0';
    expect(resolveCharBudget()).toBeNull();
  });

  it('returns null for a negative value', () => {
    process.env['ESLINT_FORMAT_CHAR_BUDGET'] = '-200';
    expect(resolveCharBudget()).toBeNull();
  });

  it('parses a positive integer budget', () => {
    process.env['ESLINT_FORMAT_CHAR_BUDGET'] = '4000';
    expect(resolveCharBudget()).toBe(4000);
  });
});

// ---------------------------------------------------------------------------
// dispatchRender
// ---------------------------------------------------------------------------

describe('dispatchRender', () => {
  const grouped = groupByRule(threeRuleResults, context, 'compact');
  const summary = computeSummary(threeRuleResults, grouped);

  it('routes json mode to the JSON renderer (summary-first object)', () => {
    const out = dispatchRender('json', grouped, summary);
    const parsed = JSON.parse(out) as { summary: { errors: number }; rules: unknown[] };
    expect(out.startsWith('{"summary":')).toBe(true);
    expect(parsed.summary.errors).toBe(1);
    expect(parsed.rules).toHaveLength(3);
  });

  it('routes ndjson mode to the NDJSON renderer (kind:summary line first)', () => {
    const lines = dispatchRender('ndjson', grouped, summary).trim().split('\n');
    expect(lines).toHaveLength(4); // summary + 3 rules
    expect((JSON.parse(lines[0]!) as { kind: string }).kind).toBe('summary');
  });

  it('routes xml mode to the XML renderer', () => {
    const out = dispatchRender('xml', grouped, summary);
    expect(out.startsWith('<lint_report>')).toBe(true);
    expect(out).toContain('<rule>rule-alpha</rule>');
  });

  it('routes compact mode to the compact renderer', () => {
    const out = dispatchRender('compact', grouped, summary);
    expect(out).toContain('ERR rule-alpha ×1 — alpha broke @ src/a.ts:1');
    expect(out.trim().split('\n')).toHaveLength(4); // 3 rules + summary line
  });

  it('routes human mode to the human renderer', () => {
    const out = dispatchRender('human', grouped, summary);
    expect(out).toBe(renderHuman(grouped, summary));
    expect(out).toContain('rule-alpha');
  });

  it('defaults to the human renderer for an out-of-union mode value', () => {
    const out = dispatchRender('yaml' as OutputMode, grouped, summary);
    expect(out).toBe(renderHuman(grouped, summary));
  });
});

// ---------------------------------------------------------------------------
// applyCharBudget
// ---------------------------------------------------------------------------

describe('applyCharBudget', () => {
  const grouped = groupByRule(threeRuleResults, context, 'compact');
  const summary = computeSummary(threeRuleResults, grouped);

  it('returns the full render untouched when it already fits the budget', () => {
    const full = dispatchRender('compact', grouped, summary);
    const out = applyCharBudget('compact', grouped, summary, 100_000);
    expect(out).toBe(full);
    expect(out).not.toContain('[truncated');
  });

  it('peels lowest-priority rules off the tail until the output fits, then appends a notice', () => {
    const full = dispatchRender('compact', grouped, summary);
    const budget = full.length - 1; // force at least one trim
    const out = applyCharBudget('compact', grouped, summary, budget);

    // The error rule (highest priority, sorted first) must survive.
    expect(out).toContain('rule-alpha');
    // The tail rule (lowest-priority warning, ruleId tie-break) is dropped first.
    expect(out).not.toContain('rule-gamma');
    expect(out).toContain(`[truncated 1 rule(s) to fit ${budget}-char budget]`);
    // Compact output ends with \n → the notice is appended without an extra blank line.
    expect(out).not.toContain('\n\n[truncated');
  });

  it('inserts a newline before the notice when the render does not end with one (json)', () => {
    const full = dispatchRender('json', grouped, summary);
    expect(full.endsWith('\n')).toBe(false);
    const out = applyCharBudget('json', grouped, summary, full.length - 1);
    expect(out).toMatch(/\}\n\[truncated 1 rule\(s\)/);
  });

  it('never trims below one rule, even when that rule alone exceeds the budget', () => {
    const single = grouped.slice(0, 1);
    const singleSummary = computeSummary(threeRuleResults.slice(0, 1), single);
    const full = dispatchRender('compact', single, singleSummary);
    const out = applyCharBudget('compact', single, singleSummary, 1);
    // Loop exits on working.length > 1 — output unchanged, no notice.
    expect(out).toBe(full);
    expect(out.length).toBeGreaterThan(1);
  });

  it('can trim multiple rules and reports the exact count', () => {
    const out = applyCharBudget('compact', grouped, summary, 60);
    expect(out).toContain('[truncated 2 rule(s) to fit 60-char budget]');
    expect(out).toContain('rule-alpha');
    expect(out).not.toContain('rule-beta');
    expect(out).not.toContain('rule-gamma');
  });
});

// ---------------------------------------------------------------------------
// formatter() — the function ESLint calls
// ---------------------------------------------------------------------------

describe('formatter entry point', () => {
  it('is assigned to module.exports (what ESLint require()s via -f)', () => {
    // `module.exports = formatter` is the published CJS contract. Under
    // the test runner's CJS interop that assignment lands on the module's
    // `default` binding — assert it points at the same function.
    const def = (indexModule as unknown as { default: unknown }).default;
    expect(typeof def).toBe('function');
    expect(def).toBe(formatter);
  });

  it('renders json when ESLINT_FORMAT_MODE=json (no budget → straight dispatch)', () => {
    process.env['ESLINT_FORMAT_MODE'] = 'json';
    const parsed = JSON.parse(formatter(threeRuleResults, context)) as {
      summary: { errors: number; warnings: number; rules: number };
    };
    expect(parsed.summary).toEqual({ errors: 1, warnings: 2, files: 3, fixable: 0, rules: 3 });
  });

  it('renders xml when ESLINT_FORMAT_MODE=xml', () => {
    process.env['ESLINT_FORMAT_MODE'] = 'xml';
    const out = formatter(threeRuleResults, context);
    expect(out).toContain('<lint_report>');
    expect(out).toContain('<rule>rule-beta</rule>');
  });

  it('applies the char budget when ESLINT_FORMAT_CHAR_BUDGET is set', () => {
    process.env['ESLINT_FORMAT_MODE'] = 'compact';
    process.env['ESLINT_FORMAT_CHAR_BUDGET'] = '60';
    const out = formatter(threeRuleResults, context);
    expect(out).toContain('[truncated 2 rule(s) to fit 60-char budget]');
    expect(out).toContain('rule-alpha'); // severity-first: the error survives
  });

  it('ignores an invalid char budget and renders the full output', () => {
    process.env['ESLINT_FORMAT_MODE'] = 'compact';
    process.env['ESLINT_FORMAT_CHAR_BUDGET'] = 'unlimited';
    const out = formatter(threeRuleResults, context);
    expect(out).not.toContain('[truncated');
    expect(out).toContain('rule-gamma');
  });

  it('works without a context argument (cwd-less: absolute paths pass through)', () => {
    process.env['ESLINT_FORMAT_MODE'] = 'compact';
    const out = formatter(threeRuleResults);
    expect(out).toContain('/project/src/a.ts:1');
  });
});

// ---------------------------------------------------------------------------
// types.ts is type-only; import it at runtime so its (empty) module body
// is executed and the file participates in coverage honestly.
// ---------------------------------------------------------------------------

describe('types module', () => {
  it('has no runtime exports (pure type declarations)', async () => {
    const mod = await import('./types');
    expect(Object.keys(mod)).toEqual([]);
  });
});
