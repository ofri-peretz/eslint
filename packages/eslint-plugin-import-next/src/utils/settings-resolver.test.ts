/**
 * eslint-plugin-import's node-resolver settings, honoured by the rules that
 * resolve: `import/resolver: { node: { extensions, paths } }` and the older
 * `import/resolve: { extensions, paths }`.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { nodeResolverSettings, resolveWithSettings } from './settings-resolver';

const ROOT = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'settings-resolver-')),
);
for (const [rel, text] of Object.entries({
  'app/foo.js': '',
  'app/bar.js': '',
  'app/bar.jsx': '',
  'alt/in-alt-root.js': '',
})) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), text);
}
const FILE = path.join(ROOT, 'app/foo.js');
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

describe('nodeResolverSettings', () => {
  it('reads import/resolver.node', () => {
    expect(
      nodeResolverSettings({
        'import/resolver': { node: { extensions: ['.jsx'], paths: ['x'] } },
      }),
    ).toEqual({ extensions: ['.jsx'], paths: ['x'] });
  });

  it('reads node out of an array of resolvers', () => {
    expect(
      nodeResolverSettings({
        'import/resolver': [
          'typescript',
          { node: { extensions: ['.jsx', '.js'] } },
        ],
      }),
    ).toEqual({ extensions: ['.jsx', '.js'], paths: undefined });
  });

  it('falls back to the older import/resolve key', () => {
    expect(
      nodeResolverSettings({ 'import/resolve': { paths: ['y'] } }),
    ).toEqual({ extensions: undefined, paths: ['y'] });
  });

  it('ignores a resolver named by string, and values that are not string lists', () => {
    expect(nodeResolverSettings({ 'import/resolver': 'node' })).toEqual({
      extensions: undefined,
      paths: undefined,
    });
    expect(
      nodeResolverSettings({
        'import/resolver': { typescript: {} },
        'import/resolve': { extensions: '.js', paths: [1] },
      }),
    ).toEqual({ extensions: undefined, paths: undefined });
    expect(nodeResolverSettings({ 'import/resolve': ['x'] })).toEqual({
      extensions: undefined,
      paths: undefined,
    });
  });
});

describe('resolveWithSettings', () => {
  it('tries the configured extensions in their order', () => {
    expect(resolveWithSettings('./bar', FILE, {})).toBe(
      path.join(ROOT, 'app/bar.js'),
    );
    expect(
      resolveWithSettings('./bar', FILE, {
        'import/resolve': { extensions: ['.jsx', '.js'] },
      }),
    ).toBe(path.join(ROOT, 'app/bar.jsx'));
  });

  it('a rule option naming extensions wins over the settings', () => {
    expect(
      resolveWithSettings(
        './bar',
        FILE,
        { 'import/resolve': { extensions: ['.jsx'] } },
        ['.js'],
      ),
    ).toBe(path.join(ROOT, 'app/bar.js'));
  });

  it('looks a bare specifier up in the configured paths', () => {
    expect(resolveWithSettings('in-alt-root', FILE, {})).toBeNull();
    expect(
      resolveWithSettings('in-alt-root', FILE, {
        'import/resolver': {
          node: { paths: [path.join(ROOT, 'missing'), path.join(ROOT, 'alt')] },
        },
      }),
    ).toBe(path.join(ROOT, 'alt/in-alt-root.js'));
  });

  it('never looks a relative specifier up in the paths', () => {
    expect(
      resolveWithSettings('./in-alt-root', FILE, {
        'import/resolve': { paths: [path.join(ROOT, 'alt')] },
      }),
    ).toBeNull();
  });
});
