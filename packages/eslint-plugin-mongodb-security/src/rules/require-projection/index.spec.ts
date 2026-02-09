import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireProjection } from '../require-projection/index';

const ruleTester = new RuleTester();

ruleTester.run('require-projection', requireProjection, {
  valid: [
    // find with inline projection
    `User.find({}, { name: 1, email: 1 });`,
    // findOne with inline projection
    `User.findOne({ email }, { name: 1 });`,
    // findById with inline projection
    `User.findById(id, { name: 1, email: 1 });`,
    // find with chained .select()
    `User.find({}).select("name email");`,
    // findOne with chained .select()
    `User.findOne({ email }).select("name");`,
    // Not a query method
    `User.save({});`,
    // Not a member expression
    `find({});`,
    // Test file (allowed by default)
    {
      code: `User.find({});`,
      filename: 'user.test.ts',
    },
  ],

  invalid: [
    // find without projection
    {
      code: `User.find({});`,
      errors: [{ messageId: 'requireProjection' }],
    },
    // findOne without projection
    {
      code: `User.findOne({ email: "test@test.com" });`,
      errors: [{ messageId: 'requireProjection' }],
    },
    // findById without projection
    {
      code: `User.findById(id);`,
      errors: [{ messageId: 'requireProjection' }],
    },
    // find with chained methods but no .select()
    {
      code: `User.find({}).sort({ name: 1 });`,
      errors: [{ messageId: 'requireProjection' }],
    },
    // allowInTests: false
    {
      code: `User.find({});`,
      filename: 'user.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'requireProjection' }],
    },
  ],
});
