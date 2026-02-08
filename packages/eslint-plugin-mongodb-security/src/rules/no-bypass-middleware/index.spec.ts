import { RuleTester } from '@typescript-eslint/rule-tester';
import { noBypassMiddleware } from '../no-bypass-middleware/index';

const ruleTester = new RuleTester();

ruleTester.run('no-bypass-middleware', noBypassMiddleware, {
  valid: [
    // findOne is safe (triggers middleware)
    `User.findOne({ _id: id });`,
    // save() triggers middleware
    `user.save();`,
    // find() triggers middleware
    `User.find({});`,
    // create() triggers middleware
    `User.create({ name: 'John' });`,
    // Not a member expression
    `updateOne({});`,
    // Test file (allowed by default)
    {
      code: `User.updateOne({ _id: id }, { $set: { active: false } });`,
      filename: 'user.test.ts',
    },
  ],

  invalid: [
    // updateOne bypasses middleware
    {
      code: `User.updateOne({ _id: id }, { $set: { active: false } });`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // updateMany bypasses middleware
    {
      code: `User.updateMany({}, { $set: { active: false } });`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // deleteOne bypasses middleware
    {
      code: `User.deleteOne({ _id: id });`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // deleteMany bypasses middleware
    {
      code: `User.deleteMany({ old: true });`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // findOneAndUpdate bypasses middleware
    {
      code: `User.findOneAndUpdate({ _id: id }, { $set: { name: 'New' } });`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // findOneAndDelete bypasses middleware
    {
      code: `User.findOneAndDelete({ _id: id });`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // insertMany bypasses middleware
    {
      code: `User.insertMany([{ name: 'A' }, { name: 'B' }]);`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // bulkWrite bypasses middleware
    {
      code: `User.bulkWrite([{ updateOne: { filter: {}, update: {} } }]);`,
      errors: [{ messageId: 'bypassMiddleware' }],
    },
    // allowInTests: false
    {
      code: `User.updateOne({ _id: id }, { $set: { x: 1 } });`,
      filename: 'user.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'bypassMiddleware' }],
    },
  ],
});
