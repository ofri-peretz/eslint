import { RuleTester } from '@typescript-eslint/rule-tester';
import { noOperatorInjection } from '../no-operator-injection/index';

const ruleTester = new RuleTester();

ruleTester.run('no-operator-injection', noOperatorInjection, {
  valid: [
    // Static values in operators
    `User.find({ age: { $gt: 18 } });`,
    // No user input
    `User.find({ status: { $ne: 'deleted' } });`,
    // $eq with user input is safe
    `User.find({ email: { $eq: req.body.email } });`,
    // Non-operator properties
    `User.find({ name: req.body.name });`,
    // Test file (allowed by default)
    {
      code: `User.find({ age: { $ne: req.body.age } });`,
      filename: 'query.test.ts',
    },
  ],

  invalid: [
    // $ne with user input
    {
      code: `User.find({ age: { $ne: req.body.age } });`,
      errors: [{ messageId: 'operatorInjection' }],
    },
    // $gt with req.query
    {
      code: `User.find({ score: { $gt: req.query.minScore } });`,
      errors: [{ messageId: 'operatorInjection' }],
    },
    // $lt with req.params
    {
      code: `User.find({ price: { $lt: req.params.maxPrice } });`,
      errors: [{ messageId: 'operatorInjection' }],
    },
    // $exists with request.body
    {
      code: `User.find({ field: { $exists: request.body.check } });`,
      errors: [{ messageId: 'operatorInjection' }],
    },
    // $nin with ctx.request.body
    {
      code: `User.find({ role: { $nin: ctx.request.roles } });`,
      errors: [{ messageId: 'operatorInjection' }],
    },
    // allowInTests: false
    {
      code: `User.find({ age: { $ne: req.body.age } });`,
      filename: 'query.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'operatorInjection' }],
    },
  ],
});
