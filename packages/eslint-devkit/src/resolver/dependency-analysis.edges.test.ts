/**
 * Edges of the import graph found by the import-next no-cycle fidelity model:
 * `export * from`, a top-level `require()` / `import x = require()`, an
 * implicitly type-only import (erased like an inline-type one), and the
 * `maxDepth` bound of `findShortestCyclePath`.
 */
import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  createFileSystemCache,
  getFileImports,
  computeSCCsFromFile,
  findShortestCyclePath,
  exportKindsOf,
  clearExportKindCache,
} from './dependency-analysis';

const ROOT = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'dependency-edges-')),
);
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

let n = 0;
/** Writes `files` into a fresh directory; returns its path. */
function project(files: Record<string, string>): string {
  const dir = path.join(ROOT, `case-${n++}`);
  fs.mkdirSync(dir);
  for (const [rel, text] of Object.entries(files))
    fs.writeFileSync(path.join(dir, rel), text);
  return dir;
}

/** The edges `a.ts` has, as `<file>:<flags>`. */
function edgesOf(files: Record<string, string>): string[] {
  const dir = project(files);
  const cache = createFileSystemCache();
  return getFileImports(path.join(dir, 'a.ts'), {
    workspaceRoot: dir,
    barrelExports: [],
    cache,
  }).map(
    (e) =>
      `${path.basename(e.path)}:${e.typeOnly ? 'type' : ''}${e.inlineTypeOnly ? 'inline' : ''}${e.dynamic ? 'dynamic' : ''}`,
  );
}

const B =
  'export const b = 1;\nexport interface T { t: number }\nexport type U = string;\n';

describe('getFileImports — runtime edges', () => {
  it('export * from and export * as ns from are edges', () => {
    expect(edgesOf({ 'a.ts': "export * from './b';\n", 'b.ts': B })).toEqual([
      'b.ts:',
    ]);
    expect(
      edgesOf({ 'a.ts': "export * as ns from './b';\n", 'b.ts': B }),
    ).toEqual(['b.ts:']);
  });

  it('export type * from is not an edge', () => {
    expect(
      edgesOf({ 'a.ts': "export type * from './b';\n", 'b.ts': B }),
    ).toEqual([]);
  });

  it('a top-level require() and import x = require() are edges', () => {
    expect(
      edgesOf({ 'a.ts': "const m = require('./b');\n", 'b.ts': B }),
    ).toEqual(['b.ts:']);
    expect(edgesOf({ 'a.ts': "require('./b');\n", 'b.ts': B })).toEqual([
      'b.ts:',
    ]);
    expect(
      edgesOf({ 'a.ts': "import m = require('./b');\n", 'b.ts': B }),
    ).toEqual(['b.ts:']);
  });

  it('an indented require() inside a function is not an edge', () => {
    expect(
      edgesOf({
        'a.ts': "export const f = () => {\n  return require('./b');\n};\n",
        'b.ts': B,
      }),
    ).toEqual([]);
  });
});

describe('getFileImports — implicitly type-only imports', () => {
  it('an import of only interfaces and type aliases is flagged like an inline-type one', () => {
    expect(
      edgesOf({ 'a.ts': "import { T, U as V } from './b';\n", 'b.ts': B }),
    ).toEqual(['b.ts:inline']);
    expect(
      edgesOf({ 'a.ts': "import { type T, U } from './b';\n", 'b.ts': B }),
    ).toEqual(['b.ts:inline']);
  });

  it('an import that takes a value keeps a runtime edge', () => {
    expect(
      edgesOf({ 'a.ts': "import { T, b } from './b';\n", 'b.ts': B }),
    ).toEqual(['b.ts:']);
    expect(edgesOf({ 'a.ts': "import {} from './b';\n", 'b.ts': B })).toEqual([
      'b.ts:',
    ]);
    expect(edgesOf({ 'a.ts': "import B from './b';\n", 'b.ts': B })).toEqual([
      'b.ts:',
    ]);
  });

  it('an unresolvable import is no edge', () => {
    expect(edgesOf({ 'a.ts': "import { T } from './missing';\n" })).toEqual([]);
  });
});

