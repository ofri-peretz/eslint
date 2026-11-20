/**
 * eslint-plugin-import's resolver settings, honoured by the rules that
 * resolve: the `import/resolver` chain, tried in order (`node: { extensions,
 * paths }`, `typescript`, others), and the older `import/resolve: {
 * extensions, paths }`.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  namesUnmodelledResolver,
  resolverChain,
  resolveWithSettings,
} from './settings-resolver';

const ROOT = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'settings-resolver-')),
);
for (const [rel, text] of Object.entries({
  'app/foo.js': '',
  'app/bar.js': '',
  'app/bar.jsx': '',
  'alt/in-alt-root.js': '',
  'app/only.js': '',
  'app/only.mts': '',
  'ws/packages/pkg-a/src/lib/x.js': '',
  'ws/packages/pkg-a/src/main.js': '',
  'ws/packages/README.md': '',
  'ws/shared/s.js': '',
})) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), text);
}
const FILE = path.join(ROOT, 'app/foo.js');
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

describe('resolverChain', () => {
  it('reads import/resolver.node', () => {
    expect(
      resolverChain({
        'import/resolver': { node: { extensions: ['.jsx'], paths: ['x'] } },
      }),
    ).toEqual([{ kind: 'node', extensions: ['.jsx'], paths: ['x'] }]);
  });

  it('keeps the configured order: an object by its keys, an array by its entries', () => {
    expect(
      resolverChain({
        'import/resolver': {
          node: { extensions: ['.ts'] },
          typescript: true,
          webpack: { config: 'w.js' },
        },
      }).map((s) => s.kind),
    ).toEqual(['node', 'typescript', 'other']);
    expect(
      resolverChain({
        'import/resolver': [
          'typescript',
          null,
          { 'eslint-import-resolver-node': { extensions: ['.jsx', '.js'] } },
        ],
      }),
    ).toEqual([
      {
        kind: 'typescript',
        extensions: ['.ts', '.tsx', '.d.ts', '.js', '.jsx', '.json', '.node'],
      },
      { kind: 'node', extensions: ['.jsx', '.js'], paths: undefined },
    ]);
  });

  it("a typescript resolver's own extensions win over its defaults", () => {
    expect(
      resolverChain({
        'import/resolver': { typescript: { extensions: ['.mts'] } },
      }),
    ).toEqual([{ kind: 'typescript', extensions: ['.mts'] }]);
  });

  it('reads the older import/resolve key only without import/resolver', () => {
    expect(resolverChain({ 'import/resolve': { paths: ['y'] } })).toEqual([
      { kind: 'node', extensions: undefined, paths: ['y'] },
    ]);
    expect(
      resolverChain({
        'import/resolver': { typescript: {} },
        'import/resolve': { paths: ['y'] },
      }).map((s) => s.kind),
    ).toEqual(['typescript']);
  });

  it('a resolver named by string, values that are not string lists, and nothing usable', () => {
    expect(resolverChain({ 'import/resolver': 'node' })).toEqual([
      { kind: 'node', extensions: undefined, paths: undefined },
    ]);
    expect(
      resolverChain({ 'import/resolve': { extensions: '.js', paths: [1] } }),
    ).toEqual([{ kind: 'node', extensions: undefined, paths: undefined }]);
    for (const resolver of [{}, [], 42]) {
      expect(resolverChain({ 'import/resolver': resolver })).toEqual([
        { kind: 'other' },
      ]);
    }
  });

  it('drops a resolver approximated the same way as one before it', () => {
    expect(
      resolverChain({ 'import/resolver': ['webpack', 'doesnt-exist'] }),
    ).toEqual([{ kind: 'other' }]);
  });

  it('is computed once per settings object', () => {
    const settings = { 'import/resolver': { typescript: true } };
    expect(resolverChain(settings)).toBe(resolverChain(settings));
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

describe('the resolver chain', () => {
  const chain = {
    'import/resolver': {
      node: { extensions: ['.ts', '.json'] },
      typescript: true,
    },
  };

  it('node misses, typescript resolves: the first file found wins', () => {
    expect(resolveWithSettings('./only', FILE, chain)).toBe(
      path.join(ROOT, 'app/only.js'),
    );
  });

  it('a rule option naming extensions applies to every resolver', () => {
    expect(resolveWithSettings('./only', FILE, chain, ['.mts'])).toBe(
      path.join(ROOT, 'app/only.mts'),
    );
  });

  it("node's defaults, when given, for a node resolver that names none", () => {
    expect(
      resolveWithSettings(
        './only',
        FILE,
        { 'import/resolver': 'node' },
        undefined,
        ['.mts'],
      ),
    ).toBe(path.join(ROOT, 'app/only.mts'));
  });

  it('nothing resolves: null after the last resolver', () => {
    expect(resolveWithSettings('./missing', FILE, chain)).toBeNull();
  });
});

/**
 * eslint-import-resolver-custom-alias: an `alias` prefix becomes its folder,
 * relative to the workspace package the file is in when `packages` names one,
 * else to the working directory; the rest resolves with its `extensions`.
 */
