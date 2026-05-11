/**
 * Rule MDX badge-presence — CI guardrail.
 *
 * Asserts every rule MDX page across all 20 plugins carries the type-aware
 * frontmatter fields AND the `<RuleBadges>` JSX node, so the indicator never
 * silently vanishes from a rule page after a future generator change.
 */

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateRuleMdxBadgePresence,
} from '../lib/eslint-validators/rule-mdx-badge-presence';
import type { PluginEntry } from '../lib/eslint-validators/plugin-rule-source-drift';

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

describe('rule MDX badge presence', () => {
  it('every rule MDX in the canonical registry carries the type-aware badge data', () => {
    const plugins = loadRegistry();
    const findings = validateRuleMdxBadgePresence({
      monorepoRoot: MONOREPO_ROOT,
      plugins,
    });

    if (findings.length > 0) {
      console.error(
        'Rule MDX badge presence drift:\n' +
          findings.map((f) => `  ${f.file} [${f.surface}]\n    - ${f.message}`).join('\n'),
      );
    }

    expect(findings.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('reports a finding when the frontmatter is missing the type_aware field (fixture)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'badge-'));
    const mdxRoot = join(dir, 'apps', 'docs', 'content', 'docs', 'quality', 'plugin-demo', 'rules');
    mkdirSync(mdxRoot, { recursive: true });
    writeFileSync(
      join(mdxRoot, 'sample.mdx'),
      `---
title: "sample"
description: "desc"
---

import { RuleBadges } from "@/components/RuleComponents";

<RuleBadges typeAware={false} typeAwareStatus="unaware" />
`,
    );

    const findings = validateRuleMdxBadgePresence({
      monorepoRoot: dir,
      plugins: [{ slug: 'demo', package: 'eslint-plugin-demo', pillar: 'quality' }],
    });

    expect(
      findings.some((f) => f.rule === 'sample' && f.surface === 'frontmatter-type_aware'),
    ).toBe(true);
  });

  it('reports a finding when the <RuleBadges> JSX is missing (fixture)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'badge-'));
    const mdxRoot = join(dir, 'apps', 'docs', 'content', 'docs', 'quality', 'plugin-demo', 'rules');
    mkdirSync(mdxRoot, { recursive: true });
    writeFileSync(
      join(mdxRoot, 'sample.mdx'),
      `---
title: "sample"
description: "desc"
type_aware: false
type_aware_status: unaware
---

Body without the badge component.
`,
    );

    const findings = validateRuleMdxBadgePresence({
      monorepoRoot: dir,
      plugins: [{ slug: 'demo', package: 'eslint-plugin-demo', pillar: 'quality' }],
    });

    expect(
      findings.some((f) => f.rule === 'sample' && f.surface === 'rule-badges-jsx'),
    ).toBe(true);
  });
});
