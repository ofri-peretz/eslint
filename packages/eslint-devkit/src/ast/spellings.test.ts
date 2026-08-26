/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Every case here is a pair: two spellings of one thing, which must resolve to
 * the same answer. That framing is the point — a test that only ever writes
 * the common spelling is written in the same blind spot as the rule, which is
 * why 1,156 misses survived a suite of 18,000 passing cases.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
  staticString,
  isStaticString,
  propertyName,
  objectKeyName,
  memberPath,
} from './spellings';

/** The first expression statement's expression, which is what each case is. */
function expressionOf(code: string): TSESTree.Expression {
  const program = parse(code, { ecmaVersion: 2022, sourceType: 'module' });
  const first = program.body[0];
  if (first?.type !== AST_NODE_TYPES.ExpressionStatement)
    throw new Error(`not an expression: ${code}`);
  return first.expression;
}

const member = (code: string): TSESTree.MemberExpression => {
  const node = expressionOf(code);
  if (node.type !== AST_NODE_TYPES.MemberExpression)
    throw new Error(`not a member: ${code}`);
  return node;
};

const firstProperty = (code: string): TSESTree.Property => {
  const node = expressionOf(code);
  if (node.type !== AST_NODE_TYPES.ObjectExpression)
    throw new Error(`not an object: ${code}`);
  const prop = node.properties[0];
  if (prop?.type !== AST_NODE_TYPES.Property)
    throw new Error(`not a property: ${code}`);
  return prop;
};

describe('staticString', () => {
  it('reads a quoted string and a template literal as the same value', () => {
    expect(staticString(expressionOf(`'sha1'`))).toBe('sha1');
    expect(staticString(expressionOf('`sha1`'))).toBe('sha1');
  });

  it('declines a template literal with an expression, which has no single value', () => {
    expect(staticString(expressionOf('`sha${n}`'))).toBeNull();
  });

  it('declines a non-string literal and a variable', () => {
    expect(staticString(expressionOf('1'))).toBeNull();
    expect(staticString(expressionOf('x'))).toBeNull();
  });

  it('declines nothing at all', () => {
    expect(staticString(null)).toBeNull();
    expect(staticString(undefined)).toBeNull();
  });

  it('reads an empty template literal as the empty string', () => {
    expect(staticString(expressionOf('``'))).toBe('');
  });

  it('compares against a value in either spelling', () => {
    expect(isStaticString(expressionOf(`'md5'`), 'md5')).toBe(true);
    expect(isStaticString(expressionOf('`md5`'), 'md5')).toBe(true);
    expect(isStaticString(expressionOf(`'sha256'`), 'md5')).toBe(false);
  });
});

describe('propertyName', () => {
  it('reads all three spellings of the same property', () => {
    expect(propertyName(member('crypto.createHash'))).toBe('createHash');
    expect(propertyName(member(`crypto['createHash']`))).toBe('createHash');
    expect(propertyName(member('crypto[`createHash`]'))).toBe('createHash');
  });

  it('declines a key decided at runtime', () => {
    expect(propertyName(member('obj[k]'))).toBeNull();
    expect(propertyName(member('obj[`a${b}`]'))).toBeNull();
  });

  it('declines a private name, which is not a string property', () => {
    expect(propertyName(member('this.#secret'))).toBeNull();
  });
});

describe('objectKeyName', () => {
  it('reads all four spellings of the same key', () => {
    expect(objectKeyName(firstProperty('({ threshold: 1 })'))).toBe(
      'threshold',
    );
    expect(objectKeyName(firstProperty(`({ 'threshold': 1 })`))).toBe(
      'threshold',
    );
    expect(objectKeyName(firstProperty(`({ ['threshold']: 1 })`))).toBe(
      'threshold',
    );
    expect(objectKeyName(firstProperty('({ [`threshold`]: 1 })'))).toBe(
      'threshold',
    );
  });

  it('reads a numeric key as its source text, because obj[200] and obj["200"] are one property', () => {
    expect(objectKeyName(firstProperty('({ 200: 1 })'))).toBe('200');
  });

  it('declines a key decided at runtime', () => {
    expect(objectKeyName(firstProperty('({ [k]: 1 })'))).toBeNull();
  });
});

describe('memberPath', () => {
  it('spells a chain the same way however it was written', () => {
    expect(memberPath(expressionOf('crypto.createHash'))).toEqual([
      'crypto',
      'createHash',
    ]);
    expect(memberPath(expressionOf(`crypto['createHash']`))).toEqual([
      'crypto',
      'createHash',
    ]);
    expect(memberPath(expressionOf(`a['b'].c`))).toEqual(['a', 'b', 'c']);
  });

  it('declines the whole path when any single link is dynamic', () => {
    // Partial paths are worse than none: `a[k].createHash` matching
    // `['a', 'createHash']` would let any object impersonate the one the rule
    // is looking for.
    expect(memberPath(expressionOf('a[k].c'))).toBeNull();
  });

  it('declines a root that is not a name', () => {
    expect(memberPath(expressionOf('f().b'))).toBeNull();
    expect(memberPath(expressionOf('1'))).toBeNull();
  });
});
