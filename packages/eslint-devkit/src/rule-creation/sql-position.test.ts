/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Unit locks for hole positions (value vs fragment) and request tracing.
 */
import { describe, expect, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  isQuoted,
  isRequestDerived,
  isValuePosition,
  sqlHoles,
} from './sql-position';
import { moduleEnv, parseModule, valueAt } from './value-follow';

function probeOf(code: string) {
  const module = parseModule(code, '/virtual/pos.ts', parser);
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
  const env = moduleEnv(module, parser);
  return { node: valueAt(arg as TSESTree.Node, env).node, env };
}

const holes = (code: string): [string, string][] => {
  const { node } = probeOf(code);
  return sqlHoles(node).map((h) => [
    h.expression.type === 'Identifier' ? h.expression.name : h.expression.type,
    h.preceding,
  ]);
};

describe('sqlHoles', () => {
  it('walks templates, + chains, ternary and ||/?? arms', () => {
    expect(holes('probe(`a ${x} b ${y}`);')).toEqual([
      ['x', 'a '],
      ['y', 'a  b '],
    ]);
    expect(holes("probe('a = ' + x + ' AND b = ' + y);")).toEqual([
      ['x', 'a = '],
      ['y', 'a =  AND b = '],
    ]);
    expect(holes("probe(`W ${c ? `AND x = '${v}'` : ''}`);")).toEqual([
      ['v', "W AND x = '"],
    ]);
    // Arms that build text are walked; arms that only choose a value are
    // judged whole, so `LIST.includes(x) ? x : 'id'` keeps its guard (the
    // Quint oracle 2026-10 found the guarded arm reported on its own).
    expect(holes('probe(`a ${x ?? `b ${y}`}`);')).toEqual([
      ['x', 'a '],
      ['y', 'a b '],
    ]);
    expect(holes('probe(`a ${x ?? y}`);')).toEqual([
      ['LogicalExpression', 'a '],
    ]);
    expect(holes("probe(`a ${L.includes(x) ? x : 'id'}`);")).toEqual([
      ['ConditionalExpression', 'a '],
    ]);
    expect(holes("probe(`a ${c ? (d ? `x ${v}` : '') : ''}`);")).toEqual([
      ['v', 'a x '],
    ]);
    expect(holes("probe(`a ${c ? 'x' + v : ''}`);")).toEqual([['v', 'a x']]);
    expect(holes('probe(`a ${x && y}`);')).toEqual([
      ['LogicalExpression', 'a '],
    ]);
    expect(holes("probe(`a ${'lit'} ${x as string}`);")).toEqual([
      ['x', 'a lit '],
    ]);
    expect(holes('probe(`a` + `${x}`);')).toEqual([['x', 'a']]);
    expect(holes('probe(x + (`a` + `b`));')).toEqual([['x', '']]);
  });
});

describe('isQuoted', () => {
  it('is true inside a string literal or right after an identifier quote', () => {
    for (const text of [
      "WHERE a = '",
      "WHERE a = 'it''s ",
      'ORDER BY `',
      'FROM [',
      'FROM "',
    ])
      expect(isQuoted(text), text).toBe(true);
    for (const text of ['WHERE a = ', "WHERE a = 'x' AND b = ", 'ORDER BY '])
      expect(isQuoted(text), text).toBe(false);
  });
});

describe('isValuePosition', () => {
  it('finds value positions', () => {
    for (const text of [
      'WHERE a = ',
      "WHERE a = '",
      "WHERE a LIKE '%",
      'WHERE a IN (',
      'WHERE a IN (1, ',
      'VALUES (',
      'VALUES (?, ',
      'LIMIT ',
      'WHERE a >= ',
      'WHERE a BETWEEN 1 AND 2 THEN ',
    ]) {
      expect(isValuePosition(text), text).toBe(true);
    }
    expect(isValuePosition('WHERE a = "', true)).toBe(true);
  });

  it('finds fragment positions', () => {
    for (const text of [
      'SELECT * FROM ',
      'SELECT * FROM t ORDER BY ',
      'PRAGMA x = ',
      'WHERE "a" = "',
      'SELECT `',
      'SELECT [',
      'INSERT INTO t (',
      'SELECT f(a) ',
      'SELECT * FROM t WHERE a IN (SELECT b FROM c) AND ',
      "WHERE a = 'it''s' AND ",
      '',
    ]) {
      expect(isValuePosition(text), text).toBe(false);
    }
  });
});

