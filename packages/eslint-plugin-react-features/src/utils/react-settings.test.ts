import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Linter } from 'eslint';
import { afterAll, describe, expect, it } from 'vitest';
import { rules } from '../index';
import {
  getCreateClassPragma,
  getFragmentPragma,
  getPragma,
  getReactVersion,
  parseVersion,
  reactVersionAtLeast,
  reactVersionBelow,
} from './react-settings';

type Ctx = Parameters<typeof getPragma>[0];

const ctx = (
  settings?: unknown,
  extra: { comments?: string[]; filename?: string; cwd?: string } = {},
): Ctx =>
  ({
    settings,
    filename: extra.filename,
    cwd: extra.cwd,
    sourceCode: {
      getAllComments: () => (extra.comments ?? []).map((value) => ({ value })),
    },
  }) as unknown as Ctx;

const react = (version: string) => ({ react: { version } });

describe('getPragma', () => {
  it('is React by default', () => {
    expect(getPragma(ctx())).toBe('React');
    expect(getPragma(ctx({}))).toBe('React');
    expect(getPragma(ctx({ react: 'not an object' }))).toBe('React');
  });

  it('reads settings.react.pragma', () => {
    expect(getPragma(ctx({ react: { pragma: 'Foo' } }))).toBe('Foo');
  });

  it('ignores a settings pragma that is not a name', () => {
    expect(getPragma(ctx({ react: { pragma: 'not valid' } }))).toBe('React');
    expect(getPragma(ctx({ react: { pragma: 7 } }))).toBe('React');
    expect(getPragma(ctx({ react: { pragma: '' } }))).toBe('React');
  });

  it('reads the first @jsx comment, ahead of the setting', () => {
    expect(
      getPragma(
        ctx(
          { react: { pragma: 'Foo' } },
          { comments: [' nothing ', ' @jsx Bar.baz ', ' @jsx Other '] },
        ),
      ),
    ).toBe('Bar');
  });

  it('ignores a @jsx comment that is not a name', () => {
    expect(getPragma(ctx(undefined, { comments: [' @jsx 9lives '] }))).toBe(
      'React',
    );
  });
});

describe('getFragmentPragma / getCreateClassPragma', () => {
  it('default and read from settings', () => {
    expect(getFragmentPragma(ctx())).toBe('Fragment');
    expect(getFragmentPragma(ctx({ react: { fragment: 'Frag' } }))).toBe(
      'Frag',
    );
    expect(getFragmentPragma(ctx({ react: { fragment: 'no way' } }))).toBe(
      'Fragment',
    );
    expect(getCreateClassPragma(ctx())).toBe('createReactClass');
    expect(
      getCreateClassPragma(ctx({ react: { createClass: 'createClass' } })),
    ).toBe('createClass');
    expect(getCreateClassPragma(ctx({ react: { createClass: 1 } }))).toBe(
      'createReactClass',
    );
  });
});

describe('parseVersion', () => {
  it('reads the first version in the text, as semver.coerce does', () => {
    expect(parseVersion('16.3.1')).toEqual([16, 3, 1]);
    expect(parseVersion('16.3')).toEqual([16, 3, 0]);
    expect(parseVersion('18')).toEqual([18, 0, 0]);
    expect(parseVersion('v17.0.2-rc.1')).toEqual([17, 0, 2]);
    expect(parseVersion('>16.3.0')).toEqual([16, 3, 0]);
    expect(parseVersion('latest')).toBeNull();
    expect(parseVersion('')).toBeNull();
  });
});

describe('getReactVersion', () => {
  it('is the newest React when nothing is configured', () => {
    expect(getReactVersion(ctx())).toEqual([999, 999, 999]);
    expect(getReactVersion(ctx({ react: {} }))).toEqual([999, 999, 999]);
  });

  it('reads settings.react.version', () => {
    expect(getReactVersion(ctx(react('16.3.0')))).toEqual([16, 3, 0]);
  });

  it('falls back when the version is not a version or not a string', () => {
    expect(getReactVersion(ctx(react('next')))).toEqual([999, 999, 999]);
    expect(getReactVersion(ctx({ react: { version: 16 } }))).toEqual([
      999, 999, 999,
    ]);
  });

  it('falls back to settings.react.defaultVersion when it has one', () => {
    expect(
      getReactVersion(
        ctx({ react: { version: 'next', defaultVersion: '17.0' } }),
      ),
    ).toEqual([17, 0, 0]);
    expect(
      getReactVersion(ctx({ react: { version: 'next', defaultVersion: 'x' } })),
    ).toEqual([999, 999, 999]);
  });

  it('compares against a minimum and a limit', () => {
    expect(reactVersionAtLeast(ctx(react('16.3.0')), '16.3.0')).toBe(true);
    expect(reactVersionAtLeast(ctx(react('16.2.9')), '16.3.0')).toBe(false);
    expect(reactVersionAtLeast(ctx(react('17.0.0')), '16.3.0')).toBe(true);
    expect(reactVersionAtLeast(ctx(react('16.3.1')), '16.3.0')).toBe(true);
    expect(reactVersionAtLeast(ctx(react('16.3.0')), 'nonsense')).toBe(false);
    expect(reactVersionBelow(ctx(react('18.2.0')), '18.3.0')).toBe(true);
    expect(reactVersionBelow(ctx(react('18.3.0')), '18.3.0')).toBe(false);
    expect(reactVersionBelow(ctx(react('18.3.0')), 'nonsense')).toBe(false);
  });
});

