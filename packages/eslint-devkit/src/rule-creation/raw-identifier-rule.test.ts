/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Factory-level coverage for `createRawIdentifierRule`.
 *
 * The plugin suites lock each driver's contract; this file locks the shared
 * classification, which is where every branch of the rule actually lives. The
 * position classifier is the whole rule — if it drifts, the plugins go on
 * passing while reporting the wrong lines.
 */

import { describe, expect, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';

import {
  createRawIdentifierRule,
  identifierPosition,
  lastClause,
  calleeText,
  tagName,
  isExemptExpression,
} from './raw-identifier-rule';
import { AST_NODE_TYPES } from '../ast-node-types';
import type { TSESTree } from '@typescript-eslint/utils';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

describe('lastClause', () => {
  it('returns the last clause keyword, normalized', () => {
    expect(lastClause('SELECT * FROM t WHERE a = ')).toBe('where');
    expect(lastClause('SELECT * FROM t ORDER  BY ')).toBe('order by');
    expect(lastClause('SELECT * FROM t GROUP\nBY ')).toBe('group by');
  });

  it('returns empty for text with no clause keyword', () => {
    expect(lastClause('')).toBe('');
    expect(lastClause('just some prose')).toBe('');
  });

  it('is the LAST keyword, not the first — that is the whole point', () => {
    expect(lastClause('SELECT * FROM t ORDER BY name LIMIT ')).toBe('limit');
  });
});

describe('identifierPosition', () => {
  it('reports every keyword whose next token must be an identifier', () => {
    for (const text of [
      'SELECT * FROM ',
      'SELECT * FROM a JOIN ',
      'INSERT INTO ',
      'UPDATE ',
      'DROP TABLE ',
      'SELECT ',
      'SELECT * FROM t GROUP BY ',
      'SELECT * FROM t ORDER BY ',
      'SELECT DISTINCT ON ',
    ]) {
      expect(identifierPosition(text), text).toBe('identifier');
    }
  });

  it('sees through a quote or bracket — pre-quoting escapes nothing', () => {
    expect(identifierPosition('SELECT * FROM "')).toBe('identifier');
    expect(identifierPosition('SELECT * FROM `')).toBe('identifier');
    expect(identifierPosition('SELECT * FROM [')).toBe('identifier');
    expect(identifierPosition("SELECT * FROM '")).toBe('identifier');
  });

  it('classifies a hole still inside ORDER BY as a sort direction', () => {
    expect(identifierPosition('SELECT * FROM t ORDER BY name ')).toBe('sortDirection');
    expect(identifierPosition('SELECT * FROM t ORDER BY a, b ')).toBe('sortDirection');
  });

  it('stays silent on every value position', () => {
    // These are precisely what the tagged template parameterizes correctly.
    // A finding here would fire the rule on the API's intended use.
    for (const text of [
      'SELECT * FROM t WHERE id = ',
      'SELECT * FROM t WHERE id IN (',
      'INSERT INTO t (a) VALUES (',
      'UPDATE t SET a = ',
      'SELECT * FROM t LIMIT ',
      'SELECT * FROM t ORDER BY name LIMIT ',
      'SELECT * FROM t ORDER BY name OFFSET ',
      '',
    ]) {
      expect(identifierPosition(text), text).toBe(false);
    }
  });
});

describe('calleeText', () => {
  const parse = (code: string): TSESTree.Node =>
    (parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement)
      .expression as TSESTree.Node;

  it('flattens a dotted callee', () => {
    const call = parse('sql.identifier(x)') as TSESTree.CallExpression;
    expect(calleeText(call.callee)).toBe('sql.identifier');
  });

  it('handles a bare identifier', () => {
    const call = parse('escape(x)') as TSESTree.CallExpression;
    expect(calleeText(call.callee)).toBe('escape');
  });

  it('returns empty for a computed member — it is not statically a name', () => {
    const call = parse('sql[key](x)') as TSESTree.CallExpression;
    expect(calleeText(call.callee)).toBe('');
  });

  it('returns empty for a non-identifier base', () => {
    const call = parse('(a || b).c(x)') as TSESTree.CallExpression;
    expect(calleeText(call.callee)).toBe('');
  });
});

describe('tagName', () => {
  const tagOf = (code: string): TSESTree.Node =>
    (
      (parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement)
        .expression as TSESTree.TaggedTemplateExpression
    ).tag;

  it('reads a bare tag', () => {
    expect(tagName(tagOf('sql`x`'))).toBe('sql');
  });

  it('reads the property of a member tag', () => {
    expect(tagName(tagOf('prisma.$queryRaw`x`'))).toBe('$queryRaw');
  });

  it('returns undefined for a computed tag', () => {
    expect(tagName(tagOf('client[key]`x`'))).toBeUndefined();
  });

  it('returns undefined for a call-expression tag', () => {
    expect(tagName(tagOf('make()`x`'))).toBeUndefined();
  });
});

describe('isExemptExpression', () => {
  const exprOf = (code: string): TSESTree.Expression =>
    (
      (parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement)
        .expression as TSESTree.TaggedTemplateExpression
    ).quasi.expressions[0] as TSESTree.Expression;

  it('exempts a literal', () => {
    expect(isExemptExpression(exprOf("sql`FROM ${'users'}`"), [], ['sql'])).toBe(true);
    expect(isExemptExpression(exprOf('sql`LIMIT ${10}`'), [], ['sql'])).toBe(true);
  });

  it('exempts the configured identifier escaper — it is the remediation', () => {
    expect(
      isExemptExpression(exprOf('sql`FROM ${sql.identifier(t)}`'), ['sql.identifier'], ['sql']),
    ).toBe(true);
  });

  it('does not exempt an escaper that was not configured', () => {
    expect(isExemptExpression(exprOf('sql`FROM ${sql.identifier(t)}`'), [], ['sql'])).toBe(false);
  });

  it('exempts a nested template with the same tag — composition is intended', () => {
    expect(isExemptExpression(exprOf('sql`FROM ${sql`users`}`'), [], ['sql'])).toBe(true);
  });

  it('does not exempt a nested template with a different tag', () => {
    expect(isExemptExpression(exprOf('sql`FROM ${other`users`}`'), [], ['sql'])).toBe(false);
  });

  it('does not exempt a plain identifier — that is the finding', () => {
    expect(isExemptExpression(exprOf('sql`FROM ${table}`'), [], ['sql'])).toBe(false);
  });

  it('does not exempt an arbitrary call', () => {
    expect(isExemptExpression(exprOf('sql`FROM ${getTable()}`'), ['sql.identifier'], ['sql'])).toBe(
      false,
    );
  });
});

/**
 * Two shapes of tag exist and they are gated differently on purpose, so both
 * paths need a rule-level exercise rather than only a helper-level one.
 */
const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { ecmaVersion: 2022, sourceType: 'module' } },
});