describe('isRequestDerived', () => {
  const derived = (code: string): boolean => {
    const { node, env } = probeOf(code);
    return isRequestDerived(node, env);
  };

  it('traces the request through members, text and bindings', () => {
    expect(derived('(foo) => probe(foo.query.sort);')).toBe(true);
    expect(derived('(foo) => probe(`${foo.query.sort} DESC`);')).toBe(true);
    expect(derived("(foo) => probe('x' + foo.body.a);")).toBe(true);
    expect(derived("(foo) => probe(foo.query.a || 'id');")).toBe(true);
    expect(derived("(foo) => probe(c ? foo.query.a : 'id');")).toBe(true);
    expect(derived("(foo) => probe(c ? 'id' : foo.query.a);")).toBe(true);
    expect(derived('(foo) => probe(x || foo.query.a);')).toBe(true);
    expect(
      derived(
        "import { format } from 'node:util';\n(foo) => probe(format('%s', foo.query.a));",
      ),
    ).toBe(true);
    expect(
      derived('(foo) => { const pick = () => foo.body.name; probe(pick()); };'),
    ).toBe(true);
    expect(derived('(foo) => probe(foo.query.a.toString());')).toBe(true);
    expect(
      derived(
        "import v from 'validator';\n(foo) => probe(v.escape(foo.query.a));",
      ),
    ).toBe(true);
    expect(derived('(foo) => probe(JSON.stringify(foo.query.a));')).toBe(true);
    // A lookup returns what the map holds, not its key.
    expect(
      derived('const m = new Map();\n(foo) => probe(m.get(foo.query.a));'),
    ).toBe(false);
    expect(derived('(foo, bar) => probe(bar.map.get(foo.query.a));')).toBe(
      false,
    );
    expect(derived('(foo) => probe(make().get(foo.query.a));')).toBe(false);
    expect(derived('async (foo) => probe(await foo.json());')).toBe(true);
    expect(derived('(foo) => probe(String(foo.query.a));')).toBe(true);
    expect(derived('(foo) => probe(foo.query.a.trim().toLowerCase());')).toBe(
      true,
    );
    expect(derived('(foo) => probe(Object.keys(foo.body).join(","));')).toBe(
      true,
    );
    expect(
      derived('(foo) => { const { sort } = foo.query; probe(sort); };'),
    ).toBe(true);
    expect(
      derived('(foo) => { for (const c of foo.body.cols) probe(c); };'),
    ).toBe(true);
    expect(derived('(foo) => { const bar = foo.query.s; probe(bar); };')).toBe(
      true,
    );
    expect(
      derived(
        '(foo) => { let bar = 1; bar = foo.query.s; probe(bar); bar = 2; };',
      ),
    ).toBe(true);
  });

  it('is false for values not traced to the request', () => {
    expect(derived('(foo) => probe(foo.sort);')).toBe(false);
    expect(derived("probe('x');")).toBe(false);
    expect(derived('probe(String());')).toBe(false);
    expect(derived('probe(make(1));')).toBe(false);
    expect(derived('probe(make(...args));')).toBe(false);
    expect(derived("const pick = () => 'x';\nprobe(pick());")).toBe(false);
    expect(
      derived('const pick = (a) => { if (a) return 1; };\nprobe(pick());'),
    ).toBe(false);
    expect(derived("import { pick } from './missing';\nprobe(pick());")).toBe(
      false,
    );
    expect(derived('probe(Object.keys());')).toBe(false);
    expect(derived('probe(Object.freeze(x));')).toBe(false);
    expect(derived('probe(Object[k](x));')).toBe(false);
    expect(derived('probe(await x);')).toBe(false);
    expect(derived('probe(other.keys(x));')).toBe(false);
    expect(derived('probe(x.pad());')).toBe(false);
    expect(derived('function f(bar) { probe(bar); }')).toBe(false);
    expect(derived('probe(undeclared);')).toBe(false);
    expect(derived('const { a } = {};\nprobe(a);')).toBe(false);
    expect(derived('let { a } = x;\nprobe(a);')).toBe(false);
    expect(derived('let bar;\nprobe(bar);')).toBe(false);
    expect(derived('let bar = 1;\nbar = 2;\nprobe(bar);')).toBe(false);
    expect(derived('for (const c of [1]) probe(c);')).toBe(false);
    expect(derived('for (const c in obj) probe(c);')).toBe(false);
  });

  it('stops at the depth bound', () => {
    const chain = Array.from(
      { length: 12 },
      (_, i) => `const a${i + 1} = a${i};`,
    ).join('\n');
    expect(
      derived(`(foo) => { const a0 = foo.query.s;\n${chain}\nprobe(a12); };`),
    ).toBe(false);
  });
});
