import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHardcodedConnectionString } from '../no-hardcoded-connection-string/index';

const ruleTester = new RuleTester();

ruleTester.run('no-hardcoded-connection-string', noHardcodedConnectionString, {
  valid: [
    // Environment variable reference
    `const uri = process.env.MONGODB_URI;`,
    // Variable (not a literal)
    `mongoose.connect(connectionString);`,
    // Non-MongoDB URI
    `const url = 'https://example.com';`,
    // postgres://
    `const pg = 'postgresql://localhost:5432/db';`,
    // Test file (allowed by default)
    {
      code: `const uri = 'mongodb://localhost:27017/test';`,
      filename: 'db.test.ts',
    },
  ],

  invalid: [
    // Basic mongodb:// URI
    {
      code: `const uri = 'mongodb://localhost:27017/mydb';`,
      errors: [{ messageId: 'hardcodedConnectionString' }],
    },
    // mongodb+srv:// URI
    {
      code: `const uri = 'mongodb+srv://user:pass@cluster.mongodb.net/db';`,
      errors: [{ messageId: 'hardcodedConnectionString' }],
    },
    // Direct in connect()
    {
      code: `mongoose.connect('mongodb://admin:password@host:27017/prod');`,
      errors: [{ messageId: 'hardcodedConnectionString' }],
    },
    // Template literal
    {
      code: 'const uri = `mongodb://localhost:27017/${dbName}`;',
      errors: [{ messageId: 'hardcodedConnectionString' }],
    },
    // allowInTests: false in test file
    {
      code: `const uri = 'mongodb://localhost:27017/test';`,
      filename: 'db.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'hardcodedConnectionString' }],
    },
  ],
});
