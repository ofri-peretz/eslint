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
          code: `Sequelize.literal('createdAt DESC');`,
        },
        {
          name: 'query builder, no raw SQL',
          code: `Product.findAll({ where: { name }, order: [['createdAt', 'DESC']] });`,
        },
        {
          name: 'no arguments',
          code: `sequelize.query();`,
        },
        {
          name: 'unrelated method',
          code: 'logger.info(`fetched ${count} rows`);',
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
          code:
            'models.sequelize.query(`SELECT * FROM Products WHERE ((name LIKE \'%${criteria}%\' OR description LIKE \'%${criteria}%\') AND deletedAt IS NULL) ORDER BY name`);',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          // OWASP Juice Shop routes/login.ts:34
          name: 'juice shop login bypass',
          code:
            "models.sequelize.query(`SELECT * FROM Users WHERE email = '${req.body.email || ''}' AND password = '${security.hash(req.body.password || '')}' AND deletedAt IS NULL`);",
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'string concatenation',
          code: `sequelize.query('SELECT * FROM Users WHERE id = ' + userId);`,
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'Sequelize.literal with interpolation (ORDER BY injection)',
          code: 'Product.findAll({ order: Sequelize.literal(`${sortColumn} DESC`) });',
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'literal with concatenation',
          code: `Product.findAll({ order: Sequelize.literal(sortColumn + ' DESC') });`,
          errors: [{ messageId: 'noUnsafeQuery' }],
        },
        {
          name: 'tainted variable',
          code: [
            'const sql = `SELECT * FROM Users WHERE email = \'${email}\'`;',
            'await models.sequelize.query(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'tainted variable reaches the literal sink',
          code: [
            'const order = `${sortColumn} DESC`;',
            'Product.findAll({ order: Sequelize.literal(order) });',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
        {
          name: 'query built with +=',
          code: [
            "let sql = 'SELECT * FROM Products WHERE 1=1';",
            'sql += ` AND name = \'${name}\'`;',
            'sequelize.query(sql);',
          ].join('\n'),
          errors: [{ messageId: 'unsafeTemplateLiteral' }],
        },
      ],
    });
  });
});
