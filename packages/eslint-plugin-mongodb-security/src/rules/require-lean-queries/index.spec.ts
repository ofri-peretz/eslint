import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireLeanQueries } from '../require-lean-queries/index';

const ruleTester = new RuleTester();

ruleTester.run('require-lean-queries', requireLeanQueries, {
  valid: [
    // With .lean()
    `User.find({}).lean();`,
    // findOne with .lean()
    `User.findOne({ email }).lean();`,
    // findById with .lean()
    `User.findById(id).lean();`,
    // Chained with other methods and .lean()
    `User.find({}).sort({ name: 1 }).lean();`,
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
    // find without .lean()
    {
      code: `User.find({});`,
      errors: [{ messageId: 'useLean' }],
    },
    // findOne without .lean()
    {
      code: `User.findOne({ email: "test@test.com" });`,
      errors: [{ messageId: 'useLean' }],
    },
    // findById without .lean()
    {
      code: `User.findById(id);`,
      errors: [{ messageId: 'useLean' }],
    },
    // Chained with sort but no .lean()
    {
      code: `User.find({}).sort({ name: 1 });`,
      errors: [{ messageId: 'useLean' }],
    },
    // allowInTests: false
    {
      code: `User.find({});`,
      filename: 'user.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'useLean' }],
    },
  ],
});
