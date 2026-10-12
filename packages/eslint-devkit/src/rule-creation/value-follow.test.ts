/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Unit locks for cross-file resolution and value following, on real files.
 * Ported with `postgresql-security/utils/cross-file.test.ts` when the walk
 * moved here for the driver plugins, plus the pieces this copy adds
 * (`returnedValues`, `importSpecifierOf`, type exports, `?.` chains).
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  envOf,
  exportedValue,
  follow,
  importOrigin,
  importSpecifierOf,
  isRelativeSpecifier,
  loadModule,
  lookup,
  moduleEnv,
  parseModule,
  requiredSpecifier,
  resolveRelative,
  returnedValue,
  returnedValues,
  singleWrite,
  valueAt,
  type ModuleInfo,
  type Value,
} from './value-follow';

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'devkit-value-follow-'));
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

let counter = 0;
/** Write files under a fresh directory; returns the directory. */
function files(entries: Record<string, string>): string {
  const dir = path.join(ROOT, `p${counter++}`);
  for (const [name, text] of Object.entries(entries)) {
    const target = path.join(dir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  }
  return dir;
}

function load(dir: string, name: string): ModuleInfo {
  const module = loadModule(path.join(dir, name), parser);
  if (module === null) throw new Error(`could not load ${name}`);
  return module;
}

/** The argument of the module's last `probe(…)` call, as a Value in that module. */
function probe(module: ModuleInfo): Value {
  const last = module.ast.body.at(-1) as TSESTree.ExpressionStatement;
  const call = last.expression as TSESTree.CallExpression;
  return valueAt(call.arguments[0], moduleEnv(module, parser));
}

/** Follow the probe of a one-file module and return what it lands on, as source text. */
function landsOn(code: string, extra: Record<string, string> = {}): string {
  const dir = files({ 'main.ts': code, ...extra });
  const value = follow(probe(load(dir, 'main.ts')));
  const json = value.env.file.endsWith('.json.ts');
  const raw = fs.readFileSync(
    json ? value.env.file.slice(0, -3) : value.env.file,
    'utf8',
  );
  const text = json ? `export default (${raw});` : raw;
  return value.node.type === 'Program'
    ? '<namespace>'
    : text.slice(...(value.node.range as [number, number]));
}

describe('isRelativeSpecifier / requiredSpecifier', () => {
  it('knows a project file from a package', () => {
    expect(isRelativeSpecifier('./db')).toBe(true);
    expect(isRelativeSpecifier('..')).toBe(true);
    expect(isRelativeSpecifier('pg')).toBe(false);
    expect(isRelativeSpecifier('@/lib/db')).toBe(false);
  });

  it('reads only a literal require() argument', () => {
    const module = parseModule(
      "require('a');\nrequire(x);\nload('b');\nobj.require('c');",
      '/r.ts',
      parser,
    )!;
    const calls = module.ast.body.map(
      (s) => (s as TSESTree.ExpressionStatement).expression,
    );
    expect(requiredSpecifier(calls[0])).toBe('a');
    expect(requiredSpecifier(calls[1])).toBeNull();
    expect(requiredSpecifier(calls[2])).toBeNull();
    expect(requiredSpecifier(calls[3])).toBeNull();
    expect(requiredSpecifier(undefined)).toBeNull();
  });
});

describe('resolveRelative', () => {
  const dir = files({ 'db.ts': '', 'lib/index.ts': '', 'esm.ts': '' });
  const from = path.join(dir, 'main.ts');

  it('resolves only relative specifiers that exist on disk', () => {
    expect(resolveRelative(from, 'pg')).toBeNull();
    expect(resolveRelative(from, './missing')).toBeNull();
    expect(resolveRelative(from, './db')).toBe(path.join(dir, 'db.ts'));
    expect(resolveRelative(from, './lib')).toBe(path.join(dir, 'lib/index.ts'));
    expect(resolveRelative(from, './esm.js')).toBe(path.join(dir, 'esm.ts'));
  });
});

describe('parseModule and loadModule', () => {
  it('falls back to @typescript-eslint/parser when the lint parser cannot parse for ESLint', () => {
    expect(
      parseModule('export const a = 1;', '/x.ts', undefined)?.ast.type,
    ).toBe('Program');
    expect(
      parseModule('export const a = 1;', '/x.ts', {
        parseForESLint: () => ({ ast: {} }),
      })?.ast.type,
    ).toBe('Program');
  });

  it('abstains on text no parser can read', () => {
    expect(parseModule('export const = ;', '/x.ts', parser)).toBeNull();
  });

  it('abstains when no parser is available at all', () => {
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(ROOT);
    try {
      expect(parseModule('export const a = 1;', '/x.ts', undefined)).toBeNull();
    } finally {
      cwd.mockRestore();
    }
  });

  it('abstains on a missing file, a directory and malformed JSON', () => {
    const dir = files({ 'bad.json': '{ nope', 'sub/a.ts': '' });
    expect(loadModule(path.join(dir, 'none.ts'), parser)).toBeNull();
    expect(loadModule(path.join(dir, 'sub'), parser)).toBeNull();
    expect(loadModule(path.join(dir, 'bad.json'), parser)).toBeNull();
  });

  it('caches per path and re-reads a modified file', () => {
    const dir = files({ 'a.ts': 'export const a = 1;' });
    const file = path.join(dir, 'a.ts');
    const first = loadModule(file, parser);
    expect(loadModule(file, parser)).toBe(first);
    fs.writeFileSync(file, 'export const a = 2;');
    fs.utimesSync(file, new Date(), new Date(Date.now() + 5000));
    expect(loadModule(file, parser)).not.toBe(first);
  });
});

describe('envOf', () => {
  it('reads the file, parser and scope of the linted file', () => {
    const scope = {} as never;
    const env = envOf({
      physicalFilename: 'x/y.ts',
      languageOptions: { parser },
      sourceCode: { getScope: () => scope },
    });
    expect(env.file).toBe(path.resolve('x/y.ts'));
    expect(env.parser).toBe(parser);
    expect(env.module).toBeNull();
    expect(env.scopeOf({} as TSESTree.Node)).toBe(scope);
    expect(
      envOf({ physicalFilename: 'z.ts', sourceCode: { getScope: () => scope } })
        .parser,
    ).toBeUndefined();
  });
});

describe('exportedValue', () => {
  const dir = files({
    'm.ts': [
      'export default { kind: "default" };',
      'export const named = 1;',
      'export let empty;',
      'export function fn() { return 2; }',
      'export class Klass {}',
      'export type Alias = string;',
      'export interface Shape { a: 1 }',
      'const local = 3;',
      'export { local, local as renamed };',
      'export { undeclared };',
      "export { a as 'quoted' } from './other';",
      "export { x } from 'some-package';",
      "export { y } from './missing';",
      'export {};',
    ].join('\n'),
    'other.ts':
      "const a = 4;\nexport { a };\nconst b = 5;\nexport { b as 'b c' };",
    'cjs.js': [
      'module.exports = { pool: 1, ...rest };',
      'module.exports.extra = 2;',
      'exports.short = 3;',
      'something = 4;',
      "module['dyn' + x] = 5;",
      'f().y = 6;',
      'module.exports += 7;',
      'call();',
    ].join('\n'),
    'cjs2.js': 'module.exports = factory();',
    'cjs3.js': 'const shape = { via: 8 };\nmodule.exports = shape;',
  });
  const m = load(dir, 'm.ts');
  const text = (value: Value | null): string | null =>
    value === null
      ? null
      : fs
          .readFileSync(value.env.file, 'utf8')
          .slice(...(value.node.range as [number, number]));

  it('finds default, const, function, class, type and specifier exports', () => {
    expect(text(exportedValue(m, 'default', parser))).toBe(
      '{ kind: "default" }',
    );
    expect(text(exportedValue(m, 'named', parser))).toBe('1');
    expect(text(exportedValue(m, 'fn', parser))).toMatch(/^function fn/);
    expect(text(exportedValue(m, 'Klass', parser))).toBe('class Klass {}');
    expect(text(exportedValue(m, 'Alias', parser))).toMatch(/^type Alias/);
    expect(text(exportedValue(m, 'Shape', parser))).toMatch(/^interface Shape/);
    expect(text(exportedValue(m, 'local', parser))).toBe('3');
    expect(text(exportedValue(m, 'renamed', parser))).toBe('3');
    expect(text(exportedValue(m, 'quoted', parser))).toBe('4');
    expect(text(exportedValue(load(dir, 'other.ts'), 'b c', parser))).toBe('5');
  });

  it('abstains on what it cannot see', () => {
    expect(exportedValue(m, 'empty', parser)).toBeNull();
    expect(exportedValue(m, 'undeclared', parser)).toBeNull();
    expect(exportedValue(m, 'x', parser)).toBeNull();
    expect(exportedValue(m, 'y', parser)).toBeNull();
    expect(exportedValue(m, 'nothing', parser)).toBeNull();
  });

  it('reads CommonJS exports, following the assigned binding', () => {
    const cjs = load(dir, 'cjs.js');
    expect(text(exportedValue(cjs, 'pool', parser))).toBe('1');
    expect(text(exportedValue(cjs, 'extra', parser))).toBe('2');
    expect(text(exportedValue(cjs, 'short', parser))).toBe('3');
    expect(text(exportedValue(cjs, 'default', parser))).toMatch(/^\{ pool/);
    expect(exportedValue(cjs, 'absent', parser)).toBeNull();
    expect(exportedValue(load(dir, 'cjs2.js'), 'pool', parser)).toBeNull();
    expect(text(exportedValue(load(dir, 'cjs3.js'), 'via', parser))).toBe('8');
  });

  it('stops a re-export chain at the depth bound', () => {
    const chain: Record<string, string> = { 'r0.ts': 'export const v = 1;' };
    for (let i = 1; i <= 12; i++)
      chain[`r${i}.ts`] = `export { v } from './r${i - 1}';`;
    const deep = files(chain);
    expect(exportedValue(load(deep, 'r12.ts'), 'v', parser)).toBeNull();
    expect(text(exportedValue(load(deep, 'r3.ts'), 'v', parser))).toBe('1');
  });
});

describe('importSpecifierOf and importOrigin', () => {
  it('reads every load form, and abstains on what is not one', () => {
    const dir = files({
      'lib.ts': "const a = 1;\nexport { a as 'x y' };\nexport default 2;",
      'main.ts': [
        "import { 'x y' as named } from './lib';",
        "import def from './lib';",
        "import * as ns from './lib';",
        "import eq = require('./lib');",
        'import alias = Some.Name;',
        "const { [k]: computed } = require('./lib');",
        "const { ...rest } = require('./lib');",
        "const { a: picked } = require('./lib');",
        'const dynamic = require(name);',
        "const pkg = require('pg');",
        "const awaited = await import('./lib');",
        'const imported = await import(spec);',
        'const plain = 1;',
        'function fn(param) { return param; }',
        'probe(named);',
      ].join('\n'),
    });
    const module = load(dir, 'main.ts');
    const env = moduleEnv(module, parser);
    const scope = env.scopeOf(module.ast);
    const spec = (name: string) => importSpecifierOf(lookup(name, scope)!);
    const origin = (name: string) => importOrigin(lookup(name, scope)!, env);
    expect(spec('named')).toEqual({ source: './lib', name: 'x y' });
    expect(spec('def')).toEqual({ source: './lib', name: 'default' });
    expect(spec('ns')).toEqual({ source: './lib', name: '*' });
    expect(spec('eq')).toEqual({ source: './lib', name: '*' });
    expect(spec('alias')).toBeNull();
    expect(spec('computed')).toBeNull();
    expect(spec('rest')).toBeNull();
    expect(spec('picked')).toEqual({ source: './lib', name: 'a' });
    expect(spec('dynamic')).toBeNull();
    expect(spec('pkg')).toEqual({ source: 'pg', name: '*' });
    expect(spec('awaited')).toEqual({ source: './lib', name: '*' });
    expect(spec('imported')).toBeNull();
    expect(spec('plain')).toBeNull();
    expect(spec('fn')).toBeNull();
    expect(importSpecifierOf({ defs: [] } as never)).toBeNull();
    expect(origin('named')?.name).toBe('x y');
    expect(origin('pkg')).toBeNull();
    expect(origin('plain')).toBeNull();
  });
});

describe('returnedValue and returnedValues', () => {
  const module = parseModule(
    [
      'const a = () => 1;',
      'function b() { log(); return 2; }',
      'function c() { return; }',
      'function d() { log(); }',
      'const e = 3;',
      'function f(x) { if (x) { return 1; } else return 2; }',
      'function g(x) { if (x) return 1; log(); }',
      'function h(x) { const inner = () => 9; if (x) return 1; throw new Error(); }',
      'function i() {}',
      'function j(x) { if (x) return; return 1; }',
      'function k() { throw new Error(); }',
      'function l(x) { if (x) return 1; }',
      'function m() { { return 1; } }',
      'function n() { {} }',
    ].join('\n'),
    '/r.ts',
    parser,
  )!;
  const fns = module.ast.body.map((statement) =>
    statement.type === 'VariableDeclaration'
      ? statement.declarations[0].init!
      : statement,
  );

  it('returnedValue reads concise bodies and trailing returns only', () => {
    expect(returnedValue(fns[0])?.type).toBe('Literal');
    expect(returnedValue(fns[1])?.type).toBe('Literal');
    expect(returnedValue(fns[2])).toBeNull();
    expect(returnedValue(fns[3])).toBeNull();
    expect(returnedValue(fns[4])).toBeNull();
  });

  it('returnedValues reads every return, or abstains when one is missing', () => {
    const values = (fn: TSESTree.Node) =>
      returnedValues(fn as TSESTree.FunctionLike)?.map(
        (n) => (n as TSESTree.Literal).value,
      ) ?? null;
    expect(values(fns[0])).toEqual([1]);
    expect(values(fns[5])?.sort()).toEqual([1, 2]);
    expect(values(fns[6])).toBeNull();
    expect(values(fns[7])).toEqual([1]);
    expect(values(fns[8])).toBeNull();
    expect(values(fns[9])).toBeNull();
    expect(values(fns[3])).toBeNull();
    expect(values(fns[10])).toBeNull();
    expect(values(fns[11])).toBeNull();
    expect(values(fns[12])).toEqual([1]);
    expect(values(fns[13])).toBeNull();
    expect(
      returnedValues({ body: null } as unknown as TSESTree.FunctionLike),
    ).toBeNull();
  });
});

describe('singleWrite', () => {
  it('is the one write a binding gets, never a parameter', () => {
    const module = parseModule(
      'const a = 1;\nlet b = 1; b = 2;\nfunction f(p) { p = 3; }\nlet c;',
      '/s.ts',
      parser,
    )!;
    const env = moduleEnv(module, parser);
    const scope = env.scopeOf(module.ast);
    expect((singleWrite(lookup('a', scope)!) as TSESTree.Literal).value).toBe(
      1,
    );
    expect(singleWrite(lookup('b', scope)!)).toBeNull();
    expect(singleWrite(lookup('c', scope)!)).toBeNull();
    const fn = module.ast.body[3] as TSESTree.FunctionDeclaration;
    const inner = env.scopeOf(fn.body);
    expect(singleWrite(lookup('p', inner)!)).toBeNull();
  });
});

describe('follow', () => {
  it('follows bindings, awaits, casts, calls, chains and members within a file', () => {
    expect(landsOn('const a = { v: 1 };\nprobe(a.v);')).toBe('1');
    expect(landsOn('const a = 1 as number;\nprobe(a);')).toBe('1');
    expect(
      landsOn(
        'async function f() { const a = await g(); }\nfunction g() { return 2; }\nprobe(g());',
      ),
    ).toBe('2');
    expect(
      landsOn(
        'const cfg = { ssl: { r: false } };\nconst { ssl } = cfg;\nprobe(ssl.r);',
      ),
    ).toBe('false');
    expect(landsOn('let a;\na = 5;\nprobe(a);')).toBe('5');
    expect(landsOn('const a = { v: 6 };\nprobe(a?.v);')).toBe('6');
    expect(
      landsOn('function g() { return 7; }\nconst a = await g();\nprobe(a);'),
    ).toBe('7');
    expect(landsOn('class K {}\nprobe(K);')).toBe('class K {}');
  });

  it('stops where a value cannot be followed', () => {
    expect(landsOn('probe(undeclared);')).toBe('undeclared');
    expect(landsOn('let a = 1;\na = 2;\nprobe(a);')).toBe('a');
    expect(landsOn('let a;\na++;\nprobe(a);')).toBe('a');
    expect(landsOn('function f(p) { probe(p); }\nprobe(0);')).toBe('0');
    expect(landsOn('const { [k]: v } = obj;\nprobe(v);')).toBe('v');
    expect(landsOn('const { v } = make();\nprobe(v);')).toBe('v');
    expect(landsOn('const { ...rest } = cfg;\nprobe(rest);')).toBe('rest');
    expect(landsOn('const { w } = { v: 1 };\nprobe(w);')).toBe('w');
    expect(
      landsOn('for (const { v } of list) {}\nconst { a } = c;\nprobe(a);'),
    ).toBe('a');
    expect(landsOn('const a = { v: 1 };\nprobe(a[k]);')).toBe('a[k]');
    expect(landsOn('const a = { v: 1 };\nprobe(a.w);')).toBe('a.w');
    expect(landsOn('const a = make();\nprobe(a.w);')).toBe('a.w');
    expect(landsOn('probe(unknown());')).toBe('unknown()');
    expect(landsOn('probe(1);')).toBe('1');
    expect(landsOn('const a = b;\nconst b = a;\nprobe(a);')).toMatch(/^[ab]$/);
  });

  it('stops at the depth bound', () => {
    const chain = Array.from(
      { length: 12 },
      (_, i) => `const a${i + 1} = a${i};`,
    ).join('\n');
    expect(landsOn(`const a0 = 1;\n${chain}\nprobe(a12);`)).not.toBe('1');
  });

  it('follows imports across files: named, default, namespace, CommonJS and JSON', () => {
    const extra = {
      'cfg.ts': 'export const db = { ssl: 1 };\nexport default { d: 2 };',
      'cfg.json': '{ "j": 3 }',
      'cfg.cjs': 'module.exports = { c: 4 };',
      'ns.cjs': 'exports.n = 5;',
    };
    expect(landsOn("import { db } from './cfg';\nprobe(db.ssl);", extra)).toBe(
      '1',
    );
    expect(landsOn("import d from './cfg';\nprobe(d.d);", extra)).toBe('2');
    expect(
      landsOn("import * as cfg from './cfg';\nprobe(cfg.db);", extra),
    ).toBe('{ ssl: 1 }');
    expect(
      landsOn("import * as cfg from './cfg';\nprobe(cfg.none);", extra),
    ).toBe('cfg.none');
    expect(landsOn("import * as cfg from './cfg';\nprobe(cfg);", extra)).toBe(
      '<namespace>',
    );
    expect(landsOn("import j from './cfg.json';\nprobe(j.j);", extra)).toBe(
      '3',
    );
    expect(landsOn("const c = require('./cfg.cjs');\nprobe(c.c);", extra)).toBe(
      '4',
    );
    expect(
      landsOn("const ns = require('./ns.cjs');\nprobe(ns.n);", extra),
    ).toBe('5');
    expect(landsOn("import { none } from './cfg';\nprobe(none);", extra)).toBe(
      'none',
    );
  });
});
