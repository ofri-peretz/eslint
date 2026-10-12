/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Unit locks for the SQL-hole safety judge: what a value spliced into SQL
 * text has to be for the file to prove it fixed.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import { createOriginClassifier } from './driver-origin';
import { createSqlSafety, sqlStaticText } from './sql-safety';
import { loadModule, moduleEnv, valueAt } from './value-follow';

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'devkit-sql-safety-'));
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

const safety = createSqlSafety({
  origin: createOriginClassifier(['drv']),
  escapers: new Set(['escape', 'escapeId', 'format']),
  fragmentFactories: new Set(['join', 'identifier']),
  modules: ['drv'],
  escaperModules: ['sqlstring'],
});
const bare = createSqlSafety({
  origin: createOriginClassifier(['drv']),
  escapers: new Set(),
  fragmentFactories: new Set(),
  modules: ['drv'],
});

let counter = 0;
function probe(code: string, extra: Record<string, string> = {}) {
  const dir = path.join(ROOT, `s${counter++}`);
  for (const [name, text] of Object.entries({ 'main.ts': code, ...extra })) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), text);
  }
  const module = loadModule(path.join(dir, 'main.ts'), parser);
  if (module === null) throw new Error(`unparseable: ${code}`);
  let arg: TSESTree.Node | undefined;
  const visit = (node: TSESTree.Node): void => {
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'probe'
    ) {
      arg = node.arguments[0];
    }
    for (const [key, child] of Object.entries(node)) {
      if (key === 'parent') continue;
      for (const c of Array.isArray(child) ? child : [child]) {
        if (c && typeof c === 'object' && typeof c.type === 'string') visit(c);
      }
    }
  };
  visit(module.ast);
  return valueAt(arg as TSESTree.Node, moduleEnv(module, parser));
}
const safe = (code: string, extra?: Record<string, string>) =>
  safety.isSafe(probe(code, extra));

describe('createSqlSafety — fixed values', () => {
  it('literals, templates, arithmetic, logical and conditional parts', () => {
    expect(safe("probe('x');")).toBe(true);
    expect(safe('probe(-1);')).toBe(true);
    expect(safe('let i = 0;\nprobe(i++);')).toBe(true);
    expect(safe("probe(`a${'b'}`);")).toBe(true);
    expect(safe('probe(`a${x}`);')).toBe(false);
    expect(safe('probe(x * 2);')).toBe(true);
    expect(safe("probe('a' + 'b');")).toBe(true);
    expect(safe("probe('a' + x);")).toBe(false);
    expect(safe("probe(x + 'a');")).toBe(false);
    expect(safe("probe('a' ?? 'b');")).toBe(true);
    expect(safe("probe(x || 'b');")).toBe(false);
    expect(safe("probe('a' || x);")).toBe(false);
    expect(safe("probe(c ? 'a' : 'b');")).toBe(true);
    expect(safe("probe(c ? x : 'b');")).toBe(false);
    expect(safe("probe(c ? 'a' : x);")).toBe(false);
    expect(safe("probe(await 'a');")).toBe(true);
    expect(safe("probe(o?.['a']);")).toBe(false);
    expect(safe('probe(undefined);')).toBe(true);
    expect(safe('probe(NaN);')).toBe(true);
    expect(safe('probe(globalThis);')).toBe(false);
    expect(safe('probe(Object);')).toBe(false);
    expect(safe('probe(x);')).toBe(false);
    expect(safe('probe(new Date());')).toBe(false);
  });

  it('a driver type, a driver tag', () => {
    expect(safe("import type { Raw } from 'drv';\nprobe(x as Raw);")).toBe(
      true,
    );
    expect(
      safe("import type { Raw } from 'drv';\nprobe(x satisfies Raw);"),
    ).toBe(true);
    expect(safe('probe(x as string);')).toBe(false);
    expect(safe("import { sql } from 'drv';\nprobe(sql`a`);")).toBe(true);
    expect(safe('probe(gql`a`);')).toBe(false);
  });
});

