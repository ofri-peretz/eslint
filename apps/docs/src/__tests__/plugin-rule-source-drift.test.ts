/**
 * Plugin rule-source drift — CI guardrail.
 *
 * Locks the failure mode that hit `/docs/quality/plugin-reliability/rules` in
 * 2026-05: the README rule table listed category folder names instead of
 * actual rules, the docs site fetched it, and the page rendered dead links.
 *
 * For every plugin in the canonical registry, this test asserts the rule
 * name set is identical across:
 *   - src/index.ts (canonical)
 *   - docs/rules/<rule>.md
 *   - README.md auto-generated rules table
 *   - apps/docs/content/docs/<pillar>/plugin-<slug>/rules/<rule>.mdx
 *   - meta.json pages
 *
 * Drift is an `error`-severity finding from day one — every divergence fails CI.
 * To address a failure, run the regenerators referenced in the validator's
 * `message` field.
 */

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  validatePluginRuleSourceDrift,
  extractCanonicalRuleNames,
  extractReadmeRuleNames,
  type PluginEntry,
} from '../lib/eslint-validators/plugin-rule-source-drift';

const MONOREPO_ROOT = resolve(__dirname, '..', '..', '..', '..');

function loadRegistry(): PluginEntry[] {
  const src = readFileSync(
    resolve(MONOREPO_ROOT, 'apps', 'docs', 'src', 'lib', 'plugins.ts'),
    'utf-8',
  );
  const arrayMatch = src.match(/export const PLUGINS:[^=]*=\s*\[([\s\S]*?)\];/);
  if (!arrayMatch) throw new Error('plugins.ts shape changed');
  const entries: PluginEntry[] = [];
  const blockRegex =
    /\{\s*slug:\s*['"]([^'"]+)['"][\s\S]*?package:\s*['"]([^'"]+)['"][\s\S]*?pillar:\s*['"]([^'"]+)['"]/g;
  for (const m of arrayMatch[1].matchAll(blockRegex)) {
    entries.push({ slug: m[1], package: m[2], pillar: m[3] as 'security' | 'quality' });
  }
  return entries;
}

describe('extractCanonicalRuleNames', () => {
  it('parses the `rules` object keys and drops categorized aliases', () => {
    const src = `
      export const rules = {
        'no-silent-errors': noSilentErrors,
        'no-await-in-loop': noAwaitInLoop,
        // Categorized form — should be dropped:
        'error-handling/no-silent-errors': noSilentErrors,
      } satisfies Record<string, unknown>;
    `;
    const names = extractCanonicalRuleNames(src);
    expect(names).toEqual(['no-await-in-loop', 'no-silent-errors']);
  });
});

describe('extractReadmeRuleNames', () => {
  it('returns the rule names between AUTO-GENERATED markers', () => {
    const readme = `
## Rules

<!-- AUTO-GENERATED:RULES_TABLE:START -->
| Rule | CWE |
| :--- | :---: |
| [no-silent-errors](https://example.com) |  |
| [require-network-timeout](https://example.com) |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
## Related
`;
    const result = extractReadmeRuleNames(readme);
    expect(result.hasMarkers).toBe(true);
    expect(result.found).toEqual(['no-silent-errors', 'require-network-timeout']);
  });

  it('flags missing markers explicitly', () => {
    const result = extractReadmeRuleNames('## Rules\n\nNo markers here.\n');
    expect(result.hasMarkers).toBe(false);
    expect(result.found).toEqual([]);
  });
});

describe('plugin rule-source drift across the canonical registry', () => {
  it('every plugin has identical rule names across src/index.ts, docs/rules, README, MDX, and meta.json', () => {
    const plugins = loadRegistry();
    expect(plugins.length).toBe(19);

    const findings = validatePluginRuleSourceDrift({
      monorepoRoot: MONOREPO_ROOT,
      plugins,
      exceptions: {
        // The `componentApi` preset rules are opt-in (NOT in `recommended`) and
        // are intentionally omitted from the README rules table by
        // sync-readme-rules.ts. They remain fully documented elsewhere — source
        // docs at docs/rules/component-api/<rule>.md, plus MDX + meta.json — so
        // the only legitimate divergence is their absence from the README.
        'react-features': {
          readme: [
            'no-arbitrary-token-class',
            'no-default-test-id',
            'no-inline-style',
            'no-is-prefix-prop',
            'no-kind-prop-discriminator',
            'no-raw-color-literal',
            'no-wrapper-sub-component',
            'require-data-slot',
          ],
        },
      },
    });

    if (findings.length > 0) {
      // Group findings by plugin for a tighter CI log.
      const grouped: Record<string, string[]> = {};
      for (const f of findings) {
        const key = `${f.plugin} [${f.surface}]`;
        (grouped[key] ??= []).push(f.message);
      }
      const summary = Object.entries(grouped)
        .map(([k, msgs]) => `  ${k}\n    - ${msgs.join('\n    - ')}`)
        .join('\n');
      console.error('Plugin rule-source drift:\n' + summary);
    }

    expect(findings.filter((f) => f.severity === 'error')).toEqual([]);
  });
});