const bareTagRule = createRawIdentifierRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'test',
      url: 'https://example.test/rule',
      cwe: 'CWE-89',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  tags: ['sql'],
  modules: ['test-orm'],
  requireImport: true,
  identifierHelpers: ['sql.identifier'],
  fix: 'allowlist it',
  sortDirectionFix: 'resolve to a literal',
  documentationLink: 'https://example.test/docs',
});

describe('createRawIdentifierRule — the bare-tag import gate', () => {
  ruleTester.run('bare tag', bareTagRule, {
    valid: [
      {
        // Without the gate this rule would report any local `sql` helper in
        // any file, which is how a driver-scoped rule leaks out of its plugin.
        name: 'no driver import, no finding',
        code: 'const q = sql`SELECT * FROM ${table}`;',
      },
      {
        name: 'driver imported but the hole is a value',
        code: "import { sql } from 'test-orm';\nconst q = sql`SELECT * FROM t WHERE a = ${a}`;",
      },
      {
        // Regression: the gate used to apply only when the tag was a bare
        // Identifier, so a generic name reached through a member expression
        // skipped it entirely and reported in a file with no driver at all.
        name: 'a member tag with a gated name is somebody else\'s builder',
        code:
          "import { createQueryBuilder } from 'some-internal-lib';\n" +
          'const q = createQueryBuilder();\n' +
          'const r = q.sql`SELECT * FROM ${table}`;',
      },
      {
        name: 'a member tag is not rescued by an unrelated driver import',
        code:
          "import { sql } from 'test-orm';\n" +
          'const r = q.sql`SELECT * FROM ${table}`;',
      },
      {
        name: 'a subpath import opens the gate too',
        code: "import { sql } from 'test-orm/pg';\nconst q = sql`SELECT * FROM t WHERE a = ${a}`;",
      },
      {
        // The exemptions have to hold in an *identifier* position — that is
        // the only place they matter. Exercised through the rule, not just
        // the helper, because the helper being right does not prove the rule
        // consults it.
        name: 'a literal in an identifier position',
        code: "import { sql } from 'test-orm';\nconst q = sql`SELECT * FROM ${'users'}`;",
      },
      {
        name: 'the identifier escaper in an identifier position',
        code:
          "import { sql } from 'test-orm';\nconst q = sql`SELECT * FROM ${sql.identifier(t)}`;",
      },
      {
        name: 'a nested fragment in an identifier position',
        code: "import { sql } from 'test-orm';\nconst q = sql`SELECT * FROM ${sql`users`}`;",
      },
    ],
    invalid: [
      {
        name: 'driver imported and the hole is an identifier',
        code: "import { sql } from 'test-orm';\nconst q = sql`SELECT * FROM ${table}`;",
        errors: [{ messageId: 'identifierInterpolation' }],
      },
      {
        name: 'sort direction',
        code: "import { sql } from 'test-orm';\nconst q = sql`SELECT * FROM t ORDER BY a ${dir}`;",
        errors: [{ messageId: 'sortDirectionInterpolation' }],
      },
    ],
  });
});

