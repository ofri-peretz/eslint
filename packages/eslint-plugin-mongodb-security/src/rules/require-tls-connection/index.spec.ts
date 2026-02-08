import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireTlsConnection } from '../require-tls-connection/index';

const ruleTester = new RuleTester();

ruleTester.run('require-tls-connection', requireTlsConnection, {
  valid: [
    // TLS enabled
    `mongoose.connect(uri, { tls: true });`,
    // SSL enabled
    `mongoose.connect(uri, { ssl: true });`,
    // createConnection with tls
    `mongoose.createConnection(uri, { tls: true });`,
    // Not a connect method
    `mongoose.model('User', schema);`,
    // Function call without member expression
    `connect(uri);`,
    // Test file (allowed by default)
    {
      code: `mongoose.connect('mongodb://localhost:27017/test');`,
      filename: 'db.test.ts',
    },
  ],

  invalid: [
    // No options at all
    {
      code: `mongoose.connect(uri);`,
      errors: [{ messageId: 'requireTls' }],
    },
    // Options without tls/ssl
    {
      code: `mongoose.connect(uri, { retryWrites: true });`,
      errors: [{ messageId: 'requireTls' }],
    },
    // tls set to false
    {
      code: `mongoose.connect(uri, { tls: false });`,
      errors: [{ messageId: 'requireTls' }],
    },
    // createConnection without tls
    {
      code: `mongoose.createConnection(uri, { authSource: 'admin' });`,
      errors: [{ messageId: 'requireTls' }],
    },
    // allowInTests: false
    {
      code: `mongoose.connect(uri);`,
      filename: 'connect.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'requireTls' }],
    },
  ],
});