describe("version: 'detect'", () => {
  const roots: string[] = [];
  const project = (reactManifest?: string) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'react-detect-'));
    roots.push(root);
    fs.mkdirSync(path.join(root, 'src'));
    if (reactManifest !== undefined) {
      fs.mkdirSync(path.join(root, 'node_modules', 'react'), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(root, 'node_modules', 'react', 'package.json'),
        reactManifest,
      );
    }
    return root;
  };
  afterAll(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  });
  const detect = { react: { version: 'detect' } };

  it('reads the installed react from the file directory', () => {
    const root = project('{"name":"react","version":"18.2.0"}');
    const filename = path.join(root, 'src', 'App.js');
    expect(getReactVersion(ctx(detect, { filename }))).toEqual([18, 2, 0]);
    // a second file in the same directory is answered from the cache
    expect(
      getReactVersion(
        ctx(detect, { filename: path.join(root, 'src', 'B.js') }),
      ),
    ).toEqual([18, 2, 0]);
  });

  it('reads a virtual file path, whose parent is a file or does not exist', () => {
    const root = project('{"version":"17.0.1"}');
    fs.writeFileSync(path.join(root, 'src', 'App.js'), '');
    expect(
      getReactVersion(
        ctx(detect, {
          filename: path.join(root, 'src', 'App.js', '0_virtual.js'),
        }),
      ),
    ).toEqual([17, 0, 1]);
    expect(
      getReactVersion(
        ctx(detect, { filename: path.join(root, 'nope', 'deeper', 'App.js') }),
      ),
    ).toEqual([17, 0, 1]);
  });

  it('uses the cwd when the file has no real path', () => {
    const root = project('{"version":"16.14.0"}');
    expect(
      getReactVersion(ctx(detect, { filename: '<input>', cwd: root })),
    ).toEqual([16, 14, 0]);
    expect(
      getReactVersion(ctx(detect, { filename: undefined, cwd: root })),
    ).toEqual([16, 14, 0]);
  });

  it('uses the process cwd when the context gives none', () => {
    expect(getReactVersion(ctx(detect))).not.toBeNull();
  });

  it('falls back when react is not installed, with no throw', () => {
    const root = project();
    const filename = path.join(root, 'src', 'App.js');
    // an isolated directory has no react above it only if the tmp dir has none
    const found = getReactVersion(ctx(detect, { filename }));
    expect(found).toHaveLength(3);
    expect(
      getReactVersion(
        ctx(
          { react: { version: 'detect', defaultVersion: '16.0.0' } },
          { filename: path.join(project(), 'src', 'App.js') },
        ),
      ),
    ).toEqual([16, 0, 0]);
  });

  it('remembers that a directory has no react', () => {
    const filename = path.join(project(), 'src', 'App.js');
    const first = getReactVersion(ctx(detect, { filename }));
    expect(getReactVersion(ctx(detect, { filename }))).toEqual(first);
  });

  it('falls back when the installed manifest is broken or has no version', () => {
    const broken = project('{ not json');
    expect(
      getReactVersion(
        ctx(
          { react: { version: 'detect', defaultVersion: '15.1.0' } },
          { filename: path.join(broken, 'src', 'App.js') },
        ),
      ),
    ).toEqual([15, 1, 0]);
    const unversioned = project('{"name":"react"}');
    expect(
      getReactVersion(
        ctx(
          { react: { version: 'detect', defaultVersion: '15.2.0' } },
          { filename: path.join(unversioned, 'src', 'App.js') },
        ),
      ),
    ).toEqual([15, 2, 0]);
  });

  it('runs through ESLint itself, which has no context.getFilename() since v9', () => {
    const lint = (root: string) =>
      new Linter({ configType: 'flat', cwd: root }).verify(
        'import { Component } from "react"; class A extends Component { m() { return this.refs.input; } }',
        {
          files: ['**/*.js'],
          plugins: { react: { rules } },
          languageOptions: { ecmaVersion: 2018, sourceType: 'module' },
          settings: detect,
          rules: { 'react/no-string-refs': 'error' },
        } as unknown as Linter.Config,
        { filename: path.join(root, 'src', 'App.js') },
      );
    // this.refs is a string-ref API before 18.3 and a plain property from it
    expect(lint(project('{"version":"18.2.0"}'))).toHaveLength(1);
    expect(lint(project('{"version":"18.3.1"}'))).toHaveLength(0);
  });
});
