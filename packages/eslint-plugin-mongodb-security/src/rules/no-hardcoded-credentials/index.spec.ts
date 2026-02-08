import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHardcodedCredentials } from '../no-hardcoded-credentials/index';

const ruleTester = new RuleTester();

ruleTester.run('no-hardcoded-credentials', noHardcodedCredentials, {
  valid: [
    // Environment variable
    `const opts = { user: process.env.DB_USER };`,
    // Variable reference
    `const opts = { password: dbPassword };`,
    // Empty string (ignored)
    `const opts = { password: '' };`,
    // Non-credential key
    `const opts = { host: 'localhost' };`,
    // Number value
    `const opts = { port: 27017 };`,
    // Boolean value
    `const opts = { ssl: true };`,
    // Test file (allowed by default)
    {
      code: `const opts = { password: 'secret123' };`,
      filename: 'db.test.ts',
    },
  ],

  invalid: [
    // Hardcoded password
    {
      code: `const opts = { password: 'secret123' };`,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    // Hardcoded user
    {
      code: `const opts = { user: 'admin' };`,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    // Hardcoded username
    {
      code: `const config = { username: 'root' };`,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    // Hardcoded pass
    {
      code: `const config = { pass: 'mypassword' };`,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    // Hardcoded auth
    {
      code: `const config = { auth: 'Bearer token123' };`,
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
    // In connection options
    {
      code: `mongoose.connect(uri, { user: 'admin', pass: 'secret' });`,
      errors: [
        { messageId: 'hardcodedCredentials' },
        { messageId: 'hardcodedCredentials' },
      ],
    },
    // allowInTests: false
    {
      code: `const opts = { password: 'test123' };`,
      filename: 'db.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'hardcodedCredentials' }],
    },
  ],
});
