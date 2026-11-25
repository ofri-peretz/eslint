/**
 * Rule MDX format lock — CI guardrail.
 *
 * Mirrors `rule-mdx-badge-presence.test.ts`. Walks every rule MDX page across
 * all 20 plugins and asserts the structural invariants that broke in the
 * 2026-05 dual-frontmatter regression cannot return silently:
 *
 *   - No `description: "title: <rule>"` stub.
 *   - No raw markdown in the frontmatter `description:` value.
 *   - No second `---…---` YAML block leaking into the body.
 *   - No metadata-as-prose lead paragraph (`CWE: [CWE-X](url)`, `OWASP: …`,
 *     `ESLint Rule: <name>. This rule is part of …`).
 *   - No description-duplicating lead paragraph.
 *   - Frontmatter `title:` matches the file slug.
 *   - No emoji in `title:` / `description:`: they render into the OG image,
 *     and @vercel/og fetches an emoji's glyph from a CDN during the build.
 *
 * Each failure prints the exact file + surface + message so the CI log
 * names the regression directly.
 */

import { describe, expect, it } from 'vitest';
import { resolve, join } from 'node:path';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { validateRuleMdxFormat } from '../lib/eslint-validators/rule-mdx-format';
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

/** Any emoji: pictographs, flag pairs (regional indicators) and keycaps (U+20E3). */
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u;

describe('rule MDX format lock', () => {
  it('the emoji check also catches flags and keycaps, and passes plain digits', () => {
    expect(EMOJI.test('description: "🇺🇸 only"')).toBe(true);
    expect(EMOJI.test('description: "step 1️⃣"')).toBe(true);
    expect(EMOJI.test('description: "❌ deprecated"')).toBe(true);
    expect(EMOJI.test('description: "Allow 1 to 10 imports (CWE-1047)"')).toBe(false);
  });

  it('no long rule description is cut mid-sentence by the 160-character cap', () => {
    const cut: string[] = [];
    for (const p of loadRegistry()) {
      const dir = join(MONOREPO_ROOT, 'apps', 'docs', 'content', 'docs', p.pillar, `plugin-${p.slug}`, 'rules');
      let files: string[] = [];
      try {
        files = readdirSync(dir).filter((f) => f.endsWith('.mdx'));
      } catch {
        continue;
      }
      for (const f of files) {
        const m = /^description: "(.*)"$/m.exec(readFileSync(join(dir, f), 'utf-8'));
        const d = m?.[1] ?? '';
        // The old fallback sliced at exactly 160 characters, mid-word.
        if (d.length === 160 && !/[.!?…)`]$/.test(d)) cut.push(`${p.slug}/${f}: ${d.slice(-40)}`);
      }
    }
    expect(cut).toEqual([]);
  });

  it('no rule MDX title or description carries an emoji (the OG image would fetch it)', () => {
    const offenders: string[] = [];
    for (const p of loadRegistry()) {
      const dir = join(MONOREPO_ROOT, 'apps', 'docs', 'content', 'docs', p.pillar, `plugin-${p.slug}`, 'rules');
      let files: string[] = [];
      try {
        files = readdirSync(dir).filter((f) => f.endsWith('.mdx'));
      } catch {
        continue;
      }
      for (const f of files) {
        const head = readFileSync(join(dir, f), 'utf-8').split('\n').slice(0, 10);
        for (const line of head) {
          if (/^(title|description):/.test(line) && EMOJI.test(line)) {
            offenders.push(`${p.slug}/${f}: ${line}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every rule MDX in the canonical registry passes structural invariants', () => {
    const plugins = loadRegistry();
    const findings = validateRuleMdxFormat({ monorepoRoot: MONOREPO_ROOT, plugins });

    if (findings.length > 0) {
      console.error(
        'Rule MDX format drift:\n' +
          findings
            .map((f) => `  ${f.file} [${f.surface}]\n    - ${f.message}`)
            .join('\n'),
      );
    }

    expect(findings.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('reports a finding when the frontmatter description is the templating stub (fixture)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fmt-stub-'));
    const mdxRoot = join(
      dir,
      'apps',
      'docs',
      'content',
      'docs',
      'quality',
      'plugin-demo',
      'rules',
    );
    mkdirSync(mdxRoot, { recursive: true });
    writeFileSync(
      join(mdxRoot, 'sample.mdx'),
      `---
title: sample
description: "title: sample"
type_aware: false
type_aware_status: unaware
---

import { RuleBadges } from "@/components/RuleComponents";

<RuleBadges typeAware={false} typeAwareStatus="unaware" />

Real body content here.
`,
    );

    const findings = validateRuleMdxFormat({
      monorepoRoot: dir,
      plugins: [{ slug: 'demo', package: 'eslint-plugin-demo', pillar: 'quality' }],
    });

    expect(
      findings.some(
        (f) => f.rule === 'sample' && f.surface === 'frontmatter-description-stub',
      ),
    ).toBe(true);
  });

  it('reports a finding when the body contains an orphan frontmatter block (fixture)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fmt-orphan-'));
    const mdxRoot = join(
      dir,
      'apps',
      'docs',
      'content',
      'docs',
      'quality',
      'plugin-demo',
      'rules',
    );
    mkdirSync(mdxRoot, { recursive: true });
    writeFileSync(
      join(mdxRoot, 'sample.mdx'),
      `---
title: sample
description: A real description.
type_aware: false
type_aware_status: unaware
---

import { RuleBadges } from "@/components/RuleComponents";

<RuleBadges typeAware={false} typeAwareStatus="unaware" />

---
title: sample
description: A real description.
tags: ['demo']
---

Real body content here.
`,
    );

    const findings = validateRuleMdxFormat({
      monorepoRoot: dir,
      plugins: [{ slug: 'demo', package: 'eslint-plugin-demo', pillar: 'quality' }],
    });

    expect(
      findings.some(
        (f) => f.rule === 'sample' && f.surface === 'body-orphan-frontmatter',
      ),
    ).toBe(true);
  });
});
