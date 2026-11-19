/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The export map: what another module exports, read by parsing it, the way
 * eslint-plugin-import's ExportMap does. Every fixture is written to a temp
 * directory, so nothing here depends on the repository's own files.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  clearExportMapCache,
  ExportMap,
  exportMapOf,
  exportMapOfFile,
  limits,
  parseJsDoc,
  resolveFor,
} from './export-map';

const require_ = createRequire(__filename);
const espree = require_('espree') as {
  parse: (text: string, options: unknown) => unknown;
};

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'import-next-export-map-'));
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

/** Write `files` under a fresh directory; returns its path. */
let dirs = 0;
function project(files: Record<string, string>): string {
  const dir = path.join(ROOT, `p${dirs++}`);
  for (const [name, text] of Object.entries(files)) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  return dir;
}

type Loose = Record<string, unknown>;
/** A rule context as the export map reads it: flat config, espree. */
function context(filename: string, extra: Loose = {}): never {
  return {
    filename,
    settings: {},
    languageOptions: {
      parser: espree,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    ...extra,
  } as never;
}

const names = (map: ExportMap | null) => {
  const found: string[] = [];
  map?.forEach((_, name) => found.push(name));
  return found.sort();
};

beforeEach(() => {
  clearExportMapCache();
  limits.maxBytes = 1024 * 1024;
  limits.maxEntries = 5000;
});

describe('what a module exports', () => {
  it('declarations, patterns, specifiers and the default', () => {
    const dir = project({
      'm.js': [
        'const o = {}, arr = [];',
        'export const a = 1, { b, c: [d, ...e], ...f } = o, [g = 1, , ...h] = arr;',
        'export function fn() {}',
        'export class K {}',
        'export { a as aa, a as "a b" };',
        'export default a;',
      ].join('\n'),
    });
    const map = exportMapOf('./m', context(path.join(dir, 'x.js')));
    expect(names(map)).toEqual(
      [
        'K',
        'a',
        'a b',
        'aa',
        'b',
        'd',
        'default',
        'e',
        'f',
        'fn',
        'g',
        'h',
      ].sort(),
    );
    expect(map?.parseGoal).toBe('Module');
    expect(map?.hasDefault).toBe(true);
    expect(map?.size()).toBe(12);
  });

  it('re-exports, export * and export * as', () => {
    const dir = project({
      'dep.js': 'export const x = 1, y = 2;\nexport default 3;',
      'star.js': 'export const s1 = 1;\nexport default 4;',
      'm.js': [
        "export { x, y as z, default } from './dep';",
        "export * from './star';",
        "export * as ns from './star';",
        "export * as 'n s' from './star';",
      ].join('\n'),
    });
    const map = exportMapOf('./m', context(path.join(dir, 'x.js')))!;
    expect(names(map)).toEqual(['default', 'n s', 'ns', 's1', 'x', 'z']);
    expect(map.has('s1')).toBe(true);
    // A default is never re-exported by `export *`.
    expect(map.has('default')).toBe(true);
    expect(map.get('default')).toBeDefined();
    expect(map.hasDeep('z').found).toBe(true);
    expect(map.hasDeep('s1').path.map((m) => path.basename(m.path))).toEqual([
      'm.js',
      'star.js',
    ]);
    expect(map.hasDeep('nope')).toMatchObject({ found: false });
    expect(map.get('s1')).toEqual({});
    expect(map.get('nope')).toBeUndefined();
    expect(map.get('ns')?.namespace?.has('s1')).toBe(true);
  });

  it('a re-export from a module that does not resolve may be anything', () => {
    const dir = project({
      'm.js': "export { q } from './missing';\nexport * from './also-missing';",
    });
    const map = exportMapOf('./m', context(path.join(dir, 'x.js')))!;
    expect(map.hasDeep('q').found).toBe(true);
    expect(map.get('q')).toBeNull();
    // The unresolved `export *` is kept as an unknown module.
    expect(map.hasDeep('anything').found).toBe(true);
    expect(map.has('anything')).toBe(false);
    expect(map.hasUnknown()).toBe(true);
    expect(map.mayHave('anything')).toBe(true);
    expect(map.mayHave('default')).toBe(false);
    expect(names(map)).toEqual(['q']);
  });

  it('export * of a module that is not known: names unknown, lookups found', () => {
    const dir = project({
      'cjs.js': 'module.exports = { a: 1 };',
      'm.js': "export * from './cjs';",
    });
    const map = exportMapOf('./m', context(path.join(dir, 'x.js')))!;
    expect(map.has('a')).toBe(false);
    expect(map.hasDeep('a').found).toBe(true);
    expect(map.get('a')).toBeUndefined();
    expect(map.size()).toBe(0);
    expect(names(map)).toEqual([]);
  });

  it('a star-exported module that does not parse is unknown to its re-exporter', () => {
    const dir = project({
      'bad.js': 'export const = ;',
      'ok.js': 'export const fine = 1;',
      'm.js': "export * from './bad';\nexport * from './ok';",
      'clean.js': "export * from './ok';\nexport * from './ok2';",
      'ok2.js': "export * from './ok';",
    });
    const at = context(path.join(dir, 'x.js'));
    const map = exportMapOf('./m', at)!;
    expect(map.errors).toEqual([]);
    expect(map.hasDeep('whatever').found).toBe(true);
    expect(map.mayHave('whatever')).toBe(true);
    expect(map.mayHave('fine')).toBe(true);
    expect(exportMapOf('./clean', at)!.hasUnknown()).toBe(false);
    expect(exportMapOf('./clean', at)!.mayHave('nope')).toBe(false);
  });

  it('a TypeScript file does not read a JavaScript module: its .d.ts may add names', () => {
    const dir = project({
      'm.js': 'export const a = 1;',
      'n.ts': 'export const b = 1;',
    });
    const settings = {
      'import/parsers': { '@typescript-eslint/parser': ['.ts'] },
      'import/resolver': { typescript: true },
    };
    expect(
      exportMapOf('./m', context(path.join(dir, 'x.ts'), { settings })),
    ).toBeNull();
    expect(
      exportMapOf('./n', context(path.join(dir, 'x.ts'), { settings }))?.has(
        'b',
      ),
    ).toBe(true);
    expect(
      exportMapOf('./m', context(path.join(dir, 'x.js'), { settings }))?.has(
        'a',
      ),
    ).toBe(true);
  });

  it('a re-export cycle ends instead of recursing forever', () => {
    const dir = project({
      'a.js': "export * from './b';\nexport { r } from './b';",
      'b.js': "export * from './a';\nexport { r } from './a';",
    });
    const map = exportMapOf('./a', context(path.join(dir, 'x.js')))!;
    expect(map.has('nope')).toBe(false);
    expect(map.hasDeep('r').found).toBe(false);
    expect(map.hasDeep('nope').found).toBe(false);
    expect(map.get('r')).toBeUndefined();
    expect(map.get('nope')).toBeUndefined();
    expect(map.size()).toBe(2);
    expect(names(map)).toEqual(['r', 'r']);
  });

  it('a namespace imported and exported again is followed', () => {
    const dir = project({
      'dep.js': 'export const inner1 = 1;',
      'm.js':
        "import * as inner from './dep';\nimport { other } from './dep';\nexport { inner };\nexport default inner;\nexport { other };",
    });
    const map = exportMapOf('./m', context(path.join(dir, 'x.js')))!;
    expect(map.get('inner')?.namespace?.has('inner1')).toBe(true);
    expect(map.get('default')?.namespace?.has('inner1')).toBe(true);
    expect(map.get('other')?.namespace).toBeUndefined();
  });

  it('a default export that is not a name, and a module with no default', () => {
    const dir = project({
      'd.js': 'export default function () {}',
      'n.js': 'export const a = 1;',
    });
    const at = context(path.join(dir, 'x.js'));
    expect(exportMapOf('./d', at)?.get('default')).toEqual({});
    expect(exportMapOf('./n', at)?.hasDefault).toBe(false);
  });
});

describe('which modules are read', () => {
  it('CommonJS is unknown; a module with only import() is ambiguous', () => {
    const dir = project({
      'cjs.js': "const s = `\nimport x from 'y'`;\nmodule.exports = s;",
      'dyn.js': "function f() { return import('./cjs'); }\nmodule.exports = f;",
      'none.js': 'module.exports = 1;',
    });
    const at = context(path.join(dir, 'x.js'));
    expect(exportMapOf('./cjs', at)).toBeNull();
    expect(exportMapOf('./dyn', at)?.parseGoal).toBe('ambiguous');
    expect(exportMapOf('./none', at)).toBeNull();
    // Cached as unknown.
    expect(exportMapOf('./none', at)).toBeNull();
  });

  it('a module that does not resolve is unknown', () => {
    const dir = project({});
    expect(
      exportMapOf('./missing', context(path.join(dir, 'x.js'))),
    ).toBeNull();
  });

  it('only extensions the config parses; import/ignore', () => {
    const dir = project({
      'a.jsx': 'export const a = 1;',
      'b.js': 'export const b = 1;',
      'vendor/c.js': 'export const c = 1;',
    });
    const file = path.join(dir, 'x.js');
    expect(exportMapOfFile(path.join(dir, 'a.jsx'), context(file))).toBeNull();
    expect(
      exportMapOfFile(
        path.join(dir, 'a.jsx'),
        context(file, { settings: { 'import/extensions': ['.jsx'] } }),
      )?.has('a'),
    ).toBe(true);
    const ignoring = (patterns: unknown) =>
      exportMapOfFile(
        path.join(dir, 'vendor/c.js'),
        context(file, { settings: { 'import/ignore': patterns } }),
      );
    expect(ignoring(['vendor'])).toBeNull();
    // Not a regular expression: matches nothing.
    expect(ignoring(['('])?.has('c')).toBe(true);
    expect(ignoring('vendor')?.has('c')).toBe(true);
  });

  it('a file over the size bound is not parsed', () => {
    const dir = project({ 'big.js': 'export const a = 1;' });
    limits.maxBytes = 4;
    expect(exportMapOf('./big', context(path.join(dir, 'x.js')))).toBeNull();
  });

  it('a path that cannot be read, or no longer exists, is unknown', () => {
    const dir = project({ 'dir.js/keep': '' });
    const at = context(path.join(dir, 'x.js'));
    expect(exportMapOfFile(path.join(dir, 'dir.js'), at)).toBeNull();
    expect(exportMapOfFile(path.join(dir, 'gone.js'), at)).toBeNull();
  });
});

describe('parsing', () => {
  it('a syntax error is kept, not thrown', () => {
    const dir = project({ 'bad.js': 'export const = ;' });
    const map = exportMapOf('./bad', context(path.join(dir, 'x.js')))!;
    expect(map.errors).toHaveLength(1);
    expect(map.errorText()).toMatch(/\(1:\d+\)$/);
  });

  it('a parser that throws something that is not an Error', () => {
    const dir = project({ 'm.js': 'export const a = 1;' });
    const parser = {
      parse: (text: string, options: unknown) => {
        if (text) throw 'boom';
        return espree.parse(text, options);
      },
    };
    const map = exportMapOf(
      './m',
      context(path.join(dir, 'x.js'), { languageOptions: { parser } }),
    )!;
    expect(map.errorText()).toBe('boom (undefined:undefined)');
  });

  it('parseForESLint, parse, and a parser that returns no AST', () => {
    const dir = project({ 'm.js': 'export const a = 1;' });
    const file = path.join(dir, 'x.js');
    const read = (parser: unknown) =>
      exportMapOf(
        './m',
        context(file, {
          languageOptions: {
            parser,
            ecmaVersion: 'latest',
            sourceType: 'module',
          },
        }),
      );
    expect(
      read({
        parseForESLint: (t: string, o: unknown) => ({
          ast: espree.parse(t, o),
        }),
      })?.has('a'),
    ).toBe(true);
    expect(
      read({ parseForESLint: () => undefined, parse: espree.parse })?.has('a'),
    ).toBe(true);
    const noAst = read({
      parseForESLint: (t: string, o: unknown) => ({
        ast: t ? 'not an AST' : espree.parse(t, o),
      }),
    })!;
    expect(noAst.errorText()).toMatch(/returned no AST/);
  });

  it('no parser, or one that cannot parse at all, reads nothing', () => {
    const dir = project({ 'm.js': 'export const a = 1;' });
    const file = path.join(dir, 'x.js');
    expect(
      exportMapOf('./m', context(file, { languageOptions: {} })),
    ).toBeNull();
    const broken = {
      parse: () => {
        throw new Error('not implemented yet');
      },
    };
    expect(
      exportMapOf(
        './m',
        context(file, { languageOptions: { parser: broken } }),
      ),
    ).toBeNull();
  });

  it('eslintrc: parserPath and parserOptions', () => {
    const dir = project({ 'm.js': 'export const a = 1;' });
    const map = exportMapOf('./m', {
      filename: path.join(dir, 'x.js'),
      settings: {},
      parserPath: require_.resolve('espree'),
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    } as never);
    expect(map?.has('a')).toBe(true);
    // Neither: nothing to parse with.
    expect(
      exportMapOf('./m', { filename: path.join(dir, 'y.js') } as never),
    ).toBeNull();
  });

  it('import/parsers: by extension, found from the file, else beside the plugin', () => {
    const dir = project({
      't.ts':
        'export interface I {}\nexport type T = 1;\nexport enum E {}\nexport declare function df(): void;\nexport namespace N {}\nexport abstract class AC {}\ndeclare module "x" {}',
      'node_modules/local-parser/index.js': `module.exports = require(${JSON.stringify(require_.resolve('espree'))});`,
      'l.lp': 'export const viaLocal = 1;',
    });
    const file = path.join(dir, 'x.js');
    const ts = exportMapOfFile(
      path.join(dir, 't.ts'),
      context(file, {
        settings: {
          'import/parsers': {
            '@typescript-eslint/parser': ['.ts'],
            'not-a-list': '.ts',
          },
        },
      }),
    );
    expect(names(ts)).toEqual(['AC', 'E', 'I', 'N', 'T', 'df']);
    const local = exportMapOfFile(
      path.join(dir, 'l.lp'),
      context(file, {
        settings: { 'import/parsers': { 'local-parser': ['.lp'] } },
      }),
    );
    expect(local?.has('viaLocal')).toBe(true);
    const nowhere = (name: string) =>
      exportMapOfFile(
        path.join(dir, 'l.lp'),
        context(file, { settings: { 'import/parsers': { [name]: ['.lp'] } } }),
      );
    expect(nowhere('no-such-parser-anywhere')).toBeNull();
    // Installed, but not a parser.
    expect(nowhere('node:path')).toBeNull();
    expect(nowhere('node:os')).toBeNull();
  });

  it('a byte-order mark and a hashbang', () => {
    const dir = project({
      'm.js': '﻿#!/usr/bin/env node\nexport const a = 1;',
    });
    expect(exportMapOf('./m', context(path.join(dir, 'x.js')))?.has('a')).toBe(
      true,
    );
  });

  it('project settings are dropped: one file, not a program', () => {
    const dir = project({ 'm.js': 'export const a = 1;' });
    let seen: Loose = {};
    const parser = {
      parse: (t: string, o: Loose) => {
        if (t) seen = o;
        return espree.parse(t, {
          ecmaVersion: 'latest',
          sourceType: 'module',
          range: true,
          loc: true,
          comment: true,
        });
      },
    };
    exportMapOf(
      './m',
      context(path.join(dir, 'x.js'), {
        languageOptions: {
          parser,
          parserOptions: {
            project: true,
            projectService: true,
            ecmaFeatures: { jsx: true },
          },
        },
      }),
    );
    expect(seen['project']).toBeUndefined();
    expect(seen['projectService']).toBeUndefined();
    expect(seen['ecmaFeatures']).toEqual({ jsx: true });
    expect(seen['ecmaVersion']).toBeUndefined();
  });
});

describe('caching', () => {
  it('a star-exported module created later is read without the barrel changing', () => {
    const dir = project({ 'm.js': "export * from './gen';" });
    const at = context(path.join(dir, 'x.js'));
    const map = exportMapOf('./m', at)!;
    expect(map.has('g')).toBe(false);
    expect(map.hasDeep('g').found).toBe(true);
    fs.writeFileSync(path.join(dir, 'gen.js'), 'export const g = 1;');
    expect(exportMapOf('./m', at)).toBe(map);
    expect(map.has('g')).toBe(true);
  });

  it('one context object reused across files reads each from its own file', () => {
    const dir = project({
      'a/m.js': 'export const a = 1;',
      'b/m.lp': 'export const b = 1;',
      'b/node_modules/b-only-parser/index.js': `module.exports = require(${JSON.stringify(require_.resolve('espree'))});`,
    });
    const at = context(path.join(dir, 'a/x.js'), {
      settings: { 'import/parsers': { 'b-only-parser': ['.lp'] } },
    }) as unknown as { filename: string };
    expect(exportMapOf('./m', at as never)?.has('a')).toBe(true);
    // The parser is installed beside b/ only: found from b's own file.
    at.filename = path.join(dir, 'b/x.js');
    expect(
      exportMapOfFile(path.join(dir, 'b/m.lp'), at as never)?.has('b'),
    ).toBe(true);
  });

  it('one map per file until it changes', () => {
    const dir = project({ 'm.js': 'export const a = 1;' });
    const file = path.join(dir, 'x.js');
    const first = exportMapOf('./m', context(file));
    expect(exportMapOf('./m', context(file))).toBe(first);
    const later = new Date(Date.now() + 10_000);
    fs.utimesSync(path.join(dir, 'm.js'), later, later);
    expect(exportMapOf('./m', context(file))).not.toBe(first);
  });

  it('keeps at most limits.maxEntries maps', () => {
    const dir = project({
      'a.js': 'export const a = 1;',
      'b.js': 'export const b = 1;',
    });
    const at = context(path.join(dir, 'x.js'));
    limits.maxEntries = 1;
    const a = exportMapOf('./a', at);
    exportMapOf('./b', at);
    expect(exportMapOf('./a', at)).not.toBe(a);
  });

  it('settings that cannot be serialised still key the cache', () => {
    const dir = project({ 'm.js': 'export const a = 1;' });
    const settings: Loose = {};
    settings['self'] = settings;
    expect(
      exportMapOf('./m', context(path.join(dir, 'x.js'), { settings }))?.has(
        'a',
      ),
    ).toBe(true);
  });
});

describe('resolution', () => {
  it("node's extensions by default, TypeScript's with a TypeScript resolver", () => {
    const dir = project({ 'only.ts': 'export const t = 1;', 'n.mjs': '' });
    const file = path.join(dir, 'x.js');
    expect(resolveFor('./only', file, {})).toBeNull();
    expect(resolveFor('./n', file, {})).toBe(path.join(dir, 'n.mjs'));
    for (const resolver of [
      'typescript',
      ['node', { typescript: {} }],
      ['eslint-import-resolver-typescript'],
      { 'eslint-import-resolver-typescript': true },
    ]) {
      expect(resolveFor('./only', file, { 'import/resolver': resolver })).toBe(
        path.join(dir, 'only.ts'),
      );
    }
    expect(
      resolveFor('./only', file, { 'import/resolver': ['node', null] }),
    ).toBeNull();
    expect(
      resolveFor('./only', file, {
        'import/resolver': { node: { extensions: ['.ts'] } },
      }),
    ).toBe(path.join(dir, 'only.ts'));
  });
});

describe('documentation', () => {
  it('JSDoc tags, their text, and text before the first tag', () => {
    expect(
      parseJsDoc(
        '*\n * Summary.\n * @deprecated use x\n *   instead.\n * @returns {string}\n ',
      ),
    ).toEqual({
      tags: [
        { title: 'deprecated', description: 'use x\n  instead.' },
        { title: 'returns', description: '{string}' },
      ],
    });
  });

  it('the doc comment in front of each export, and of the module', () => {
    const dir = project({
      'm.js': [
        '// a line comment',
        '/**',
        ' * @module m',
        ' * @deprecated whole module',
        ' */',
        '',
        '/** @deprecated fn */',
        '// and a line',
        'export function fn() {}',
        '',
        '/** @deprecated chain a */',
        'export const A = 1,',
        '  /** @deprecated chain b */',
        '  B = 2;',
        '',
        '/** not this one */ const sep = 1;',
        'export const C = sep;',
        '// only a line comment',
        'export const D = 1;',
        '/** @see x */',
        'export default class K {}',
      ].join('\n'),
    });
    const map = exportMapOf('./m', context(path.join(dir, 'x.js')))!;
    const deprecated = (name: string) =>
      map.get(name)?.doc?.tags.find((t) => t.title === 'deprecated')
        ?.description;
    expect(map.doc?.tags.map((t) => t.title)).toEqual(['module', 'deprecated']);
    expect(deprecated('fn')).toBe('fn');
    expect(deprecated('A')).toBe('chain a');
    expect(deprecated('B')).toBe('chain b');
    expect(map.get('C')?.doc).toBeUndefined();
    expect(map.get('D')?.doc).toBeUndefined();
    expect(map.get('default')?.doc?.tags[0].title).toBe('see');
  });

  it('TomDoc, when the settings ask for it', () => {
    const dir = project({
      'm.js': [
        '// Deprecated: old.',
        '//',
        '// More text.',
        'export function fn() {}',
        '// Public: fine.',
        'export function ok() {}',
        '// Just a comment.',
        'export function plain() {}',
        '/** @deprecated jsdoc */',
        'export function both() {}',
      ].join('\n'),
    });
    const file = path.join(dir, 'x.js');
    const tom = exportMapOf(
      './m',
      context(file, { settings: { 'import/docstyle': ['tomdoc'] } }),
    )!;
    expect(tom.get('fn')?.doc?.tags).toEqual([
      { title: 'deprecated', description: 'old.' },
    ]);
    expect(tom.get('ok')?.doc?.tags[0].title).toBe('public');
    expect(tom.get('plain')?.doc).toBeUndefined();
    const both = exportMapOf(
      './m',
      context(file, { settings: { 'import/docstyle': ['jsdoc', 'tomdoc'] } }),
    )!;
    expect(both.get('both')?.doc?.tags[0].title).toBe('deprecated');
  });
});

describe('TypeScript: export =', () => {
  const TS = {
    'import/parsers': { '@typescript-eslint/parser': ['.ts'] },
    'import/resolver': { typescript: true },
  };
  const ts = (source: string, extra: Loose = {}) => {
    const dir = project({ 'm.ts': source });
    return exportMapOf(
      './m',
      context(path.join(dir, 'x.js'), { settings: TS, ...extra }),
    );
  };

  it('a namespace exports its members, exported or not', () => {
    const map = ts(
      [
        'export = Foo;',
        'namespace Foo {',
        '  export const a = 1;',
        '  let b = 2, { c } = { c: 3 };',
        '  function f() {}',
        '  type T = 1;',
        '  export { a as again };',
        '  console.log(b);',
        '}',
        'declare module "other" {}',
      ].join('\n'),
    );
    expect(names(map)).toEqual(['T', 'a', 'b', 'c', 'f']);
  });

  it('anything else is the default', () => {
    expect(names(ts('class Bar {}\nexport = Bar;'))).toEqual(['default']);
    expect(names(ts('const v = 1;\nexport = v;'))).toEqual(['default']);
    expect(names(ts('export = class Baz {};'))).toEqual(['default']);
    expect(names(ts('export = { a: 1 };'))).toEqual(['default']);
    expect(names(ts('const { p } = { p: 1 };\nexport = p;'))).toEqual([
      'default',
    ]);
  });

  it('esModuleInterop adds a default, and reads export as namespace', () => {
    const rootDir = project({
      'tsconfig.json': '{ "compilerOptions": { "esModuleInterop": true } }',
    });
    const interop = {
      languageOptions: {
        parser: espree,
        parserOptions: { tsconfigRootDir: rootDir },
      },
    };
    expect(
      names(
        ts('export = Foo;\nnamespace Foo { export const a = 1; }', interop),
      ),
    ).toEqual(['a', 'default']);
    expect(
      names(
        ts(
          'export as namespace Lib;\nexport = Lib;\nnamespace Lib { export const l = 1; }',
          interop,
        ),
      ),
    ).toEqual(['default', 'l']);
    expect(
      names(ts('export default 1;\nexport = Foo;\nnamespace Foo {}', interop)),
    ).toEqual(['default']);
    expect(names(ts('export const n = 1;', interop))).toEqual(['default', 'n']);
    expect(names(ts('export {};', interop))).toEqual([]);
    // Without it, `export as namespace` exports nothing.
    expect(names(ts('export as namespace Lib;\nexport const n = 1;'))).toEqual([
      'n',
    ]);
  });

  it('a tsconfig that does not set it, and no tsconfig at all', () => {
    const plain = project({ 'tsconfig.json': '{ "compilerOptions": {} }' });
    expect(
      names(
        ts('export const n = 1;', {
          languageOptions: {
            parser: espree,
            parserOptions: { tsconfigRootDir: plain },
          },
        }),
      ),
    ).toEqual(['n']);
    expect(
      names(
        ts('export const n = 1;', {
          languageOptions: {
            parser: espree,
            parserOptions: { tsconfigRootDir: path.parse(ROOT).root },
          },
        }),
      ),
    ).toEqual(['n']);
  });
});

describe('ASTs from other parsers', () => {
  /** A parser that returns `ast` for any non-empty input. */
  const fixed = (ast: unknown) => ({
    parse: (text: string, options: unknown) =>
      text ? ast : espree.parse(text, options),
  });
  const read = (ast: unknown) => {
    const dir = project({ 'm.js': 'export {}' });
    return exportMapOf(
      './m',
      context(path.join(dir, 'x.js'), {
        languageOptions: { parser: fixed(ast) },
      }),
    );
  };
  const range = [0, 1];

  it('declarations this map does not know, or with no name, export nothing', () => {
    const map = read({
      type: 'Program',
      range,
      body: [
        {
          type: 'ExportNamedDeclaration',
          range,
          specifiers: [],
          declaration: { type: 'TypeAlias', range },
        },
        {
          type: 'ExportNamedDeclaration',
          range,
          specifiers: [],
          declaration: { type: 'FunctionDeclaration', id: null, range },
        },
      ],
    });
    expect(map?.size()).toBe(0);
  });

  it('a namespace with no body exports nothing through export =', () => {
    const map = read({
      type: 'Program',
      range,
      body: [
        {
          type: 'TSExportAssignment',
          range,
          expression: { type: 'Identifier', name: 'N' },
        },
        {
          type: 'TSModuleDeclaration',
          range,
          id: { type: 'Identifier', name: 'N' },
        },
      ],
    });
    expect(map?.size()).toBe(0);
  });
});

describe('ExportMap, built by hand', () => {
  it('a re-export of an ignored module: found, metadata unknown', () => {
    const map = new ExportMap('/m.js');
    map.reexports.set('r', { local: 'r', getImport: () => null });
    map.dependencies.add(() => null);
    expect(map.hasDeep('r').found).toBe(true);
    expect(map.get('r')).toBeNull();
    expect(map.hasDeep('star').found).toBe(true);
    expect(map.hasDeep('default').found).toBe(false);
  });

  it('parse errors print their positions', () => {
    const map = new ExportMap('/m.js');
    map.errors.push({ message: 'a', lineNumber: 1, column: 2 });
    map.errors.push({ message: 'b', lineNumber: 3, column: 4 });
    expect(map.errorText()).toBe('a (1:2), b (3:4)');
  });
});
