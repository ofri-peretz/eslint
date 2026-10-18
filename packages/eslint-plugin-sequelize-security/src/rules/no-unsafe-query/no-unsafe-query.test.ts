/**
 * Tests for sequelize/no-unsafe-query
 * CWE-89 — SQL injection through Sequelize's raw-SQL escapes.
 *
 * The two Juice Shop sites are pinned verbatim: they are the findings that
 * every recommended preset missed before this plugin existed, because the
 * only implementation of this detection shipped inside eslint-plugin-pg.
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
          name: 'replacements',
          code: `models.sequelize.query('SELECT * FROM Products WHERE name LIKE :q', { replacements: { q } });`,
        },
        {
          name: 'bind parameters',
          code: `sequelize.query('SELECT * FROM Users WHERE email = $1', { bind: [email] });`,
        },
        {
          name: 'static template literal',
          code: 'sequelize.query(`SELECT * FROM Products`);',
        },
        {
          name: 'literal with a static string',
          code: `import { Sequelize } from 'sequelize';
Sequelize.literal('createdAt DESC');`,
        },
        {
          name: 'query builder, no raw SQL',
          code: `import { Sequelize } from 'sequelize';
Product.findAll({ where: { name }, order: [['createdAt', 'DESC']] });`,
        },
        {
          name: 'no arguments',
          code: `sequelize.query();`,
        },
        {
          name: 'unrelated method',
          code: 'import { Sequelize } from "sequelize";\nlogger.info(`fetched ${count} rows`);',
        },
        {
          name: 'safe variable passed through',
          code: `const sql = 'SELECT * FROM Products'; sequelize.query(sql);`,
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
          // OWASP Juice Shop routes/search.ts:23
          name: 'juice shop product search',
          code: "import { Sequelize } from \"sequelize\";\nmodels.sequelize.query(`SELECT * FROM Products WHERE ((name LIKE '%${criteria}%' OR description LIKE '%${criteria}%') AND deletedAt IS NULL) ORDER BY name`);",
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          // OWASP Juice Shop routes/login.ts:34
          name: 'juice shop login bypass',
          code: "import { Sequelize } from 'sequelize';\nmodels.sequelize.query(`SELECT * FROM Users WHERE email = '${req.body.email || ''}' AND password = '${security.hash(req.body.password || '')}' AND deletedAt IS NULL`);",
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'string concatenation',
          code: `import { Sequelize } from 'sequelize';
sequelize.query('SELECT * FROM Users WHERE id = ' + userId);`,
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          // Was `${sortColumn}` with `sortColumn` undeclared. An ORDER BY
          // target has no bind parameter, so since the 2026-10 review a hole
          // there is reported once it is traced to the request; the original
          // fixture is kept below as a valid case and explained there.
          name: 'Sequelize.literal with interpolation (ORDER BY injection)',
          code: 'import { Sequelize } from "sequelize";\nexport const h = (req) => Product.findAll({ order: Sequelize.literal(`${req.query.sortColumn} DESC`) });',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          // Moved from an undeclared `sortColumn` to a request-traced one; see
          // 'ORDER BY injection' above.
          name: 'literal with concatenation',
          code: `import { Sequelize } from 'sequelize';
export const h = (req) => Product.findAll({ order: Sequelize.literal(req.query.sortColumn + ' DESC') });`,
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'tainted variable',
          code: [
            "import { Sequelize } from 'sequelize';",
            "const sql = `SELECT * FROM Users WHERE email = '${email}'`;",
            'await models.sequelize.query(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          // Moved from an undeclared `sortColumn` to a request-traced one; see
          // 'ORDER BY injection' above.
          name: 'tainted variable reaches the literal sink',
          code: [
            "import { Sequelize } from 'sequelize';",
            'export function h(req) {',
            '  const order = `${req.query.sortColumn} DESC`;',
            '  return Product.findAll({ order: Sequelize.literal(order) });',
            '}',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'query built with +=',
          code: [
            "import { Sequelize } from 'sequelize';",
            "let sql = 'SELECT * FROM Products WHERE 1=1';",
            "sql += ` AND name = '${name}'`;",
            'sequelize.query(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});

/**
 * FP/FN review 2026-10-12 (benchmarks/audits/2026-10-12-fp-fn-sequelize-security.md).
 * Bindings are named `foo` / `bar` so no verdict can rest on a name.
 */
describe('no-unsafe-query — fp/fn review 2026-10', () => {
  const S =
    "import { Sequelize } from 'sequelize';\nconst foo = new Sequelize('sqlite::memory:');\n";
  ruleTester.run('fp-fn review 2026-10', noUnsafeQuery, {
    valid: [
      {
        // The three fixtures moved above, as first written: an ORDER BY target
        // from a value this file cannot trace to the request. No bind
        // parameter exists there, so composing it is how such a statement is
        // built; reported once traced to the request (see the invalid cases).
        name: 'an ORDER BY target composed from a caller-supplied value',
        code:
          "import { Sequelize } from 'sequelize';\n" +
          'Product.findAll({ order: Sequelize.literal(`${sortColumn} DESC`) });\n' +
          "Product.findAll({ order: Sequelize.literal(sortColumn + ' DESC') });\n" +
          'const order = `${sortColumn} DESC`;\nProduct.findAll({ order: Sequelize.literal(order) });',
      },
      {
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (constant table name)
        name: 'FP: a constant table name beside bound replacements',
        code:
          S +
          "const bar = 'users';\nfoo.query(`SELECT * FROM ${bar} WHERE id = ?`, { replacements: [1] });",
      },
      {
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (sequelize.escape)
        name: "FP: Sequelize's own escape()",
        code:
          S +
          'export const h = (bar) => foo.query(`SELECT * FROM t WHERE x = ${foo.escape(String(bar.query.x))}`);',
      },
      {
        // @found sequelize-security FP/FN review 2026-10-12, synthetic probe (another client's query)
        name: "FP: a GraphQL client's query() in a file that imports Sequelize",
        code:
          S +
          "import { GraphQLClient } from 'graphql-request';\nconst bar = new GraphQLClient('https://x');\nexport const h = (baz) => bar.query(`SELECT ${baz} FROM nothing`);",
      },
    ],
    invalid: [
      {
        name: 'the request reaching a literal through a destructure',
        code:
          S +
          'export const h = (bar) => { const { sort } = bar.query; return foo.literal(`${sort} DESC`); };',
        errors: [{ messageId: 'unsafeTemplateLiteral' }],
      },
    ],
  });
});
