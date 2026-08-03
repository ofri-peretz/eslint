/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock for the inlined `AST_NODE_TYPES` table.
 *
 * `ast-node-types.ts` inlines the 168 node-type strings so this package has
 * ZERO runtime dependencies. That is only safe while the table matches the
 * real enum exactly — this test is what makes it safe.
 * `@typescript-eslint/utils` is a devDependency here, so the genuine enum is
 * available at test time.
 *
 * If this fails, upstream added, removed, or renamed a node type. Regenerate:
 *
 *   node -e "const {AST_NODE_TYPES:A}=require('@typescript-eslint/types');
 *            console.log(Object.keys(A).sort().map(k=>'  '+k+\": '\"+k+\"',\").join('\n'))"
 *
 * and paste into `AST_NODE_TYPES_VALUES`. Do NOT weaken the assertion — a
 * missing entry means rules can never match that node type, which fails
 * silently and looks like a false negative.
 */
import { describe, expect, it } from 'vitest';
import { AST_NODE_TYPES as Upstream } from '@typescript-eslint/utils';

import { AST_NODE_TYPES } from './ast-node-types';

describe('inlined AST_NODE_TYPES', () => {
  const ours = AST_NODE_TYPES as unknown as Record<string, string>;
  const theirs = Upstream as unknown as Record<string, string>;

  it('has exactly the same keys as upstream — no additions, no omissions', () => {
    expect(Object.keys(ours).sort()).toEqual(Object.keys(theirs).sort());
  });

  it('maps every key to the identical string value', () => {
    // Deep-equality over the whole table catches renames that keep the key.
    expect({ ...ours }).toEqual({ ...theirs });
  });

  it('is self-mapped, which is the invariant the generator relies on', () => {
    for (const [key, value] of Object.entries(ours)) {
      expect(value).toBe(key);
    }
  });

  it('covers every node type this ecosystem actually references', () => {
    // Cheap smoke over the members the plugins use most; a typo in any of
    // these would otherwise surface as a rule that silently never fires.
    const hot = [
      'CallExpression',
      'Identifier',
      'Literal',
      'MemberExpression',
      'NewExpression',
      'ObjectExpression',
      'Property',
      'TemplateLiteral',
      'VariableDeclarator',
      'ImportDeclaration',
      'JSXAttribute',
      'JSXElement',
      'TSTypeReference',
      'AwaitExpression',
      'ArrowFunctionExpression',
    ];
    for (const t of hot) {
      expect(ours[t]).toBe(theirs[t]);
    }
  });
});
