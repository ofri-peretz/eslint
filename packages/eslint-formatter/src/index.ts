/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @interlace/eslint-formatter
 *
 * Smart ESLint formatter that groups errors by rule and supports
 * three output modes: human (terminal), compact (token-lean), and
 * JSON (structured for tools).
 *
 * Usage:
 *   eslint -f @interlace/eslint-formatter src/
 *
 * Mode selection (via ESLINT_FORMAT_MODE env var):
 *   ESLINT_FORMAT_MODE=human   → rich terminal output (default)
 *   ESLINT_FORMAT_MODE=compact → token-lean prose
 *   ESLINT_FORMAT_MODE=json    → structured JSON for agents
 *
 * Auto-detection:
 *   - Piped output (no TTY) → compact
 *   - CI environment         → compact
 *   - Terminal               → human
 */

import type { LintResult, FormatterContext, OutputMode } from './types';
import { groupByRule, computeSummary } from './grouper';
import { renderHuman } from './renderers/human';
import { renderCompact } from './renderers/compact';
import { renderJSON } from './renderers/json';

export type { LintResult, FormatterContext, OutputMode, GroupedRule, LintSummary } from './types';
export { groupByRule, computeSummary } from './grouper';
export { renderHuman } from './renderers/human';
export { renderCompact } from './renderers/compact';
export { renderJSON } from './renderers/json';

/**
 * Resolves the output mode from environment and runtime signals.
 *
 * Priority: ESLINT_FORMAT_MODE env var > auto-detection
 */
function resolveMode(): OutputMode {
  const envMode = process.env['ESLINT_FORMAT_MODE'];
  if (envMode === 'human' || envMode === 'compact' || envMode === 'json') {
    return envMode;
  }

  // Auto-detection
  if (process.env['CI']) return 'compact';
  if (!process.stdout.isTTY) return 'compact';

  return 'human';
}

/**
 * ESLint formatter entry point.
 *
 * Groups violations by rule and renders in the appropriate mode.
 * This is the function ESLint calls when using `-f @interlace/eslint-formatter`.
 */
function formatter(results: LintResult[], context?: FormatterContext): string {
  const mode = resolveMode();
  const grouped = groupByRule(results, context);
  const summary = computeSummary(results, grouped);

  switch (mode) {
    case 'json':
      return renderJSON(grouped, summary);
    case 'compact':
      return renderCompact(grouped, summary);
    case 'human':
    default:
      return renderHuman(grouped, summary);
  }
}

module.exports = formatter;