describe('createSqlSafety — bindings', () => {
  it('const, let builders, destructures, loops, imports', () => {
    expect(safe("const a = 'x';\nprobe(a);")).toBe(true);
    expect(safe("let a = 'x';\na += 'y';\nprobe(a);")).toBe(true);
    expect(safe("let a = 'x';\na += z;\nprobe(a);")).toBe(false);
    expect(safe('let a;\nprobe(a);')).toBe(false);
    expect(safe("let a = 'x';\na++;\nprobe(a);")).toBe(false);
    expect(safe("const { a } = { a: 'x' };\nprobe(a);")).toBe(true);
    expect(safe('const { a } = make();\nprobe(a);')).toBe(false);
    expect(safe("for (const a of ['x', 'y']) probe(a);")).toBe(true);
    expect(safe('for (const a of list) probe(a);')).toBe(false);
    expect(safe('function f() {}\nprobe(f);')).toBe(false);
    expect(safe("const a: 'x' | 'y' = pick();\nprobe(a);")).toBe(true);
    expect(
      safe(
        "import type { Raw } from 'drv';\nconst a: Raw = make();\nprobe(a);",
      ),
    ).toBe(true);
    expect(safe('const a: string = make();\nprobe(a);')).toBe(false);
    expect(
      safe("import { a } from './c';\nprobe(a);", {
        'c.ts': "export const a = 'x';",
      }),
    ).toBe(true);
    expect(
      safe("import * as c from './c';\nprobe(c);", {
        'c.ts': "export const a = 'x';",
      }),
    ).toBe(false);
    expect(
      safe("import { b } from './c';\nprobe(b);", {
        'c.ts': "export const a = 'x';",
      }),
    ).toBe(false);
    expect(safe("import { a } from 'pkg';\nprobe(a);")).toBe(false);
    expect(safe('class K {}\nprobe(K);')).toBe(false);
  });

  it('parameters: typed fixed, an array callback element or index', () => {
    expect(safe('function f(a: number) { probe(a); }')).toBe(true);
    expect(
      safe(
        'function f(a: boolean | null | undefined | 1n | bigint) { probe(a); }',
      ),
    ).toBe(true);
    expect(safe('enum D { A }\nfunction f(a: D) { probe(a); }')).toBe(true);
    expect(safe('function f(a: X) { probe(a); }')).toBe(false);
    expect(safe('function f(a: N.X) { probe(a); }')).toBe(false);
    expect(safe('function f(a: string[]) { probe(a); }')).toBe(false);
    expect(
      safe("import type { Raw } from 'drv';\nfunction f(a: Raw) { probe(a); }"),
    ).toBe(true);
    expect(safe('function f(a) { probe(a); }')).toBe(false);
    expect(safe("['a', 'b'].map((a) => probe(a));")).toBe(true);
    expect(safe('list.map((a) => probe(a));')).toBe(false);
    expect(safe('list.map((a, i) => probe(i));')).toBe(true);
    expect(safe('list.map((a, i, all) => probe(all));')).toBe(false);
    expect(safe('list.reduce((a) => probe(a));')).toBe(false);
    expect(safe('list[k]((a) => probe(a));')).toBe(false);
    expect(safe('list.map(0, (a) => probe(a));')).toBe(false);
    expect(safe('call((a) => probe(a));')).toBe(false);
    expect(safe('Array.from({ length: 3 }, (a) => probe(a));')).toBe(true);
    expect(safe("Array.from(['a'], (a) => probe(a));")).toBe(true);
    expect(safe('Array.from(list, (a) => probe(a));')).toBe(false);
    expect(safe('Array.from(list, (a, i) => probe(i));')).toBe(true);
    expect(safe('Other.from(list, (a) => probe(a));')).toBe(false);
    expect(safe('Array.of(list, (a) => probe(a));')).toBe(false);
    expect(safe('const f = ({ a }) => probe(a);')).toBe(false);
  });

  it('allowlist guards before the use', () => {
    expect(
      safe(
        'function f(a) { if (!/^[a-z]+$/.test(a)) throw new Error(); probe(a); }',
      ),
    ).toBe(true);
    expect(
      safe(
        'const RE = /^[a-z]+$/;\nfunction f(a) { if (!RE.test(a)) { return; } probe(a); }',
      ),
    ).toBe(true);
    expect(
      safe("function f(a) { if (!['x', 'y'].includes(a)) return; probe(a); }"),
    ).toBe(true);
    expect(
      safe(
        "const S = ['x'];\nfunction f(a) { if (S.includes(a)) { probe(a); } }",
      ),
    ).toBe(true);
    expect(
      safe(
        'function f(a) { for (;;) { if (!/^x$/.test(a)) continue; probe(a); } }',
      ),
    ).toBe(true);
    expect(
      safe(
        'function f(a) { for (;;) { if (!/^x$/.test(a)) break; probe(a); } }',
      ),
    ).toBe(true);
    expect(
      safe('function f(a) { if (!/[a-z]/.test(a)) throw 1; probe(a); }'),
    ).toBe(false);
    expect(
      safe('function f(a) { if (!/^[a-z]/.test(a)) throw 1; probe(a); }'),
    ).toBe(false);
    expect(safe('function f(a) { if (!re.test(a)) throw 1; probe(a); }')).toBe(
      false,
    );
    expect(
      safe('function f(a) { if (!list.includes(a)) throw 1; probe(a); }'),
    ).toBe(false);
    expect(
      safe("function f(a) { if (!['x'].some(a)) throw 1; probe(a); }"),
    ).toBe(false);
    expect(
      safe("function f(a) { probe(a); if (!['x'].includes(a)) throw 1; }"),
    ).toBe(false);
    expect(
      safe("function f(a) { if (!['x'].includes(a)) log(); probe(a); }"),
    ).toBe(false);
    expect(safe("function f(a) { if (!['x'].includes(a)) {} probe(a); }")).toBe(
      false,
    );
    expect(
      safe("function f(a) { if (['x'].includes(a)) log(); probe(a); }"),
    ).toBe(false);
    expect(
      safe("function f(a) { const ok = ['x'].includes(a); probe(a); }"),
    ).toBe(false);
    expect(
      safe("function f(a) { if (!!['x'].includes(a)) return; probe(a); }"),
    ).toBe(false);
    expect(safe('function f(a) { if (check(a)) return; probe(a); }')).toBe(
      false,
    );
    expect(safe('function f(a) { if (o[k](a)) return; probe(a); }')).toBe(
      false,
    );
    expect(
      safe(
        "function f(a) { log(a); if (x) { if (!['y'].includes(a)) return; } probe(a); }",
      ),
    ).toBe(false);
  });

  it('a ternary that returns the allowlisted value', () => {
    expect(
      safe("function f(a) { probe(['x', 'y'].includes(a) ? a : 'id'); }"),
    ).toBe(true);
    expect(
      safe("function f(a) { probe(!['x'].includes(a.b) ? 'id' : a.b); }"),
    ).toBe(true);
    expect(
      safe("function f(a, b) { probe(['x'].includes(a) ? b : 'id'); }"),
    ).toBe(false);
    expect(
      safe("function f(a) { probe(['x'].includes(a.b) ? a.c : 'id'); }"),
    ).toBe(false);
    expect(
      safe("function f(a) { probe(['x'].includes(a[k]) ? a[k] : 'id'); }"),
    ).toBe(false);
    expect(
      safe("function f(a) { probe(['x'].includes(a) ? a.b : 'id'); }"),
    ).toBe(false);
    expect(safe("function f(a) { probe(/^x$/.test(a) ? a : 'id'); }")).toBe(
      true,
    );
    expect(safe("function f(a) { probe(list.includes(a) ? a : 'id'); }")).toBe(
      false,
    );
    expect(safe("function f(a) { probe(['x'].find(a) ? a : 'id'); }")).toBe(
      false,
    );
    expect(
      safe("function f(a) { probe(['x'].includes(a, 1) ? a : 'id'); }"),
    ).toBe(false);
    expect(safe("function f(a) { probe(x ? a : 'id'); }")).toBe(false);
    expect(safe("function f(a) { probe(o[k](a) ? a : 'id'); }")).toBe(false);
  });
});

