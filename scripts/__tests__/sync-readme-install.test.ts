/**
 * Locks for the generated install block in scripts/sync-readme-rules.ts.
 *
 *   - oxlint / Vite+ comes first, ESLint second (INTEROP_PHILOSOPHY: oxlint primary,
 *     ESLint the compatibility floor).
 *   - the alias name and rule prefix are derived from the package, never hand-typed.
 *   - first run replaces only the hand-written install fence; a second run is a no-op.
 *   - a README without Getting Started is left alone.
 */
import { describe, it, expect } from 'vitest';
import { spliceInstall } from '../sync-readme-rules';

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
  it('puts oxlint / Vite+ before ESLint, with derived names', () => {
    const { content, modified } = spliceInstall(readme, pkg);
    expect(modified).toBe(true);
    const ox = content.indexOf('npm install oxlint-plugin-example-security');
    const es = content.indexOf(`npm install ${pkg}`);
    expect(ox).toBeGreaterThan(-1);
    expect(es).toBeGreaterThan(ox);
    expect(content).toContain('`example-security/<rule>`');
    expect(content).toContain("jsPlugins: ['oxlint-plugin-example-security']");
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
