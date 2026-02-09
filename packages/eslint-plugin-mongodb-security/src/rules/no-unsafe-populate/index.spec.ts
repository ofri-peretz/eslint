import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafePopulate } from '../no-unsafe-populate/index';

const ruleTester = new RuleTester();

ruleTester.run('no-unsafe-populate', noUnsafePopulate, {
  valid: [
    // Static string path
    `User.findOne({}).populate("posts");`,
    // Static string path with select
    `User.findOne({}).populate("comments");`,
    // Object with static path
    `User.findOne({}).populate({ path: "posts", select: "title" });`,
    // No arguments
    `User.findOne({}).populate();`,
    // Not populate method
    `User.findOne({}).exec();`,
    // Not a member expression
    `populate("test");`,
    // Test file (allowed by default)
    {
      code: `User.findOne({}).populate(req.body.field);`,
      filename: 'user.test.ts',
    },
  ],

  invalid: [
    // Direct user input
    {
      code: `User.findOne({}).populate(req.body.field);`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    // req.query input
    {
      code: `User.findOne({}).populate(req.query.include);`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    // Variable (potentially tainted)
    {
      code: `User.findOne({}).populate(userField);`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    // Object with user-controlled path
    {
      code: `User.findOne({}).populate({ path: req.body.field });`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    // Object with variable path
    {
      code: `User.findOne({}).populate({ path: populatePath });`,
      errors: [{ messageId: 'unsafePopulate' }],
    },
    // allowInTests: false
    {
      code: `User.findOne({}).populate(req.body.field);`,
      filename: 'user.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unsafePopulate' }],
    },
  ],
});
