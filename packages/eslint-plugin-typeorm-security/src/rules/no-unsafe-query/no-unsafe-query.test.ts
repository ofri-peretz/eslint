/**
 * Tests for typeorm-security/no-unsafe-query
 * CWE-89 — SQL injection through TypeORM's raw-SQL escapes.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noUnsafeQuery } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

describe('no-unsafe-query', () => {
  describe('Valid — parameterized and static SQL', () => {
    ruleTester.run('valid', noUnsafeQuery, {
      valid: [
        {
          name: 'safe idiom',
          code: "import DataSource from 'typeorm';\nawait dataSource.query('SELECT * FROM users WHERE id = $1', [userId]);",
        },
        {
          name: 'static SQL, no interpolation',
          code: "import DataSource from 'typeorm';\ndataSource.query('SELECT * FROM users');",
        },
        {
          name: 'no arguments',
          code: 'import DataSource from "typeorm";\ndataSource.query();',
        },
        {
          name: 'unrelated code',
          code: 'import DataSource from "typeorm";\nconst x = 1;',
        },
        {
          name: 'safe variable passed through',
          code: "import DataSource from 'typeorm';\nconst sql = 'SELECT * FROM users'; dataSource.query(sql);",
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid — interpolated raw SQL', () => {
    ruleTester.run('invalid', noUnsafeQuery, {
      valid: [],
      invalid: [
        {
          name: 'template interpolation',
          code: 'import DataSource from "typeorm";\ndataSource.query(`SELECT * FROM users WHERE id = ${userId}`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'string concatenation',
          code: "import DataSource from 'typeorm';\ndataSource.query('SELECT * FROM users WHERE id = ' + userId);",
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'tainted variable reaches the sink',
          code: [
            "import DataSource from 'typeorm';",
            'const sql = `SELECT * FROM users WHERE id = ${id}`;',
            'dataSource.query(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-typeorm-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-unsafe-query — fp/fn review 2026-10', () => {
  const T =
    "import { DataSource, Raw, Brackets } from 'typeorm';\nconst foo = new DataSource({ type: 'postgres' });\n";
  ruleTester.run('fp-fn review 2026-10', noUnsafeQuery, {
    valid: [
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (fixed id list)
        name: 'FP: a fixed list joined into IN (…)',
        code:
          T +
          'foo.query(`SELECT * FROM "user" WHERE id IN (${[1, 2].join(\',\')})`);',
      },
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (another client's query)
        name: "FP: a GraphQL client's query() in a file that imports TypeORM",
        code:
          T +
          "import { GraphQLClient } from 'graphql-request';\nconst bar = new GraphQLClient('https://x');\nexport const h = (baz) => bar.query(`{ user(id: ${baz}) { name } }`);",
      },
      {
        name: 'query-builder parameters are the fix',
        code:
          T +
          "export const h = (bar) => foo.getRepository('User').createQueryBuilder('u').where('u.name = :name', { name: bar.query.n }).andWhere(new Brackets((w) => { w.where('u.a = :a', { a: 1 }); })).getMany();",
      },
      {
        name: "Raw() whose only hole is TypeORM's own alias",
        code:
          T +
          "export const h = (bar) => foo.getRepository('User').find({ where: { name: Raw((baz) => `${baz} = :n`, { n: bar.query.n }) } });",
      },
      {
        name: 'an ORDER BY target composed from a caller-supplied value',
        code:
          T +
          "export const h = (bar: { sort: string }) => foo.getRepository('User').createQueryBuilder('u').orderBy(`u.${bar.sort}`).getMany();",
      },
    ],
    invalid: [
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (QueryBuilder.where)
        name: 'FN: a value interpolated into QueryBuilder.where()',
        code:
          T +
          "export const h = (bar) => foo.getRepository('User').createQueryBuilder('u').where(`u.name = '${bar.query.n}'`).getMany();",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (andWhere through a bound builder)
        name: 'FN: andWhere() on a builder bound to a constant',
        code:
          T +
          'export const h = (bar: { id: string }) => { const baz = foo.createQueryBuilder(); baz.andWhere(`u.id = ${bar.id}`); return baz; };',
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (join condition)
        name: 'FN: the condition argument of leftJoinAndSelect()',
        code:
          T +
          "export const h = (bar) => foo.createQueryBuilder().leftJoinAndSelect('u.photos', 'p', `p.kind = '${bar.query.k}'`);",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (orderBy from the request)
        name: 'FN: orderBy() with a column taken from the request',
        code:
          T +
          'export const h = (bar) => foo.createQueryBuilder().orderBy(`u.${bar.query.sort}`);',
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (Raw operator)
        name: 'FN: a value spliced into a Raw() find operator',
        code:
          T +
          "export const h = (bar: { n: string }) => foo.getRepository('User').find({ where: { name: Raw((baz) => `${baz} = '${bar.n}'`) } });",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
      {
        // @found typeorm-security FP/FN review 2026-10-12, synthetic probe (renamed Raw import)
        name: 'FN: a renamed Raw import is still Raw',
        code: "import { DataSource, Raw as qux } from 'typeorm';\nexport const h = (bar: { n: string }) => ({ name: qux((baz) => `${baz} = '${bar.n}'`) });",
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
    ],
  });
});