describe('createSqlSafety — members', () => {
  it('length, enums, const objects, class fields and fixed maps', () => {
    expect(safe('probe(list.length);')).toBe(true);
    expect(safe("enum D { A = 'a', B = 'b' }\nprobe(D.B);")).toBe(true);
    expect(safe('enum D { A, B }\nprobe(D.B);')).toBe(true);
    expect(safe("enum D { 'x y' = 'a' }\nprobe(D['x y']);")).toBe(true);
    expect(safe('enum D { A = make() }\nprobe(D.A);')).toBe(false);
    expect(safe('enum D { A }\nprobe(D.Z);')).toBe(false);
    expect(safe("const O = { a: 'x' };\nprobe(O.a);")).toBe(true);
    expect(safe("class K { t = 'x'; m() { probe(this.t); } }")).toBe(true);
    expect(safe('class K { t; m() { probe(this.t); } }')).toBe(false);
    expect(safe('class K { [k] = 1; m() { probe(this.t); } }')).toBe(false);
    expect(safe("class K { static T = 'x'; }\nprobe(K.T);")).toBe(true);
    expect(safe('function f() { probe(this.t); }')).toBe(false);
    expect(
      safe("const O = { a: 'x', b: 'y' };\nfunction f(k) { probe(O[k]); }"),
    ).toBe(true);
    expect(
      safe("const O = { a: 'x', ...rest };\nfunction f(k) { probe(O[k]); }"),
    ).toBe(false);
    expect(safe("const L = ['x', 'y'];\nfunction f(k) { probe(L[k]); }")).toBe(
      true,
    );
    expect(safe('function f(k) { probe(o[k]); }')).toBe(false);
    expect(safe('probe(o.p);')).toBe(false);
    expect(safe('probe(x.y.z);')).toBe(false);
  });
});

