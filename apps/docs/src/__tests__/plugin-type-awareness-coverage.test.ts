/**
 * Type-awareness coverage — CI guardrail.
 *
 * Every documented rule must be classified in `.agent/type-awareness-scan.tsv`,
 * and the README rule table glyph must match the TSV. Without this gate,
 * silently adding a rule means it ships defaulting to 🟢 (type-unaware) on
 * every surface even if it's actually type-aware.
 */

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validatePluginTypeAwarenessCoverage,
  loadTypeAwarenessMap,
} from '../lib/eslint-validators/plugin-type-awareness-coverage';
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

describe('loadTypeAwarenessMap', () => {
  it('returns classified entries per plugin', () => {
    const tsvPath = resolve(MONOREPO_ROOT, '.agent', 'type-awareness-scan.tsv');
    const { byKey, rowsByPlugin } = loadTypeAwarenessMap(tsvPath);
    expect(byKey.size).toBeGreaterThan(300);
    expect(rowsByPlugin.has('reliability')).toBe(true);
    expect(rowsByPlugin.get('reliability')?.has('no-silent-errors')).toBe(true);
  });

  it('drops malformed rows silently', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ta-tsv-'));
    const path = join(dir, 'scan.tsv');
    writeFileSync(
      path,
      'plugin\trule\tstatus\tevidence\nreliability\tx\tunaware\t\n\tno-plugin\tunaware\t\nmalformed-line\nreliability\ty\tnonsense\t\n',
    );
    const { byKey } = loadTypeAwarenessMap(path);
    expect([...byKey.keys()]).toEqual(['reliability/x']);
  });
});

describe('plugin type-awareness coverage', () => {
  it('every documented rule across all 20 plugins has a TSV classification, and README glyphs match the TSV', () => {
    const plugins = loadRegistry();
    const findings = validatePluginTypeAwarenessCoverage({
      monorepoRoot: MONOREPO_ROOT,
      plugins,
    });

    if (findings.length > 0) {
      const grouped: Record<string, string[]> = {};
      for (const f of findings) {
        const key = `${f.plugin} [${f.surface}]`;
        (grouped[key] ??= []).push(f.message);
      }
      console.error(
        'Type-awareness coverage drift:\n' +
          Object.entries(grouped)
            .map(([k, msgs]) => `  ${k}\n    - ${msgs.join('\n    - ')}`)
            .join('\n'),
      );
    }

    expect(findings.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('reports tsv-missing when a documented rule has no TSV row (fixture)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ta-cov-'));
    const tsvPath = join(dir, 'scan.tsv');
    writeFileSync(tsvPath, 'plugin\trule\tstatus\tevidence\n');
    // Build a tiny fake monorepo with one rule doc and a README without markers.
    const pkgRoot = join(dir, 'packages', 'eslint-plugin-demo');
    mkdirSync(join(pkgRoot, 'docs', 'rules'), { recursive: true });
    writeFileSync(join(pkgRoot, 'docs', 'rules', 'sample.md'), '# sample\n');
    writeFileSync(join(pkgRoot, 'README.md'), '## Rules\n');

    const findings = validatePluginTypeAwarenessCoverage({
      monorepoRoot: dir,
      tsvPath,
      plugins: [{ slug: 'demo', package: 'eslint-plugin-demo', pillar: 'quality' }],
    });

    expect(findings.some((f) => f.surface === 'tsv-missing' && f.rule === 'sample')).toBe(true);
  });

  it('reports tsv-orphan when a TSV row points at a removed rule (fixture)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ta-orphan-'));
    const tsvPath = join(dir, 'scan.tsv');
    writeFileSync(tsvPath, 'plugin\trule\tstatus\tevidence\ndemo\tghost\tunaware\t\n');
    const pkgRoot = join(dir, 'packages', 'eslint-plugin-demo');
    mkdirSync(join(pkgRoot, 'docs', 'rules'), { recursive: true });
    writeFileSync(join(pkgRoot, 'README.md'), '## Rules\n');

    const findings = validatePluginTypeAwarenessCoverage({
      monorepoRoot: dir,
      tsvPath,
      plugins: [{ slug: 'demo', package: 'eslint-plugin-demo', pillar: 'quality' }],
    });

    expect(findings.some((f) => f.surface === 'tsv-orphan' && f.rule === 'ghost')).toBe(true);
  });
});
