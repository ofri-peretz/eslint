/**
 * @fileoverview Tests for require-output-filtering rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireOutputFiltering } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-output-filtering', requireOutputFiltering, {
  valid: [
    // Filtered database query
    {
      code: `
        const tools = {
          search: {
            execute: async ({ query }) => filterSensitive(db.query(query)),
          },
        };
      `,
    },
    // Static return
    {
      code: `
        const tools = {
          ping: {
            execute: async () => ({ status: 'ok' }),
          },
        };
      `,
    },
    // Sanitized fetch
    {
      code: `
        const tools = {
          getData: {
            execute: async ({ id }) => sanitize(await fetchData(id)),
          },
        };
      `,
    },
    // Not an execute function
    {
      code: `
        const handler = {
          process: async () => db.query('SELECT * FROM users'),
        };
      `,
    },
    // Non-data-source call
    {
      code: `
        const tools = {
          calculate: {
            execute: async ({ x, y }) => add(x, y),
          },
        };
      `,
    },
  ],

  invalid: [
    // Direct database query return
    {
      code: `
        const tools = {
          search: {
            execute: async ({ sql }) => db.query(sql),
          },
        };
      `,
      errors: [{ messageId: 'missingOutputFilter' }],
    },
    // Direct find call
    {
      code: `
        const tools = {
          getUser: {
            execute: async ({ id }) => users.findById(id),
          },
        };
      `,
      errors: [{ messageId: 'missingOutputFilter' }],
    },
    // Direct fetch
    {
      code: `
        const tools = {
          loadData: {
            execute: async ({ url }) => fetchData(url),
          },
        };
      `,
      errors: [{ messageId: 'missingOutputFilter' }],
    },
    // Select query
    {
      code: `
        const tools = {
          query: {
            execute: async ({ table }) => prisma.select(table),
          },
        };
      `,
      errors: [{ messageId: 'missingOutputFilter' }],
    },
  ],
});
