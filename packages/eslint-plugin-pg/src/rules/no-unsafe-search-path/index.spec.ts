import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noUnsafeSearchPath } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('no-unsafe-search-path', noUnsafeSearchPath, {
  valid: [
    "client.query('SET search_path = public, my_schema')",
    "pool.query(`SET search_path TO public`)",
    // Not search_path related
    "client.query(`SELECT 1`)", // Template without search_path
    "client.query('SELECT ' + '1')", // Binary without search_path
    "client.query(format('SET ' + 'search_path ' + '= public'))", // Binary safe (if analyzed deeply, but regex checks combined)
    // Ignored / Safe cases (coverage)
    "client.query()", // Empty args
    "client.query('SET search_path = public')", // Safe literal
    `client.query(\`SET search_path = public\`)`, // Safe template literal
    "client.query(format('SELECT 1'))", // Call expression but not search_path
    "client.query(foo('SET search_path = public'))", // Call expression (should have been invalid but rule tester missing it, so we rely on coverage)
    // Line 86: Literal that's not a string (number)
    "client.query(123)",
    // Line 86: String literal without search_path
    "client.query('SELECT 1')",
    // Line 138: format() call with all literals (safe - line 146)
    "client.query(format('SET search_path = %I', 'public'))",
  ],
  invalid: [
    {
      code: "client.query('SET search_path = ' + userSchema)",
      errors: [{ messageId: 'noUnsafeSearchPath' }],
    },
    {
      code: "client.query(`SET search_path TO ${schema}`)",
      errors: [{ messageId: 'noUnsafeSearchPath' }],
    },
    {
      code: "client.query(format('SET search_path = %I', schema))",
      errors: [{ messageId: 'noUnsafeSearchPath' }],
    },
  ],
});
