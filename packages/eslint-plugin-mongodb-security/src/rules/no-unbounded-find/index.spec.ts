import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnboundedFind } from '../no-unbounded-find/index';

const ruleTester = new RuleTester();

ruleTester.run('no-unbounded-find', noUnboundedFind, {
  valid: [
    // find with limit chained
    `User.find({}).limit(100);`,
    // Not a member expression
    `find({});`,
    // Not a find method
    `User.save();`,
    // Test file (allowed by default)
    {
      code: `User.find({});`,
      filename: 'query.test.ts',
    },
    // findOne is bounded by definition (returns at most one document) — never fire
    `User.findOne({ email: 'test@test.com' });`,
    // Long chain ending in .limit() — accept .limit() at any depth
    `db.collection('u').find({ a: 1 }, { projection: { _id: 1 } }).select('-password').limit(100).toArray();`,
    // Native driver: limit option in 2nd arg
    `db.collection('u').find({ a: 1 }, { limit: 50 });`,
  ],

  invalid: [
    // find without limit
    {
      code: `User.find({});`,
      errors: [{ messageId: 'unboundedFind' }],
    },
    // find without any chaining
    {
      code: `const users = User.find({ active: true });`,
      errors: [{ messageId: 'unboundedFind' }],
    },
    // find with sort but no limit
    {
      code: `User.find({}).sort({ name: 1 });`,
      errors: [{ messageId: 'unboundedFind' }],
    },
    // allowInTests: false
    {
      code: `User.find({});`,
      filename: 'query.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unboundedFind' }],
    },
  ],
});
