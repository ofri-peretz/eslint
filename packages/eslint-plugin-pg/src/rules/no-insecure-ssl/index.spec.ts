import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noInsecureSsl } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
  },
});

ruleTester.run('no-insecure-ssl', noInsecureSsl, {
  valid: [
    // Default (secure)
    "new Client()",
    "new Pool({ user: 'postgres' })",
    // Explicitly secure
    "new Client({ ssl: { ca: '...' } })",
    "new obj.Client({ ssl: { rejectUnauthorized: false } })", // MemberExpression callee (ignored)
    // String connection string (would require different parsing, rule targets config object)
    "new Client('postgres://user:pass@host/db')",
    // Line 51: ssl object without rejectUnauthorized property (else branch)
    "new Client({ ssl: { minVersion: 'TLSv1.2' } })",
    // Line 51: ssl.rejectUnauthorized = true (explicit secure)
    "new Client({ ssl: { rejectUnauthorized: true } })",
    // Line 51: ssl = true (non-object, else branch for ObjectExpression check)
    "new Client({ ssl: true })",
    // Line 51: ssl = false (also non-object)
    "new Client({ ssl: false })",
  ],
  invalid: [
    {
      code: "new Client({ ssl: { rejectUnauthorized: false } })",
      errors: [{ messageId: 'noInsecureSsl' }],
    },
    {
      code: "new Pool({ ssl: { rejectUnauthorized: false } })",
      errors: [{ messageId: 'noInsecureSsl' }],
    },
  ],
});
