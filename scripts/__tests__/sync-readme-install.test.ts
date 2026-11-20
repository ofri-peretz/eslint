/**
 * Locks for the generated install block in scripts/sync-readme-rules.ts.
 *
 *   - the ESLint install line and a flat config that works pasted come first:
 *     `export default [configs.recommended]`, never a spread (the preset is one
 *     object, so `...` throws), in an ESM file name.
 *   - oxlint / Vite+ is a pointer to the twin package, after the ESLint setup.
 *   - the alias name, rule prefix and import identifier are derived from the package,
 *     never hand-typed.
 *   - first run replaces only the hand-written install fence; a second run is a no-op.
 *   - a README without Getting Started is left alone.
 */
import { describe, it, expect } from 'vitest';
import {
  renderLead,
  spliceGettingStartedFirst,
  spliceInstall,
  spliceSupport,
} from '../sync-readme-rules';

const pkg = 'eslint-plugin-example-security';
const readme = [
  '# eslint-plugin-example-security',
  '',
  '## Getting Started',
  '',
  '- Read the guide.',
  '',
  '```bash',
  `npm install ${pkg} --save-dev`,
  '```',
  '',
  '## Rules',
].join('\n');

describe('spliceInstall', () => {
  it('leads with the ESLint install and a working flat config, with derived names', () => {
    const { content, modified } = spliceInstall(readme, pkg);
    expect(modified).toBe(true);
    expect(content).toContain(`npm install --save-dev eslint ${pkg}`);
    expect(content).toContain('// eslint.config.mjs');
    expect(content).toContain(`import { configs } from '${pkg}';`);
    expect(content).toContain('export default [configs.recommended];');
    expect(content).not.toContain('...configs');
    const es = content.indexOf(`npm install --save-dev eslint ${pkg}`);
    const ox = content.indexOf('oxlint-plugin-example-security');
    expect(es).toBeGreaterThan(-1);
    expect(ox).toBeGreaterThan(es);
    expect(content).toContain('`example-security/<rule>`');
    expect(content).toContain('- Read the guide.');
    expect(content).toContain('## Rules');
  });

  it('is idempotent', () => {
    const once = spliceInstall(readme, pkg).content;
    expect(spliceInstall(once, pkg)).toEqual({
      content: once,
      modified: false,
    });
  });

  it('leaves a README without Getting Started alone', () => {
    const other = '# x\n\n## Usage\n';
    expect(spliceInstall(other, pkg)).toEqual({
      content: other,
      modified: false,
    });
  });

  it('refuses unpaired markers', () => {
    const broken = `${readme}\n<!-- AUTO-GENERATED:INSTALL:END -->`;
    expect(() => spliceInstall(broken, pkg)).toThrow(/unpaired/);
  });
});

describe('spliceGettingStartedFirst', () => {
  const doc = [
    '<p>logos</p>',
    '',
    '## Description',
    '',
    'what it is',
    '',
    '## Why X-specific?',
    '',
    'why',
    '',
    '## Getting Started',
    '',
    'install',
    '',
    '## Rules',
    '',
  ].join('\n');

  it('moves Getting Started above Description and leaves the rest in order', () => {
    const { content, modified } = spliceGettingStartedFirst(doc);
    expect(modified).toBe(true);
    const at = (h: string) => content.indexOf(h);
    expect(at('## Getting Started')).toBeLessThan(at('## Description'));
    expect(at('## Description')).toBeLessThan(at('## Why X-specific?'));
    expect(at('## Why X-specific?')).toBeLessThan(at('## Rules'));
    expect(content.match(/^## Getting Started$/gm)).toHaveLength(1);
  });

  it('is idempotent', () => {
    const once = spliceGettingStartedFirst(doc).content;
    expect(spliceGettingStartedFirst(once)).toEqual({
      content: once,
      modified: false,
    });
  });
});

describe('spliceSupport', () => {
  const doc = [
    '</p>',
    '',
    '> ⭐ If this plugin caught a real bug for you, star the repo.',
    '',
    '## Getting Started',
    '',
    '<!-- INTERLACE:STAR_CTA:START -->',
    '',
    '## ⭐ Support & follow',
    '',
    'old ask',
    '',
    '[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](x)',
    '',
    '<!-- INTERLACE:STAR_CTA:END -->',
    '',
  ].join('\n');

  it('drops the top banner and rewrites the footer to one Support paragraph', () => {
    const { content, modified } = spliceSupport(doc);
    expect(modified).toBe(true);
    expect(content).not.toContain('> ⭐');
    expect(content).not.toContain('github/stars');
    expect(content).toContain('## Support');
    expect(content).toContain('Open an issue');
  });

  it('is idempotent', () => {
    const once = spliceSupport(doc).content;
    expect(spliceSupport(once)).toEqual({ content: once, modified: false });
  });
});

describe('renderLead', () => {
  const result = {
    timestamp: '2026-11-19T04:45:02.099Z',
    incumbent: 'eslint-plugin-import@2.32.0',
    toolchain: { eslint: '10.14.0' },
    headline: {
      passed: 2035,
      graded: 2135,
      rules: 45,
      rulesNotImplemented: [],
    },
  };

  it('prints the grade and the date from the result, in the shape the parity lock parses', () => {
    const lead = renderLead(result);
    expect(lead).toContain(
      "passes **2,035 of 2,135** (95.3%) of `eslint-plugin-import`@2.32.0's own test cases",
    );
    expect(lead).toContain('**all 45 of its tested rules are implemented**');
    expect(lead).toContain('Measured 2026-11-19 on ESLint 10.14.0');
    expect(lead).not.toContain('benchmarks/results/ilb-import-parity');
  });

  it('names rules that are not implemented', () => {
    const lead = renderLead({
      ...result,
      headline: { ...result.headline, rulesNotImplemented: ['order'] },
    });
    expect(lead).toContain(
      '**1 of its 45 tested rules are not implemented** (`order`)',
    );
  });
});