describe('exportKindsOf', () => {
  it('reads types and values; a name that is both is a value', () => {
    const dir = project({
      'k.ts':
        'export interface Foo {}\nexport const Foo = 1;\nexport type Bar = 1;\nexport class Baz {}\n',
    });
    const kinds = exportKindsOf(path.join(dir, 'k.ts'));
    expect(Object.fromEntries(kinds)).toEqual({
      Foo: 'value',
      Bar: 'type',
      Baz: 'value',
    });
    // Cached until cleared.
    expect(exportKindsOf(path.join(dir, 'k.ts'))).toBe(kinds);
    clearExportKindCache();
    expect(exportKindsOf(path.join(dir, 'k.ts'))).not.toBe(kinds);
  });

  it('an unreadable file exports nothing known', () => {
    expect(exportKindsOf(path.join(ROOT, 'nope.ts')).size).toBe(0);
  });

  /** Resolves `./x` next to the importing file, as `x.ts`, when it exists. */
  const resolve = (spec: string, from: string) => {
    const file = path.join(path.dirname(from), `${spec}.ts`);
    return fs.existsSync(file) ? file : null;
  };

  it('follows re-exports to the module that declares each name', () => {
    clearExportKindCache();
    const dir = project({
      'decl.ts':
        'export interface I {}\nexport type U = 1;\nexport const v = 1;\nexport interface own {}\n',
      'more.ts': 'export interface M {}\nexport const w = 1;\n',
      'barrel.ts': [
        "export * from './decl';",
        "export type * from './more';",
        "export { v as renamed, I as Iface, , } from './decl';",
        "export { type w as wType } from './more';",
        "export type { w as wAlsoType } from './more';",
        "export { gone } from './missing';",
        "export * from './missing';",
        'interface Local {}',
        'const local = 1;',
        'const both = 1;',
        'interface both {}',
        'export { both };',
        'export const own = 1;',
        'export { Local, local, unknownLocal };',
        "export * from './cycle';",
        '',
      ].join('\n'),
      'cycle.ts': "export * from './barrel';\nexport interface C {}\n",
    });
    const kinds = exportKindsOf(path.join(dir, 'barrel.ts'), resolve);
    expect(Object.fromEntries(kinds)).toEqual({
      I: 'type',
      U: 'type',
      v: 'value',
      M: 'type',
      w: 'type',
      renamed: 'value',
      Iface: 'type',
      wType: 'type',
      wAlsoType: 'type',
      Local: 'type',
      local: 'value',
      both: 'value',
      own: 'value',
      C: 'type',
    });
  });
});

describe('findShortestCyclePath — maxDepth', () => {
  const cycleOf3 = () => {
    const dir = project({
      'a.ts': "import { b } from './b';\nexport const a = b;\n",
      'b.ts': "import { c } from './c';\nexport const b = c;\n",
      'c.ts': "import { a } from './a';\nexport const c = () => a;\n",
    });
    const cache = createFileSystemCache();
    const options = {
      maxDepth: Infinity,
      workspaceRoot: dir,
      barrelExports: [],
      cache,
    };
    computeSCCsFromFile(path.join(dir, 'a.ts'), options);
    return { dir, options };
  };

  it('finds a three-module cycle without a bound', () => {
    const { dir, options } = cycleOf3();
    expect(
      findShortestCyclePath(
        path.join(dir, 'a.ts'),
        path.join(dir, 'b.ts'),
        options,
      ),
    ).toHaveLength(3);
  });

  it('maxDepth: 1 finds only a direct cycle', () => {
    const { dir, options } = cycleOf3();
    expect(
      findShortestCyclePath(path.join(dir, 'a.ts'), path.join(dir, 'b.ts'), {
        ...options,
        maxDepth: 1,
      }),
    ).toBeNull();
  });
});
