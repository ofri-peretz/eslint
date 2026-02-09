import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireAuthMechanism } from '../require-auth-mechanism/index';

const ruleTester = new RuleTester();

ruleTester.run('require-auth-mechanism', requireAuthMechanism, {
  valid: [
    // With authMechanism
    `mongoose.connect(uri, { authMechanism: "SCRAM-SHA-256" });`,
    // createConnection with authMechanism
    `mongoose.createConnection(uri, { authMechanism: "SCRAM-SHA-1" });`,
    // Not a connection method
    `mongoose.model("User", schema);`,
    // Not a member expression
    `connect(uri);`,
    // Test file (allowed by default)
    {
      code: `mongoose.connect(uri);`,
      filename: 'db.test.ts',
    },
  ],

  invalid: [
    // No options at all
    {
      code: `mongoose.connect(uri);`,
      errors: [{ messageId: 'requireAuthMechanism' }],
    },
    // Options without authMechanism
    {
      code: `mongoose.connect(uri, { useNewUrlParser: true });`,
      errors: [{ messageId: 'requireAuthMechanism' }],
    },
    // createConnection without authMechanism
    {
      code: `mongoose.createConnection(uri, { ssl: true });`,
      errors: [{ messageId: 'requireAuthMechanism' }],
    },
    // Empty options
    {
      code: `mongoose.connect(uri, {});`,
      errors: [{ messageId: 'requireAuthMechanism' }],
    },
    // allowInTests: false
    {
      code: `mongoose.connect(uri);`,
      filename: 'db.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'requireAuthMechanism' }],
    },
  ],
});
