/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @interlace/eslint-formatter
 *
 * Smart ESLint formatter that groups errors by rule and supports
 * four output modes: human (terminal), compact (token-lean prose),
 * JSON (structured one-shot), and NDJSON (streaming agent loop).
 *
 * Usage:
 *   eslint -f @interlace/eslint-formatter src/
 *
 * Mode selection (via ESLINT_FORMAT_MODE env var):
 *   ESLINT_FORMAT_MODE=human   → rich terminal output (default in TTY)
 *   ESLINT_FORMAT_MODE=compact → token-lean prose (default in CI / non-TTY)
 *   ESLINT_FORMAT_MODE=json    → structured JSON for tools (summary first)
 *   ESLINT_FORMAT_MODE=ndjson  → newline-delimited JSON (agent streams)
 *   ESLINT_FORMAT_MODE=xml     → Anthropic-native XML tags (best for Claude
 *                                consumers — see https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)
 *
 * Token / cost knob:
 *   ESLINT_FORMAT_CHAR_BUDGET=N → trim lowest-priority rules until output
 *                                ≤ N characters (~N/4 tokens). Severity-
 *                                first ordering means errors survive first.
 *
 * Auto-detection:
 *   - Piped output (no TTY) → compact
 *   - CI environment         → compact
 *   - Terminal               → human
 */

import type { LintResult, FormatterContext, OutputMode, GroupedRule, LintSummary } from './types';
import { groupByRule, computeSummary } from './grouper';
import { renderHuman } from './renderers/human';
import { renderCompact } from './renderers/compact';
import { renderJSON } from './renderers/json';
import { renderNDJSON } from './renderers/ndjson';
import { renderXML } from './renderers/xml';

export type { LintResult, FormatterContext, OutputMode, GroupedRule, LintSummary } from './types';
export { groupByRule, computeSummary } from './grouper';
export { renderHuman } from './renderers/human';
export { renderCompact } from './renderers/compact';
export { renderJSON } from './renderers/json';
export { renderNDJSON } from './renderers/ndjson';
export { renderXML } from './renderers/xml';

/**
 * Resolves the output mode from environment and runtime signals.
 *
 * Priority: ESLINT_FORMAT_MODE env var > auto-detection
 */
function resolveMode(): OutputMode {
  const envMode = process.env['ESLINT_FORMAT_MODE'];
  if (envMode === 'human' || envMode === 'compact' || envMode === 'json' || envMode === 'ndjson' || envMode === 'xml') {
    return envMode;
  }

  // Auto-detection
  if (process.env['CI']) return 'compact';
  if (!process.stdout.isTTY) return 'compact';

  return 'human';
}

/**
 * Reads ESLINT_FORMAT_CHAR_BUDGET as a positive integer. Returns null
 * when unset or invalid (no truncation). Char-budget is a stable proxy
 * for token-budget: rough ratio is 1 token ≈ 4 chars across the
 * o200k_base / cl100k_base tokenizers we measure in ILB-Formatter.
 */
function resolveCharBudget(): number | null {
  const raw = process.env['ESLINT_FORMAT_CHAR_BUDGET'];
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function dispatchRender(mode: OutputMode, grouped: GroupedRule[], summary: LintSummary): string {
  switch (mode) {
    case 'json': return renderJSON(grouped, summary);
    case 'ndjson': return renderNDJSON(grouped, summary);
    case 'xml': return renderXML(grouped, summary);
    case 'compact': return renderCompact(grouped, summary);
    case 'human':
    default: return renderHuman(grouped, summary);
  }
}

/**
 * Trims the lowest-priority tail of `grouped` until the rendered output
 * fits within `charBudget`. Because the grouper sorts severity-first,
 * this peels off lowest-count warnings first, then highest-count
 * warnings, then errors — the inverse of what the LLM most needs to
 * see. A `truncationNotice` line is appended so consumers know output
 * was clipped.
 */
function applyCharBudget(
  mode: OutputMode,
  grouped: GroupedRule[],
  summary: LintSummary,
  charBudget: number,
): string {
  const working = grouped.slice();
  let output = dispatchRender(mode, working, summary);
  let truncated = 0;
  while (output.length > charBudget && working.length > 1) {
    working.pop();
    truncated++;
    output = dispatchRender(mode, working, summary);
  }
  if (truncated > 0) {
    const notice = `[truncated ${truncated} rule(s) to fit ${charBudget}-char budget]\n`;
    output = output.endsWith('\n') ? output + notice : output + '\n' + notice;
  }
  return output;
}

/**
 * ESLint formatter entry point.
 *
 * Groups violations by rule and renders in the appropriate mode.
 * This is the function ESLint calls when using `-f @interlace/eslint-formatter`.
 */
function formatter(results: LintResult[], context?: FormatterContext): string {
  const mode = resolveMode();
  const grouped = groupByRule(results, context, mode);
  const summary = computeSummary(results, grouped);

  const charBudget = resolveCharBudget();
  if (charBudget !== null) {
    return applyCharBudget(mode, grouped, summary, charBudget);
  }
  return dispatchRender(mode, grouped, summary);
}

module.exports = formatter;
