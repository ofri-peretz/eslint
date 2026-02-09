import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSelectSensitiveFields } from '../no-select-sensitive-fields/index';

const ruleTester = new RuleTester();

ruleTester.run('no-select-sensitive-fields', noSelectSensitiveFields, {
  valid: [
    // Query with .select() excluding sensitive fields
    `User.find({}).select("-password -refreshToken");`,
    // Query with .select() returning only safe fields
    `User.find({}).select("name email");`,
    // Non-query method
    `User.save({ password: 'test' });`,
    // Not a member expression
    `find({});`,
    // Test file (allowed by default)
    {
      code: `User.find({});`,
      filename: 'user.test.ts',
    },
    // findOne with select
    `User.findOne({ email }).select("-password -secret");`,
    // findById with select
    `User.findById(id).select("name");`,
  ],

  invalid: [
    // find without .select()
    {
      code: `User.find({});`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    // findOne without .select()
    {
      code: `User.findOne({ email: req.body.email });`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    // findById without .select()
    {
      code: `User.findById(req.params.id);`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    // select that includes sensitive field
    {
      code: `User.find({}).select("name password email");`,
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
    // allowInTests: false
    {
      code: `User.find({});`,
      filename: 'user.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'selectSensitiveFields' }],
    },
  ],
});
