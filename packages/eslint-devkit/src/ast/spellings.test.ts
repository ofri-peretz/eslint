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
import * as parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import type { TSESLint } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
  staticString,
  isStaticString,
  propertyName,
  objectKeyName,
  memberPath,
  readsRequestShape,
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

describe('readsRequestShape', () => {
  /**
   * Exercised through a real rule, because the predicate's whole job is to ask
   * the SCOPE whether the receiver is a parameter. A hand-built scope stub
   * would test the stub.
   */
  const probe = {
    meta: { type: 'problem', schema: [], messages: { hit: 'hit' } },
    defaultOptions: [],
    create(context: TSESLint.RuleContext<'hit', []>) {
      return {
        MemberExpression(node: TSESTree.MemberExpression): void {
          if (readsRequestShape(node, context.sourceCode)) {
            context.report({ node, messageId: 'hit' });
          }
        },
      };
    },
  } as unknown as Parameters<Linter['verify']>[1];

  const hits = (code: string): number => {
    const linter = new Linter();
    const messages = linter.verify(
      code,
      [
        {
          files: ['**/*.ts'],
          plugins: { p: { rules: { probe } } } as never,
          languageOptions: {
            parser: parser as never,
            parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
          },
          rules: { 'p/probe': 'error' },
        },
      ],
      'c.ts',
    );
    return messages.filter((m) => m.ruleId !== null).length;
  };

  /** The same probe, with the depth rule for `body` turned off. */
  const shallowBodyHits = (code: string): number => {
    const shallow = {
      meta: { type: 'problem', schema: [], messages: { hit: 'hit' } },
      defaultOptions: [],
      create(context: TSESLint.RuleContext<'hit', []>) {
        return {
          MemberExpression(node: TSESTree.MemberExpression): void {
            if (
              readsRequestShape(node, context.sourceCode, {
                bodyNeedsDepth: false,
              })
            ) {
              context.report({ node, messageId: 'hit' });
            }
          },
        };
      },
    } as unknown as Parameters<Linter['verify']>[1];
    const linter = new Linter();
    return linter
      .verify(
        code,
        [
          {
            files: ['**/*.ts'],
            plugins: { p: { rules: { probe: shallow } } } as never,
            languageOptions: {
              parser: parser as never,
              parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
            },
            rules: { 'p/probe': 'error' },
          },
        ],
        'c.ts',
      )
      .filter((m) => m.ruleId !== null).length;
  };

  describe('bodyNeedsDepth', () => {
    // `body` is both a request property and the commonest property name in
    // this ecosystem, so at depth 1 it is too ambiguous to act on — that is
    // the default. A caller may turn the rule off when the POSITION already
    // supplies the meaning: `find(req.body)` as a Mongo filter document is the
    // canonical NoSQL authentication bypass, and nobody passes an arbitrary
    // `.body` there by accident. See ILB-0121.
    it('defaults to requiring depth, so a bare .body is not a request read', () => {
      expect(hits('function f(req) { g(req.body); }')).toBe(0);
      expect(hits('function f(req) { g(req.body.name); }')).toBeGreaterThan(0);
    });

    it('accepts a bare .body when the caller opts out', () => {
      expect(
        shallowBodyHits('function f(req) { g(req.body); }'),
      ).toBeGreaterThan(0);
    });

    it('still requires the receiver to be a parameter', () => {
      // The opt-out relaxes the DEPTH rule and nothing else. A module-local
      // object with a `.body` is somebody's own data structure whatever the
      // caller asked for.
      expect(
        shallowBodyHits(
          'function f() { const node = { body: 1 }; g(node.body); }',
        ),
      ).toBe(0);
    });
  });

  it('reads a request off a parameter whatever the parameter is called', () => {
    expect(hits('function f(req) { g(req.query.id); }')).toBeGreaterThan(0);
    expect(
      hits('function f(inbound) { g(inbound.query.id); }'),
    ).toBeGreaterThan(0);
    expect(
      hits('function f(request) { g(request.headers.auth); }'),
    ).toBeGreaterThan(0);
  });

  it("steps over Koa's nested request", () => {
    // `ctx.request.body` and `ctx.request.query` are Koa's documented API, and
    // `ctx.req` is the raw Node request underneath it. Reading the property
    // nearest the root finds `request`, which is in neither shape set, so
    // every Koa handler came back false — a miss that had nothing to do with
    // how anything was named.
    expect(
      hits('function f(ctx) { g(ctx.request.query.id); }'),
    ).toBeGreaterThan(0);
    expect(
      hits('function f(ctx) { g(ctx.request.body.email); }'),
    ).toBeGreaterThan(0);
    expect(
      hits('function f(ctx) { g(ctx.req.headers.auth); }'),
    ).toBeGreaterThan(0);
  });

  it('does not let the Koa hop invent a request out of nothing', () => {
    // Stepping over the link must not weaken the two questions that follow it:
    // the property after the hop still has to be part of the request shape,
    // and the root still has to be a parameter.
    expect(hits('function f(ctx) { g(ctx.request.somethingElse.a); }')).toBe(0);
    expect(
      hits(
        'const ctx = { request: { query: { a: 1 } } }; g(ctx.request.query.a);',
      ),
    ).toBe(0);
    // `x.request` alone is not a read of anything caller-supplied.
    expect(hits('function f(x) { g(x.request); }')).toBe(0);
  });

  it('declines a receiver that is not a parameter', () => {
    // A request ARRIVES as an argument. A module-local object with a `.params`
    // is somebody's own data structure.
    expect(
      hits('const config = { params: { a: 1 } }; g(config.params.a);'),
    ).toBe(0);
  });

  it('declines a property that is not part of the request shape', () => {
    expect(hits('function f(x) { g(x.somethingElse.a); }')).toBe(0);
  });

  it('declines a bare `body`, which every AST node also has', () => {
    expect(hits('function visit(node) { g(node.body); }')).toBe(0);
    expect(hits('function f(req) { g(req.body.url); }')).toBeGreaterThan(0);
  });

  it('declines a key decided at runtime, which names no shape at all', () => {
    // `req[k]` reads SOMETHING off a request and the AST cannot say what, so
    // there is no property to match against the shape.
    expect(hits('function f(req, k) { g(req[k]); }')).toBe(0);
    // And one level out: the outer `.id` is not a request property either.
    expect(hits('function f(req, k) { g(req[k].id); }')).toBe(0);
  });

  it('declines a root that is not an identifier', () => {
    expect(hits('function f() { g(h().query.id); }')).toBe(0);
  });

  it('declines an identifier the scope does not know', () => {
    expect(hits('g(undeclared.query.id);')).toBe(0);
  });
});