const memberTagRule = createRawIdentifierRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'test',
      url: 'https://example.test/rule',
      cwe: 'CWE-89',
      cweJustification: 'covered by the identifier note',
      cvss: 9.8,
      confidence: 'high',
    },
  },
  tags: ['$queryRaw'],
  modules: ['test-client'],
  requireImport: false,
  identifierHelpers: [],
  fix: 'allowlist it',
  sortDirectionFix: 'resolve to a literal',
  documentationLink: 'https://example.test/docs',
});

describe('createRawIdentifierRule — a member tag needs no import', () => {
  ruleTester.run('member tag', memberTagRule, {
    valid: [
      {
        name: 'value hole',
        code: 'await client.$queryRaw`SELECT * FROM t WHERE id = ${id}`;',
      },
      {
        name: 'a different property is not the tag',
        code: 'await client.$queryRawUnsafe`SELECT * FROM ${table}`;',
      },
    ],
    invalid: [
      {
        // No import anywhere: the $-prefixed property is specific enough on
        // its own, and requiring an import would miss the re-exported client.
        name: 'identifier hole with no import in the file',
        code: 'await client.$queryRaw`SELECT * FROM ${table}`;',
        errors: [{ messageId: 'identifierInterpolation' }],
      },
    ],
  });
});

describe('rule metadata', () => {
  it('carries both message ids with distinct remediations', () => {
    const messages = bareTagRule.meta.messages;
    expect(messages.identifierInterpolation).toContain('allowlist it');
    expect(messages.sortDirectionInterpolation).toContain('resolve to a literal');
  });

  it('emits the CWE it documents, so the two can never drift', () => {
    expect(bareTagRule.meta.messages.identifierInterpolation).toContain('CWE-89');
    expect(bareTagRule.meta.docs?.cwe).toBe('CWE-89');
  });

  it('passes an optional cweJustification straight through', () => {
    expect(memberTagRule.meta.docs?.cweJustification).toBe('covered by the identifier note');
  });

  it('takes no options — SQL grammar is not a project preference', () => {
    expect(bareTagRule.meta.schema).toEqual([]);
    expect(bareTagRule.defaultOptions).toEqual([]);
  });
});

describe('AST_NODE_TYPES comes from the local shim', () => {
  // Regression guard: importing the enum from @typescript-eslint/utils made
  // every published plugin throw on a clean install, because it is an optional
  // peer npm does not install.
  it('resolves TaggedTemplateExpression at runtime', () => {
    expect(AST_NODE_TYPES.TaggedTemplateExpression).toBe('TaggedTemplateExpression');
  });
});