describe('createSqlSafety — calls', () => {
  it('number conversions and String()', () => {
    expect(safe('probe(Number(x));')).toBe(true);
    expect(safe('probe(Math.min(1, x));')).toBe(true);
    expect(safe('probe(Number.parseInt(x));')).toBe(true);
    expect(safe("probe(String('x'));")).toBe(true);
    expect(safe('probe(String());')).toBe(false);
    expect(safe('probe(String(x));')).toBe(false);
    expect(safe('probe(Boolean(x));')).toBe(true);
    expect(safe('probe(Symbol(x));')).toBe(false);
    expect(safe('const Math = make();\nprobe(Math.min(x));')).toBe(false);
  });

  it('escapers and fragment factories of the driver', () => {
    expect(safe("import drv from 'drv';\nprobe(drv.escape(x));")).toBe(true);
    expect(safe('probe(pool.escapeId(x));')).toBe(true);
    expect(safe("import S from 'sqlstring';\nprobe(S.escape(x));")).toBe(true);
    expect(safe("import util from 'util';\nprobe(util.format(x));")).toBe(
      false,
    );
    expect(safe("import { escape as e } from 'drv';\nprobe(e(x));")).toBe(true);
    expect(safe("import { other } from 'drv';\nprobe(other(x));")).toBe(false);
    expect(safe("import { format } from 'sqlstring';\nprobe(format(x));")).toBe(
      true,
    );
    expect(safe("import { thing } from 'pkg';\nprobe(thing(x));")).toBe(false);
    expect(safe("import drv from 'drv';\nprobe(drv.join(x));")).toBe(true);
    expect(safe('probe(other.identifier(x));')).toBe(false);
    expect(
      bare.isSafe(probe("import drv from 'drv';\nprobe(drv.escape(x));")),
    ).toBe(false);
  });

  it('inside a quoted token an escaper is only as safe as what it escaped', () => {
    const quoted = (code: string): boolean => safety.isSafe(probe(code), true);
    expect(quoted("import drv from 'drv';\nprobe(drv.escape(x));")).toBe(false);
    expect(quoted("import drv from 'drv';\nprobe(drv.escape('admin'));")).toBe(
      true,
    );
    expect(quoted("import { escape as e } from 'drv';\nprobe(e(x));")).toBe(
      false,
    );
    expect(quoted("import { escape as e } from 'drv';\nprobe(e(1));")).toBe(
      true,
    );
    expect(
      quoted(
        "import drv from 'drv';\nlet v = '';\nv = drv.escape(x);\nprobe(v);",
      ),
    ).toBe(false);
    // The flag lasts one call only.
    expect(safe("import drv from 'drv';\nprobe(drv.escape(x));")).toBe(true);
  });

  it('joined lists and string transforms', () => {
    expect(safe("probe(['a', 'b'].join(', '));")).toBe(true);
    expect(safe("probe(['a', , 'b'].join());")).toBe(true);
    expect(safe('probe([x].join());')).toBe(false);
    expect(safe("probe(['a'].join(sep));")).toBe(false);
    expect(safe("probe(list.map(() => '?').join(','));")).toBe(true);
    expect(safe('probe(list.map((v) => v).join(","));')).toBe(false);
    expect(safe('probe(list.map(cb).join(","));')).toBe(false);
    expect(
      safe("probe(list.flatMap(() => { if (x) return '?'; }).join());"),
    ).toBe(false);
    expect(safe('probe(list.map().join());')).toBe(false);
    expect(safe("probe(Array(3).fill('?').join(','));")).toBe(true);
    expect(safe("probe(new Array(3).fill('?').join(','));")).toBe(true);
    expect(safe("probe(Array(1, 2).fill('?').join(','));")).toBe(true);
    expect(safe("probe(Array(x).fill('?').join(','));")).toBe(true);
    expect(safe("probe(Array(x).fill('?', 1).join(','));")).toBe(false);
    expect(safe("probe(Array('a', 'b').fill('?', 1).join(','));")).toBe(true);
    expect(safe('probe(Array(3).fill(x).join(","));')).toBe(false);
    expect(safe('probe(Array(3).fill().join(","));')).toBe(false);
    expect(safe("probe(Array.from({ length: 2 }, () => '?').join());")).toBe(
      true,
    );
    expect(safe("probe(Array.from(['a']).join());")).toBe(true);
    expect(safe('probe(Array.from().join());')).toBe(false);
    expect(safe('probe(Object.keys({ a: 1, b: x }).join());')).toBe(true);
    expect(safe("probe(Object.values({ a: 'x' }).join());")).toBe(true);
    expect(safe('probe(Object.values({ a: x }).join());')).toBe(false);
    expect(safe('probe(Object.keys({ [k]: 1 }).join());')).toBe(false);
    expect(safe('probe(Object.keys({ ...o }).join());')).toBe(false);
    expect(safe('probe(Object.keys(o).join());')).toBe(false);
    expect(safe('probe(Object.keys().join());')).toBe(false);
    expect(safe('probe(Object.entries({}).join());')).toBe(false);
    expect(safe("probe(['b', 'a'].sort().concat(['c']).join());")).toBe(true);
    expect(safe("probe(['b'].concat(list).join());")).toBe(false);
    expect(safe("probe(['b'].filter(Boolean).join());")).toBe(true);
    expect(safe("probe(['b'].reduce(f).join());")).toBe(false);
    expect(safe('probe(make().join());')).toBe(false);
    expect(safe("const O = { l: ['a'] };\nprobe(O.l.join());")).toBe(true);
    expect(safe('probe(o.l.join());')).toBe(false);
    expect(safe("probe('x'.join());")).toBe(false);
    expect(safe("probe('?,'.repeat(ids.length).slice(0, -1));")).toBe(true);
    expect(safe("probe(['a', 'b']);")).toBe(true);
    expect(safe('probe(x.trim());')).toBe(false);
    expect(safe("probe('a'.concat(x));")).toBe(false);
    expect(safe('probe(f()());')).toBe(false);
    expect(safe('probe(o[k]());')).toBe(false);
  });

  it('a list built by push, and lists handed elsewhere', () => {
    expect(
      safe(
        "const l = [];\nl.push('a');\nl.unshift('b');\nl.slice();\nprobe(l.join());",
      ),
    ).toBe(true);
    expect(safe('const l = [];\nl.push(x);\nprobe(l.join());')).toBe(false);
    expect(safe('const l = [];\nfill(l);\nprobe(l.join());')).toBe(false);
    expect(safe('const l = [];\nnew Fill(l);\nprobe(l.join());')).toBe(false);
    expect(safe("let l = ['a'];\nl = make();\nprobe(l.join());")).toBe(false);
    expect(safe("let l = ['a'];\nl++;\nprobe(l.join());")).toBe(false);
    expect(safe("const l = ['a'];\nconst m = l;\nprobe(l.join());")).toBe(true);
    expect(safe('function f(l) { probe(l.join()); }')).toBe(false);
    expect(safe('probe(undeclared.join());')).toBe(false);
  });

  it('a local function every return of which is safe', () => {
    expect(
      safe("function f(k) { if (k) return 'a'; return 'b'; }\nprobe(f(x));"),
    ).toBe(true);
    expect(safe('function f(k) { return k; }\nprobe(f(x));')).toBe(false);
    expect(safe('function f() { log(); }\nprobe(f());')).toBe(false);
    expect(
      safe("import { f } from './h';\nprobe(f());", {
        'h.ts': "export function f() { return 'a'; }",
      }),
    ).toBe(true);
  });

  it('stops at the depth bound and on cycles', () => {
    const chain = Array.from(
      { length: 12 },
      (_, i) => `const a${i + 1} = a${i};`,
    ).join('\n');
    expect(safe(`const a0 = 'x';\n${chain}\nprobe(a12);`)).toBe(false);
    const lists = Array.from(
      { length: 12 },
      (_, i) => `const l${i + 1} = l${i}.slice();`,
    ).join('\n');
    expect(safe(`const l0 = ['x'];\n${lists}\nprobe(l12.join());`)).toBe(false);
    expect(safe('let a = b;\nlet b = a;\nprobe(a);')).toBe(false);
  });
});

describe('sqlStaticText', () => {
  it('reads templates, + chains and literals, holes as nothing', () => {
    const text = (code: string) => sqlStaticText(probe(code).node);
    expect(text('probe(`SELECT ${x} FROM t`);')).toBe('SELECT  FROM t');
    expect(text("probe('a ' + x + ' b');")).toBe('a  b');
    expect(text('probe(x);')).toBe('');
  });
});
