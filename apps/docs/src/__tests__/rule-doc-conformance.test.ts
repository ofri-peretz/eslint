/**
 * Rule-doc conformance — eslint variant.
 *
 * Asserts every rule documentation file under `packages/eslint-plugin-*\/docs/rules/`
 * ships the canonical four-section template prescribed by `apps/docs/DOCS_QUALITY_AUDIT.md`:
 *
 *   1. Quick Summary table          (## Quick Summary)
 *   2. Examples (incorrect + correct)
 *   3. Error Message Format
 *   4. Known False Negatives
 *
 * **Tier policy (initial):** all four sections are at `'warning'` severity.
 * The `expectedFindings` count below holds today's baseline so the test passes
 * but surfaces every drift as a console warning. Ratchet to errors per-section
 * as the rule fleet conforms (lower the count, eventually flip severity).
 */

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import {
  validateRuleDocConformance,
  DEFAULT_REQUIRED_SECTIONS,
} from '../../.interlace/validators/rule-doc-conformance';

const PACKAGES_ROOT = resolve(__dirname, '..', '..', '..', '..', 'packages');

describe('rule-doc conformance (eslint plugins)', () => {
  it('records section-coverage findings for every rule doc; surfaces drift but does not yet fail CI', async () => {
    const findings = await validateRuleDocConformance({
      pluginsRoot: PACKAGES_ROOT,
      pluginPrefix: 'eslint-plugin-',
      pluginRulesSubpath: 'docs/rules',
      requiredSections: DEFAULT_REQUIRED_SECTIONS,
    });

    if (findings.length > 0) {
      // Group findings by file for a cleaner read in CI logs.
      const byFile = new Map<string, string[]>();
      for (const f of findings) {
        const list = byFile.get(f.file) ?? [];
        list.push(`[${f.severity}] ${f.message}`);
        byFile.set(f.file, list);
      }
      console.warn(
        '\nRule-doc template drift (warning-tier — does not fail CI yet):\n' +
          Array.from(byFile.entries())
            .map(([file, msgs]) => `  ${file}\n    - ${msgs.join('\n    - ')}`)
            .join('\n'),
      );
    }

    // Current contract: only 'error'-severity findings fail. The default
    // section list is all 'warning', so this passes today and lets us
    // ratchet later by flipping individual sections to 'error'.
    const errors = findings.filter((f) => f.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('exposes the validator with the canonical four-section default', () => {
    expect(DEFAULT_REQUIRED_SECTIONS.map((s) => s.id)).toEqual([
      'quick-summary',
      'examples',
      'error-message',
      'known-false-negatives',
    ]);
  });
});