describe('custom-alias', () => {
  const main = path.join(ROOT, 'ws/packages/pkg-a/src/main.js');

  it('a prefix, relative to the package the file is in', () => {
    expect(
      resolveWithSettings('@lib/x', main, {
        'import/resolver': {
          'eslint-import-resolver-custom-alias': {
            alias: { '@lib': './src/lib' },
            packages: [
              path.join(ROOT, 'ws/packages/*'),
              path.join(ROOT, 'ws/missing/*'),
            ],
          },
        },
      }),
    ).toBe(path.join(ROOT, 'ws/packages/pkg-a/src/lib/x.js'));
  });

  it('a prefix that is the whole specifier, and a packages entry with no glob', () => {
    expect(
      resolveWithSettings('@s', main, {
        'import/resolver': {
          'custom-alias': {
            alias: { '@s': path.join(ROOT, 'ws/shared/s') },
            packages: [path.join(ROOT, 'ws/packages')],
          },
        },
      }),
    ).toBe(path.join(ROOT, 'ws/shared/s.js'));
  });

  it('an empty prefix maps every bare specifier, never a relative one', () => {
    const settings = {
      'import/resolver': {
        'custom-alias': { alias: { '': path.join(ROOT, 'app') } },
      },
    };
    expect(resolveWithSettings('foo', main, settings)).toBe(
      path.join(ROOT, 'app/foo.js'),
    );
    expect(resolveWithSettings('./foo', main, settings)).toBeNull();
  });

  it('a non-string folder is ignored, and extensions default to .js', () => {
    expect(
      resolverChain({
        'import/resolver': {
          'custom-alias': { alias: { a: './a', b: 42 } },
        },
      }),
    ).toEqual([
      {
        kind: 'alias',
        extensions: ['.js'],
        alias: [['a', './a']],
        packages: [],
      },
    ]);
    expect(
      resolverChain({ 'import/resolver': { 'custom-alias': true } }),
    ).toEqual([
      { kind: 'alias', extensions: ['.js'], alias: [], packages: [] },
    ]);
  });
});

describe('namesUnmodelledResolver', () => {
  it('is false for node, typescript and custom-alias, and for no settings', () => {
    expect(namesUnmodelledResolver({})).toBe(false);
    expect(
      namesUnmodelledResolver({
        'import/resolver': {
          node: true,
          'eslint-import-resolver-typescript': true,
          'custom-alias': {},
        },
      }),
    ).toBe(false);
  });

  it('is true when webpack or another resolver is named', () => {
    expect(namesUnmodelledResolver({ 'import/resolver': 'webpack' })).toBe(
      true,
    );
    expect(
      namesUnmodelledResolver({
        'import/resolver': ['node', { 'my-resolver': {} }],
      }),
    ).toBe(true);
  });
});
