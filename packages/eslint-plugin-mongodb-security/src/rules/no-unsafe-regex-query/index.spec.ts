import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeRegexQuery } from '../no-unsafe-regex-query/index';

const ruleTester = new RuleTester();

ruleTester.run('no-unsafe-regex-query', noUnsafeRegexQuery, {
  valid: [
    // Static regex
    `User.find({ name: { $regex: /^john/i } });`,
    // Static string regex
    `User.find({ name: { $regex: "^john" } });`,
    // No $regex
    `User.find({ name: "john" });`,
    // Non-query method
    `User.save({ name: { $regex: req.body.search } });`,
    // Not a member expression
    `find({ name: { $regex: req.body.search } });`,
    // Test file (allowed by default)
    {
      code: `User.find({ name: { $regex: req.body.search } });`,
      filename: 'search.test.ts',
    },
  ],

  invalid: [
    // User input in $regex
    {
      code: `User.find({ name: { $regex: req.body.search } });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // Template literal with expression
    {
      code: 'User.find({ name: { $regex: `${req.query.search}` } });',
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // new RegExp with user input
    {
      code: `User.find({ name: { $regex: new RegExp(req.query.pattern) } });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // findOne with $regex
    {
      code: `User.findOne({ email: { $regex: req.body.emailPattern } });`,
      errors: [{ messageId: 'unsafeRegex' }],
    },
    // allowInTests: false
    {
      code: `User.find({ name: { $regex: req.body.search } });`,
      filename: 'search.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unsafeRegex' }],
    },
  ],
});
