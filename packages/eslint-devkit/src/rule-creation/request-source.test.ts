/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Unit locks for the structural request-source recogniser. Handler
 * parameters are named `foo` / `bar`: the request is recognised by where it
 * comes from, never by what it is called.
 */
import { describe, expect, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  hasPayloadDecorator,
  isGlobal,
  isRequestPayload,
} from './request-source';
import { moduleEnv, parseModule, valueAt } from './value-follow';

/** Is the argument of the last `probe(…)` call the request payload? */
function payload(code: string): boolean {
  const module = parseModule(code, '/virtual/req.ts', parser);
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
  return isRequestPayload(valueAt(arg as TSESTree.Node, env).node, env);
}

describe('isRequestPayload', () => {
  it('reads body / query / params / payload off a handler parameter or an undeclared name', () => {
    expect(payload('(foo) => probe(foo.body);')).toBe(true);
    expect(payload('(foo) => probe(foo.query);')).toBe(true);
    expect(payload('(foo) => probe(foo.params);')).toBe(true);
    expect(payload('(foo) => probe(foo.payload);')).toBe(true);
    expect(payload('probe(req.body);')).toBe(true);
    expect(payload('(foo) => probe(foo.request.body);')).toBe(true);
    expect(
      payload('(foo) => { const bar = foo.request; probe(bar.body); };'),
    ).toBe(true);
    expect(payload('(foo) => probe((foo as any).body!);')).toBe(true);
  });

  it('is not fooled by a local object with the same keys', () => {
    expect(payload('const foo = { body: 1 };\nprobe(foo.body);')).toBe(false);
    expect(payload('(foo) => probe(foo.body.name);')).toBe(false);
    expect(payload('(foo) => probe(foo.data);')).toBe(false);
    expect(payload('(foo) => probe(foo[k]);')).toBe(false);
    expect(payload('(foo) => probe(foo().body);')).toBe(false);
    expect(payload('(foo) => probe(foo.other.body);')).toBe(false);
    expect(payload('let foo;\nfoo = a;\nfoo = b;\nprobe(foo.body);')).toBe(
      false,
    );
  });

  it('reads the Fetch Request body readers and their re-shapes', () => {
    expect(payload('async (foo) => probe(await foo.json());')).toBe(true);
    expect(payload('async (foo) => probe(await foo.formData());')).toBe(true);
    expect(
      payload(
        'async (foo) => probe(Object.fromEntries(await foo.formData()));',
      ),
    ).toBe(true);
    expect(payload('(foo) => probe(JSON.parse(foo.body));')).toBe(true);
    expect(
      payload('async (foo) => { const bar = await foo.json(); probe(bar); };'),
    ).toBe(true);
    expect(payload('(foo) => probe(foo.json(1));')).toBe(false);
    expect(payload('(foo) => probe(JSON.stringify(foo.body));')).toBe(false);
    expect(payload('(foo) => probe(Object.keys(foo.body));')).toBe(false);
    expect(
      payload(
        'const JSON = { parse: (x) => x };\n(foo) => probe(JSON.parse(foo.body));',
      ),
    ).toBe(false);
    expect(payload('probe(JSON.parse());')).toBe(false);
    expect(payload('probe(parse(x));')).toBe(false);
    expect(payload('(foo) => probe(foo[k]());')).toBe(false);
    expect(payload('probe(1);')).toBe(false);
  });

  it('reads framework payload decorators through their import', () => {
    expect(
      payload(
        "import { Body as B } from '@nestjs/common';\nclass C { m(@B() foo) { probe(foo); } }",
      ),
    ).toBe(true);
    expect(
      payload(
        "import { QueryParams } from 'routing-controllers';\nclass C { m(@QueryParams() foo) { probe(foo); } }",
      ),
    ).toBe(true);
    expect(
      payload(
        "import { Body } from 'other';\nclass C { m(@Body() foo) { probe(foo); } }",
      ),
    ).toBe(false);
    expect(payload('class C { m(@Body() foo) { probe(foo); } }')).toBe(false);
    expect(payload('class C { m(@Body foo) { probe(foo); } }')).toBe(false);
    expect(payload('class C { m(@x.Body() foo) { probe(foo); } }')).toBe(false);
    expect(payload('(foo) => probe(foo);')).toBe(false);
  });

  it('reads a handler that destructures its request', () => {
    expect(payload('({ body }) => probe(body);')).toBe(true);
    expect(payload('({ headers }) => probe(headers);')).toBe(false);
    expect(payload('([body]) => probe(body);')).toBe(false);
    expect(payload('({ [k]: body }) => probe(body);')).toBe(false);
  });

  it('follows a binding to the payload, including the rest of a destructure', () => {
    expect(payload('(foo) => { const bar = foo.body; probe(bar); };')).toBe(
      true,
    );
    expect(
      payload('(foo) => { const { id, ...bar } = foo.body; probe(bar); };'),
    ).toBe(true);
    expect(payload('(foo) => { const { id } = foo.body; probe(id); };')).toBe(
      false,
    );
    expect(payload('(foo) => { const [bar] = foo.body; probe(bar); };')).toBe(
      false,
    );
    expect(payload('const { ...bar } = make();\nprobe(bar);')).toBe(false);
    expect(payload('function bar() {}\nprobe(bar);')).toBe(false);
    expect(payload('probe(undeclared);')).toBe(false);
    expect(payload('let bar;\nprobe(bar);')).toBe(false);
  });

  it('stops at the depth bound', () => {
    const chain = Array.from(
      { length: 12 },
      (_, i) => `const a${i + 1} = a${i};`,
    ).join('\n');
    expect(
      payload(`(foo) => { const a0 = foo.body;\n${chain}\nprobe(a12); };`),
    ).toBe(false);
    const holders = Array.from(
      { length: 12 },
      (_, i) => `const h${i + 1} = h${i};`,
    ).join('\n');
    expect(
      payload(`(foo) => { const h0 = foo;\n${holders}\nprobe(h12.body); };`),
    ).toBe(false);
  });
});

describe('hasPayloadDecorator', () => {
  it('is false for a parameter node that carries no decorator list (espree)', () => {
    const module = parseModule('x;', '/d.ts', parser)!;
    expect(
      hasPayloadDecorator(
        { type: 'Identifier', name: 'x' } as TSESTree.Node,
        moduleEnv(module, parser),
      ),
    ).toBe(false);
  });
});

describe('isGlobal', () => {
  it('is true for an undeclared name or a TS lib global, false for a local', () => {
    const module = parseModule(
      'const local = 1;\nlocal; Object; undeclared;',
      '/g.ts',
      parser,
    )!;
    const env = moduleEnv(module, parser);
    const ids = module.ast.body
      .slice(1)
      .map(
        (s) =>
          (s as TSESTree.ExpressionStatement).expression as TSESTree.Identifier,
      );
    expect(isGlobal(ids[0], env)).toBe(false);
    expect(isGlobal(ids[1], env)).toBe(true);
    expect(isGlobal(ids[2], env)).toBe(true);
  });
});
