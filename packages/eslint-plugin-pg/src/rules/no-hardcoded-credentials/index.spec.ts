import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('no-hardcoded-credentials', noHardcodedCredentials, {
  valid: [
    "new Client({ password: process.env.DB_PASSWORD })",
    "new Pool({ connectionString: process.env.DATABASE_URL })",
    "new Client()", // No config, assumes env vars or defaults
    // Ignored NewExpressions (coverage)
    "new OtherClass({ password: '123' })",
    "new Client({ ...config })", // Spread element (not Property)
    "new Client({ ['password']: 'secret' })", // Computed key (ignored by rule for now, but covers line 57)
    "new Client('some-random-string')", // String but not a protocol match
    "new Client(123)", // Non-string arg
    "new Pool({ user: 'postgres', database: 'mydb' })", // No password
  ],
  invalid: [
    {
      code: "new Client({ password: 'mysecretpassword' })",
      errors: [{ messageId: 'noHardcodedCredentials' }],
    },
    {
      code: "new Pool({ connectionString: 'postgres://user:pass@localhost:5432/db' })",
      errors: [{ messageId: 'noHardcodedCredentials' }],
    },
    {
      code: "new Client('postgres://user:pass@localhost:5432/db')",
      errors: [{ messageId: 'noHardcodedCredentials' }],
    },
  ],
});
