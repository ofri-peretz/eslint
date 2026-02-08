import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeWhere } from '../no-unsafe-where/index';

const ruleTester = new RuleTester();

ruleTester.run('no-unsafe-where', noUnsafeWhere, {
  valid: [
    // Normal query operators
    `User.find({ age: { $gt: 18 } });`,
    // Standard Mongoose where (field-based)
    `User.find().where('age').gt(18);`,
    // No $where in object
    `User.find({ name: 'John' });`,
    // Test file (allowed by default)
    {
      code: `User.find({ $where: 'this.age > 18' });`,
      filename: 'query.test.ts',
    },
  ],

  invalid: [
    // $where in query object (string property)
    {
      code: `User.find({ $where: 'this.age > 18' });`,
      errors: [{ messageId: 'unsafeWhere' }],
    },
    // $where with function
    {
      code: `User.find({ $where: function() { return this.age > 18; } });`,
      errors: [{ messageId: 'unsafeWhere' }],
    },
    // $where as quoted key
    {
      code: `db.collection('users').find({ '$where': 'this.isAdmin' });`,
      errors: [{ messageId: 'unsafeWhere' }],
    },
    // .where('$where') method call
    {
      code: `User.find().where('$where', 'this.age > 18');`,
      errors: [{ messageId: 'unsafeWhere' }],
    },
    // allowInTests: false
    {
      code: `User.find({ $where: 'this.isDanger' });`,
      filename: 'query.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unsafeWhere' }],
    },
  ],
});
