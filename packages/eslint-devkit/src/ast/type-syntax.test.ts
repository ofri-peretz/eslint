/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { parse } from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { describe, expect, it } from 'vitest';

import { isTypeSyntaxWrapper, unwrapTypeSyntax } from './type-syntax';

/** The initialiser of `const x = <expr>` in a one-line program. */
function initOf(code: string): TSESTree.Node {
  const program = parse(code, { range: true, loc: true });
  const decl = program.body[0] as TSESTree.VariableDeclaration;
  return decl.declarations[0].init as TSESTree.Node;
}

describe('unwrapTypeSyntax', () => {
  it.each([
    ['const x = req.query.q as string;', 'the cast an Express+TS handler must write to compile'],
    ['const x = req.query.q!;', 'non-null assertion'],
    ['const x = req.query.q satisfies string;', 'satisfies'],
    ['const x = <string>req.query.q;', 'legacy angle-bracket assertion'],
  ])('%s → the underlying member expression (%s)', (code) => {
    const unwrapped = unwrapTypeSyntax(initOf(code));
    expect(unwrapped.type).toBe(AST_NODE_TYPES.MemberExpression);
  });

  it('strips nested wrappers, which occur in real code as (x as string)!', () => {
    const unwrapped = unwrapTypeSyntax(initOf('const x = (req.query.q as string)!;'));
    expect(unwrapped.type).toBe(AST_NODE_TYPES.MemberExpression);
  });

  it('leaves an ordinary expression untouched', () => {
    const node = initOf('const x = req.query.q;');
    expect(unwrapTypeSyntax(node)).toBe(node);
  });

  it('never unwraps something that changes the value at runtime', () => {
    // String(...) really does produce a different value, so provenance must not
    // treat it as transparent here — that is a separate, deliberate decision
    // each rule makes about sanitisers.
    const node = initOf('const x = String(req.query.q);');
    expect(unwrapTypeSyntax(node)).toBe(node);
    expect(node.type).toBe(AST_NODE_TYPES.CallExpression);
  });

  it('passes null and undefined straight through, so callers need no guard', () => {
    expect(unwrapTypeSyntax(null)).toBeNull();
    expect(unwrapTypeSyntax(undefined)).toBeUndefined();
  });

  it('returns the wrapper itself when it has no inner expression', () => {
    // Unreachable from a well-formed AST — all five wrapper types always carry
    // `.expression`. The guard exists so a malformed or partially-built node
    // (a codemod mid-edit, a hand-rolled fixture) yields the node back instead
    // of `undefined`, which every caller here would then treat as "no taint".
    // Constructed synthetically because a parser cannot produce it.
    const malformed = { type: AST_NODE_TYPES.TSAsExpression } as unknown as TSESTree.Node;
    expect(unwrapTypeSyntax(malformed)).toBe(malformed);
  });
});

describe('isTypeSyntaxWrapper', () => {
  it('identifies the wrappers', () => {
    expect(isTypeSyntaxWrapper(initOf('const x = a as string;'))).toBe(true);
    expect(isTypeSyntaxWrapper(initOf('const x = a!;'))).toBe(true);
  });

  it('rejects everything else, including null', () => {
    expect(isTypeSyntaxWrapper(initOf('const x = a;'))).toBe(false);
    expect(isTypeSyntaxWrapper(initOf('const x = f(a);'))).toBe(false);
    expect(isTypeSyntaxWrapper(null)).toBe(false);
    expect(isTypeSyntaxWrapper(undefined)).toBe(false);
  });
});
