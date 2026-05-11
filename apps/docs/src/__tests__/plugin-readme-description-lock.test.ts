/**
 * Plugin README description lock — CI guardrail.
 *
 * Asserts every `packages/eslint-plugin-{slug}/README.md` carries the
 * canonical per-plugin description from `tools/scripts/fix-readmes.js`'s
 * DESCRIPTIONS map, and that no non-security plugin ships the
 * "Security-focused ESLint plugin." fallback string. Pins the regression
 * surfaced on `/docs/quality/plugin-reliability` in 2026-05.
 */

import { describe, expect, it } from 'vitest';
import { resolve, join } from 'node:path';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { validatePluginReadmeDescription } from '../lib/eslint-validators/plugin-readme-description';
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

describe('plugin README description lock', () => {
  it('every registered plugin README aligns with the DESCRIPTIONS map', () => {
    const plugins = loadRegistry();
    const findings = validatePluginReadmeDescription({
      monorepoRoot: MONOREPO_ROOT,
      plugins,
    });

    if (findings.length > 0) {
      console.error(
        'Plugin README description drift:\n' +
          findings
            .map((f) => `  ${f.file} [${f.surface}]\n    - ${f.message}`)
            .join('\n'),
      );
    }

    expect(findings.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('reports a fallback-copy finding for non-security plugin with the security tagline (fixture)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'readme-lock-'));

    // Stub fix-readmes.js with a complete DESCRIPTIONS map — fixture targets
    // *only* the fallback-copy surface, not the missing-entry one.
    const toolsDir = join(dir, 'tools', 'scripts');
    mkdirSync(toolsDir, { recursive: true });
    writeFileSync(
      join(toolsDir, 'fix-readmes.js'),
      `const DESCRIPTIONS = {
    'eslint-plugin-demo': 'Demo plugin description.'
};
`,
    );

    // Stub the README with the *legitimate* canonical line but also the
    // forbidden fallback string elsewhere — catches the regression where
    // the right description sits at the top but the wrong tagline leaks
    // into another section.
    const pkgDir = join(dir, 'packages', 'eslint-plugin-demo');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      join(pkgDir, 'README.md'),
      `# Demo

## Description

This plugin provides Demo plugin description.

Security-focused ESLint plugin.
`,
    );

    const findings = validatePluginReadmeDescription({
      monorepoRoot: dir,
      plugins: [{ slug: 'demo', package: 'eslint-plugin-demo', pillar: 'quality' }],
    });

    expect(
      findings.some(
        (f) => f.package === 'eslint-plugin-demo' && f.surface === 'readme-fallback-copy',
      ),
    ).toBe(true);
  });
});
