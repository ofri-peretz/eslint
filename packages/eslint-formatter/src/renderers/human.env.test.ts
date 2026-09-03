/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Env-driven branches of the human renderer: palette selection
 * (LIGHT_THEME / COLORFGBG — resolved once at module load, hence the
 * vi.resetModules + dynamic import dance), color enablement
 * (NO_COLOR / FORCE_COLOR / TTY), and the remaining per-rule render
 * branches (suggestions, CWE without CVSS, singular/plural summary).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { GroupedRule, LintSummary } from '../types';

const ESC = String.fromCharCode(27);
const GRAY_DARK = `${ESC}[90m`;
const GRAY_LIGHT = `${ESC}[38;5;240m`;
const RED = `${ESC}[31m`;

const ENV_KEYS = ['NO_COLOR', 'FORCE_COLOR', 'LIGHT_THEME', 'COLORFGBG'] as const;
let savedEnv: Record<string, string | undefined>;
let savedIsTTY: PropertyDescriptor | undefined;

beforeEach(() => {
  savedEnv = {};
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  savedIsTTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  vi.resetModules();
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

/** Re-import the module so the module-level palette pick re-runs under the current env. */
async function loadRenderHuman() {
  const mod = await import('./human');
  return mod.renderHuman;
}

function rule(overrides: Partial<GroupedRule>): GroupedRule {
  return {
    ruleId: 'demo-rule',
    severity: 'error',
    count: 1,
    fixable: false,
    hasSuggestions: false,
    locations: [{ file: 'src/a.ts', line: 1, column: 2 }],
    ...overrides,
  };
}

function summaryOf(overrides: Partial<LintSummary>): LintSummary {
  return {
    totalFiles: 1,
    filesWithIssues: 1,
    errorCount: 1,
    warningCount: 0,
    fixableCount: 0,
    uniqueRules: 1,
    topRules: [],
    ...overrides,
  };
}

const oneError = [rule({})];
const oneErrorSummary = summaryOf({});

describe('palette selection (module-load time)', () => {
  it('uses the dark palette by default (8-bit gray for locations)', async () => {
    process.env['FORCE_COLOR'] = '1';
    const renderHuman = await loadRenderHuman();
    const out = renderHuman(oneError, oneErrorSummary);
    expect(out).toContain(`${GRAY_DARK}src/a.ts:1:2`);
    expect(out).toContain(RED); // error severity painted red
    expect(out).not.toContain(GRAY_LIGHT);
  });

  it('switches to the light palette when LIGHT_THEME=1', async () => {
    process.env['FORCE_COLOR'] = '1';
    process.env['LIGHT_THEME'] = '1';
    const renderHuman = await loadRenderHuman();
    const out = renderHuman(oneError, oneErrorSummary);
    expect(out).toContain(`${GRAY_LIGHT}src/a.ts:1:2`);
    expect(out).not.toContain(GRAY_DARK);
  });

  it('stays dark when LIGHT_THEME=0 (explicit opt-out)', async () => {
    process.env['FORCE_COLOR'] = '1';
    process.env['LIGHT_THEME'] = '0';
    const renderHuman = await loadRenderHuman();
    expect(renderHuman(oneError, oneErrorSummary)).toContain(GRAY_DARK);
  });

  it('detects a light background from COLORFGBG (bg=15)', async () => {
    process.env['FORCE_COLOR'] = '1';
    process.env['COLORFGBG'] = '0;15';
    const renderHuman = await loadRenderHuman();
    expect(renderHuman(oneError, oneErrorSummary)).toContain(GRAY_LIGHT);
  });

  it('treats a dark background from COLORFGBG (bg=0) as dark', async () => {
    process.env['FORCE_COLOR'] = '1';
    process.env['COLORFGBG'] = '15;0';
    const renderHuman = await loadRenderHuman();
    expect(renderHuman(oneError, oneErrorSummary)).toContain(GRAY_DARK);
  });

  it('treats bg=8 (bright black) as dark', async () => {
    process.env['FORCE_COLOR'] = '1';
    process.env['COLORFGBG'] = '7;8';
    const renderHuman = await loadRenderHuman();
    expect(renderHuman(oneError, oneErrorSummary)).toContain(GRAY_DARK);
  });

  it('falls back to dark when COLORFGBG is unparseable', async () => {
    process.env['FORCE_COLOR'] = '1';
    process.env['COLORFGBG'] = 'default;default';
    const renderHuman = await loadRenderHuman();
    expect(renderHuman(oneError, oneErrorSummary)).toContain(GRAY_DARK);
  });
});

describe('color enablement', () => {
  it('disables color when NO_COLOR is set, even on a TTY', async () => {
    process.env['NO_COLOR'] = '1';
    setTTY(true);
    const renderHuman = await loadRenderHuman();
    const out = renderHuman(oneError, oneErrorSummary);
    expect(out).not.toContain(ESC);
    expect(out).toContain('demo-rule');
  });

  it('enables color on a TTY with neither NO_COLOR nor FORCE_COLOR set', async () => {
    setTTY(true);
    const renderHuman = await loadRenderHuman();
    expect(renderHuman(oneError, oneErrorSummary)).toContain(RED);
  });

  it('disables color when piped (no TTY, no FORCE_COLOR)', async () => {
    setTTY(false);
    const renderHuman = await loadRenderHuman();
    expect(renderHuman(oneError, oneErrorSummary)).not.toContain(ESC);
  });

  it('paints the clean-run message when color is forced', async () => {
    process.env['FORCE_COLOR'] = '1';
    const renderHuman = await loadRenderHuman();
    const out = renderHuman([], summaryOf({ filesWithIssues: 0, errorCount: 0, uniqueRules: 0 }));
    expect(out).toContain('No lint issues found');
    expect(out).toContain(`${ESC}[36m`); // cyan
  });
});

describe('per-rule render branches (color off)', () => {
  it('tags a suggestions-only rule with "(has suggestions)" and prints the first 💡 description', async () => {
    const renderHuman = await loadRenderHuman();
    const out = renderHuman([rule({
      hasSuggestions: true,
      locations: [
        { file: 'src/a.ts', line: 1, column: 1, suggestions: [{ desc: 'Use === here' }, { desc: 'second (never shown)' }] },
      ],
    })], oneErrorSummary);
    expect(out).toContain('(has suggestions)');
    expect(out).toContain('💡 Use === here');
    expect(out).not.toContain('second (never shown)');
  });

  it('suppresses "(has suggestions)" when the rule is also autofixable', async () => {
    const renderHuman = await loadRenderHuman();
    const out = renderHuman([rule({
      fixable: true,
      hasSuggestions: true,
      locations: [{ file: 'src/a.ts', line: 1, column: 1, suggestions: [{ desc: 'Prefer const' }] }],
    })], oneErrorSummary);
    expect(out).toContain('(fixable)');
    expect(out).not.toContain('(has suggestions)');
    expect(out).toContain('💡 Prefer const'); // the 💡 line still renders
  });

  it('skips the 💡 line when hasSuggestions is set but no retained location carries one', async () => {
    // The grouper caps locations; the occurrence with the suggestion can
    // fall past the cap — hasSuggestions stays true, locations carry none.
    const renderHuman = await loadRenderHuman();
    const out = renderHuman([rule({
      hasSuggestions: true,
      count: 7,
      locations: [
        { file: 'src/a.ts', line: 1, column: 1 },
        { file: 'src/a.ts', line: 2, column: 1, suggestions: [] },
      ],
    })], oneErrorSummary);
    expect(out).not.toContain('💡');
    expect(out).toContain('... and 5 more');
  });

  it('renders a CWE tag without CVSS when meta declares only the CWE', async () => {
    const renderHuman = await loadRenderHuman();
    const out = renderHuman([rule({ cwe: 'CWE-79' })], oneErrorSummary);
    expect(out).toContain('[CWE-79]');
    expect(out).not.toContain('CVSS');
  });

  it('emits no detail line when the rule has neither message nor description', async () => {
    const renderHuman = await loadRenderHuman();
    const out = renderHuman([rule({})], oneErrorSummary);
    const lines = out.split('\n');
    const headerIdx = lines.findIndex(l => l.includes('demo-rule'));
    // Header is immediately followed by the location line — no detail line between.
    expect(lines[headerIdx + 1]).toContain('src/a.ts:1:2');
  });

  it('uses singular forms for exactly one error / one file / one rule', async () => {
    const renderHuman = await loadRenderHuman();
    const out = renderHuman(oneError, oneErrorSummary);
    expect(out).toContain('1 error across 1 file (1 rule)');
    expect(out).not.toContain('errors');
    expect(out).not.toContain('warning');
  });

  it('renders a warnings-only summary (no error segment) with fixable hint', async () => {
    const renderHuman = await loadRenderHuman();
    const out = renderHuman(
      [rule({ severity: 'warning', count: 2 })],
      summaryOf({ errorCount: 0, warningCount: 2, fixableCount: 2 }),
    );
    expect(out).toContain('⚠');
    expect(out).toContain('2 warnings across 1 file (1 rule)');
    expect(out).not.toContain('error');
    expect(out).toContain('2 fixable with --fix');
  });
});
