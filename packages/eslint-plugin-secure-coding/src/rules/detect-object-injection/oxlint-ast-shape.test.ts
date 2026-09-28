/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The rule under the AST oxlint actually hands a JS plugin (#1147).
 *
 * typescript-estree leaves an absent type annotation `undefined`; oxc's ESTree
 * serialization — what oxlint passes to every JS plugin — sets it to `null`.
 * Checked on oxlint 1.83.0 / oxc-parser: for `function f(bag, dst: string[])`
 * the first param's `typeAnnotation` is `null`, and so are `returnType` and a
 * declarator id's `typeAnnotation`.
 *
 * `isProvablyArray` tested `annotation !== undefined`, which `null` passes, and
 * then read `annotation.typeAnnotation`. Every RuleTester case here is parsed
 * by typescript-estree, so the suite stayed green while oxlint threw
 *
 *   TypeError: Cannot read properties of null (reading 'typeAnnotation')
 *       at isProvablyArray
 *
 * on the untyped-receiver control in write-path-branches.test.ts. A throwing
 * JS rule aborts the file under oxlint, so the weekly parity bench saw every
 * finding on that fixture — this rule's AND import-next's — as an oxlint miss.
 *
 * The parser below is typescript-estree with the one difference that matters
 * made explicit: an absent type slot is `null`. The scope manager is the
 * parser's own and still points at these same node objects.
 */
import { describe, expect, it } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as tsParser from '@typescript-eslint/parser';
import { detectObjectInjection } from './index';

/** Type slots oxc serializes as `null` where typescript-estree leaves `undefined`. */
const NULLABLE_TYPE_SLOTS = [
  'typeAnnotation',
  'returnType',
  'typeParameters',
  'typeArguments',
] as const;

function nullAbsentTypeSlots(
  node: unknown,
  seen = new WeakSet<object>(),
): void {
  if (typeof node !== 'object' || node === null || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const child of node) nullAbsentTypeSlots(child, seen);
    return;
  }
  const record = node as Record<string, unknown>;
  if (typeof record.type !== 'string') return;
  for (const slot of NULLABLE_TYPE_SLOTS) {
    if (slot in record && record[slot] === undefined) record[slot] = null;
  }
  for (const [key, value] of Object.entries(record)) {
    if (key === 'parent') continue;
    nullAbsentTypeSlots(value, seen);
  }
}

const oxcShapedParser = {
  meta: { name: 'typescript-estree-with-oxc-null-slots' },
  parseForESLint(code: string, options?: tsParser.ParserOptions) {
    const result = tsParser.parseForESLint(code, options);
    nullAbsentTypeSlots(result.ast);
    return result;
  },
};

describe('the oxc-shaped parser', () => {
  it('turns an absent parameter annotation into null, as oxlint does', () => {
    const { ast } = oxcShapedParser.parseForESLint(
      'export function f(bag, dst: string[]) {}',
      { range: true, loc: true },
    );
    const decl = ast.body[0] as {
      declaration: { params: Array<{ typeAnnotation: unknown }> };
    };
    // Without this, every case below could pass on an AST oxlint never sees.
    expect(decl.declaration.params[0].typeAnnotation).toBeNull();
    expect(decl.declaration.params[1].typeAnnotation).not.toBeNull();
  });
});

const ruleTester = new RuleTester({
  languageOptions: { parser: oxcShapedParser },
});

ruleTester.run(
  'detect-object-injection — oxlint AST shape',
  detectObjectInjection,
  {
    valid: [
      {
        // The exemption must survive the fix, not just stop throwing: an
        // annotated Array parameter still proves the index is a number.
        name: 'an Array-annotated parameter still exempts its forEach index',
        code: `export function f(vals: string[], dst) { vals.forEach((v, k) => { dst[k] = v; }); }`,
      },
      {
        name: 'a readonly Array annotation still exempts its forEach index',
        code: `export function f(vals: readonly string[], dst) { vals.forEach((v, k) => { dst[k] = v; }); }`,
      },
    ],
    invalid: [
      {
        // The exact fixture #1147 failed on.
        name: 'an untyped receiver parameter reports instead of throwing',
        code: `export function f(bag, dst) { bag.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // One hop through a const reaches the same Parameter branch.
        name: 'a const alias of an untyped parameter reports instead of throwing',
        code: `export function f(bag, dst) { const xs = bag; xs.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
    ],
  },
);
