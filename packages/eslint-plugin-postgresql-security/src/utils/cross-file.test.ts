/**
 * Unit locks for cross-file resolution and value following, on real files.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  exportedValue,
  follow,
  importOrigin,
  loadModule,
  lookup,
  moduleEnv,
  parseModule,
  resolveRelative,
  returnedValue,
  type ModuleInfo,
  type Value,
} from './cross-file';

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-cross-file-unit-'));
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
  const node = call.arguments[0];
  const env = moduleEnv(module, parser);
  return { node, scope: env.scopeOf(node), env };
}

/** Follow the probe of a one-file module and return what it lands on, as source text. */
function landsOn(code: string, extra: Record<string, string> = {}): string {
  const dir = files({ 'main.ts': code, ...extra });
  const module = load(dir, 'main.ts');
  const value = follow(probe(module));
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

describe('exportedValue', () => {
  const dir = files({
    'm.ts': [
      'export default { kind: "default" };',
      'export const named = 1;',
      'export let empty;',
      'export function fn() { return 2; }',
      'export class Klass {}',
      'const local = 3;',
      'export { local, local as renamed };',
      'export { undeclared };',
      "export { a as 'quoted' } from './other';",
      "export { x } from 'some-package';",
      "export { y } from './missing';",
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
    ].join('\n'),
    'cjs2.js': 'module.exports = factory();',
  });
  const m = load(dir, 'm.ts');
  const text = (value: Value | null): string | null =>
    value === null
      ? null
      : fs
          .readFileSync(value.env.file, 'utf8')
          .slice(...(value.node.range as [number, number]));

  it('finds default, const, function and specifier exports', () => {
    expect(text(exportedValue(m, 'default', parser))).toBe(
      '{ kind: "default" }',
    );
    expect(text(exportedValue(m, 'named', parser))).toBe('1');
    expect(text(exportedValue(m, 'fn', parser))).toMatch(/^function fn/);
    expect(text(exportedValue(m, 'local', parser))).toBe('3');
    expect(text(exportedValue(m, 'renamed', parser))).toBe('3');
    expect(text(exportedValue(m, 'quoted', parser))).toBe('4');
    expect(text(exportedValue(load(dir, 'other.ts'), 'b c', parser))).toBe('5');
  });

  it('abstains on what it cannot see', () => {
    expect(exportedValue(m, 'empty', parser)).toBeNull();
    expect(exportedValue(m, 'Klass', parser)).toBeNull();
    expect(exportedValue(m, 'undeclared', parser)).toBeNull();
    expect(exportedValue(m, 'x', parser)).toBeNull();
    expect(exportedValue(m, 'y', parser)).toBeNull();
    expect(exportedValue(m, 'nothing', parser)).toBeNull();
  });

  it('reads CommonJS exports', () => {
    const cjs = load(dir, 'cjs.js');
    expect(text(exportedValue(cjs, 'pool', parser))).toBe('1');
    expect(text(exportedValue(cjs, 'extra', parser))).toBe('2');
    expect(text(exportedValue(cjs, 'short', parser))).toBe('3');
    expect(text(exportedValue(cjs, 'default', parser))).toMatch(/^\{ pool/);
    expect(exportedValue(cjs, 'absent', parser)).toBeNull();
    expect(exportedValue(load(dir, 'cjs2.js'), 'pool', parser)).toBeNull();
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

describe('importOrigin', () => {
  it('reads string-named imports and abstains on unreadable requires', () => {
    const dir = files({
      'lib.ts': "const a = 1;\nexport { a as 'x y' };",
      'main.ts': [
        "import { 'x y' as named } from './lib';",
        "const { [k]: computed } = require('./lib');",
        "const { ...rest } = require('./lib');",
        'const dynamic = require(name);',
        "const pkg = require('pg');",
        'const plain = 1;',
        'probe(named);',
      ].join('\n'),
    });
    const module = load(dir, 'main.ts');
    const env = moduleEnv(module, parser);
    const scope = env.scopeOf(module.ast);
    const origin = (name: string) => importOrigin(lookup(name, scope)!, env);
    expect(origin('named')?.name).toBe('x y');
    expect(origin('computed')).toBeNull();
    expect(origin('rest')).toBeNull();
    expect(origin('dynamic')).toBeNull();
    expect(origin('pkg')).toBeNull();
    expect(origin('plain')).toBeNull();
  });
});

describe('returnedValue', () => {
  it('reads concise bodies and trailing returns only', () => {
    const module = parseModule(
      'const a = () => 1;\nfunction b() { log(); return 2; }\nfunction c() { return; }\nfunction d() { log(); }\nconst e = 3;',
      '/r.ts',
      parser,
    )!;
    const inits = module.ast.body.map((statement) =>
      statement.type === 'VariableDeclaration'
        ? statement.declarations[0].init!
        : statement,
    );
    expect(returnedValue(inits[0])?.type).toBe('Literal');
    expect(returnedValue(inits[1])?.type).toBe('Literal');
    expect(returnedValue(inits[2])).toBeNull();
    expect(returnedValue(inits[3])).toBeNull();
    expect(returnedValue(inits[4])).toBeNull();
  });
});

describe('follow', () => {
  it('follows bindings, awaits, casts, calls and members within a file', () => {
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
