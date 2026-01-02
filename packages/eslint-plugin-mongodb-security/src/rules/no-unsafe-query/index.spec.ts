import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeQuery } from './index';

const ruleTester = new RuleTester();

/**
 * Helper to create an invalid test case with suggestions
 */
function createInvalidCase(
  code: string,
  output: string,
  options?: { filename?: string; options?: [object] }
) {
  return {
    code,
    ...(options?.filename ? { filename: options.filename } : {}),
    ...(options?.options ? { options: options.options } : {}),
    errors: [
      {
        messageId: 'unsafeQuery' as const,
        suggestions: [
          {
            messageId: 'suggestionUseEq' as const,
            output,
          },
        ],
      },
    ],
  };
}

ruleTester.run('no-unsafe-query', noUnsafeQuery, {
  valid: [
    // =================================================================
    // TRUE NEGATIVES: Safe patterns that should NOT trigger
    // =================================================================

    // TN-1: Using $eq operator explicitly - prevents operator injection
    `User.find({ email: { $eq: req.body.email } })`,

    // TN-2: Literal values are always safe
    `db.collection('users').find({ active: true })`,

    // TN-3: String literal values
    `User.findOne({ role: 'admin' })`,

    // TN-4: Number literal values
    `User.find({ age: 25 })`,

    // TN-5: Null literal values
    `User.find({ deletedAt: null })`,

    // TN-6: Using sanitized input with $eq
    `User.findOne({ email: { $eq: sanitizedEmail } })`,

    // TN-7: Not a MongoDB method - Array.find()
    `someArray.find(x => x.id === req.body.id)`,

    // TN-8: Not a MongoDB method - Object.keys()
    `Object.keys(req.body)`,

    // TN-9: Empty query object
    `User.find({})`,

    // TN-10: Query with only operators (no user input)
    `User.find({ age: { $gt: 18, $lt: 65 } })`,

    // TN-11: Nested object with literals
    `User.find({ 'address.city': 'New York' })`,

    // TN-12: Array of literals
    `User.find({ role: { $in: ['admin', 'moderator'] } })`,

    // TN-13: Mongoose model method without query arg
    `User.findById(someId)`,

    // TN-14: RegExp literal (not user input)
    `User.find({ name: /^John/ })`,

    // TN-15: Date object (not user input)
    `User.find({ createdAt: { $gt: new Date('2023-01-01') } })`,

    // TN-16: Second argument to updateOne is safe
    `User.updateOne({ _id: { $eq: id } }, { $set: req.body })`,

    // TN-17: Aggregation pipeline (different AST structure)
    `User.aggregate([{ $match: { active: true } }])`,

    // TN-18: In test file (default allowInTests: true)
    {
      code: `User.find({ email: req.body.email })`,
      filename: 'user.test.ts',
    },

    // TN-19: In spec file
    {
      code: `User.find({ email: req.body.email })`,
      filename: 'user.spec.ts',
    },

    // TN-20: allowInTests: false still allows $eq pattern
    {
      code: `User.find({ email: { $eq: req.body.email } })`,
      filename: 'user.test.ts',
      options: [{ allowInTests: false }],
    },

    // TN-21: Custom method not in additionalMethods list
    {
      code: `User.customFindMethod({ email: req.body.email })`,
      options: [{ additionalMethods: ['otherMethod'] }],
    },
  ],

  invalid: [
    // =================================================================
    // TRUE POSITIVES: Vulnerable patterns that MUST trigger
    // =================================================================

    // TP-1: Direct req.body in query (classic attack vector)
    createInvalidCase(
      `User.find({ email: req.body.email })`,
      `User.find({ email: { $eq: req.body.email } })`
    ),

    // TP-2: Direct req.query in findOne
    createInvalidCase(
      `db.collection('users').findOne({ username: req.query.user })`,
      `db.collection('users').findOne({ username: { $eq: req.query.user } })`
    ),

    // TP-3: req.params in updateOne filter
    createInvalidCase(
      `User.updateOne({ _id: req.params.id }, { $set: { active: true } })`,
      `User.updateOne({ _id: { $eq: req.params.id } }, { $set: { active: true } })`
    ),

    // TP-4: Multiple user inputs in same query (first error)
    {
      code: `User.findOne({ email: req.body.email, password: req.body.password })`,
      errors: [
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: `User.findOne({ email: { $eq: req.body.email }, password: req.body.password })`,
            },
          ],
        },
        {
          messageId: 'unsafeQuery',
          suggestions: [
            {
              messageId: 'suggestionUseEq',
              output: `User.findOne({ email: req.body.email, password: { $eq: req.body.password } })`,
            },
          ],
        },
      ],
    },

    // TP-5: ctx.request.body (Koa style)
    createInvalidCase(
      `User.find({ email: ctx.request.body.email })`,
      `User.find({ email: { $eq: ctx.request.body.email } })`
    ),

    // TP-6: ctx.query (Koa style)
    createInvalidCase(
      `User.find({ search: ctx.query.term })`,
      `User.find({ search: { $eq: ctx.query.term } })`
    ),

    // TP-7: request.body (alternative naming)
    createInvalidCase(
      `User.find({ email: request.body.email })`,
      `User.find({ email: { $eq: request.body.email } })`
    ),

    // TP-8: request.query
    createInvalidCase(
      `User.find({ search: request.query.q })`,
      `User.find({ search: { $eq: request.query.q } })`
    ),

    // TP-9: request.params
    createInvalidCase(
      `User.deleteOne({ _id: request.params.id })`,
      `User.deleteOne({ _id: { $eq: request.params.id } })`
    ),

    // TP-10: deleteMany with user input
    createInvalidCase(
      `User.deleteMany({ userId: req.body.userId })`,
      `User.deleteMany({ userId: { $eq: req.body.userId } })`
    ),

    // TP-11: findOneAndUpdate with user input in filter
    createInvalidCase(
      `User.findOneAndUpdate({ email: req.body.email }, { $set: { active: true } })`,
      `User.findOneAndUpdate({ email: { $eq: req.body.email } }, { $set: { active: true } })`
    ),

    // TP-12: findOneAndDelete with user input
    createInvalidCase(
      `User.findOneAndDelete({ _id: req.params.id })`,
      `User.findOneAndDelete({ _id: { $eq: req.params.id } })`
    ),

    // TP-13: replaceOne with user input in filter
    createInvalidCase(
      `User.replaceOne({ _id: req.params.id }, newDoc)`,
      `User.replaceOne({ _id: { $eq: req.params.id } }, newDoc)`
    ),

    // TP-14: countDocuments with user input
    createInvalidCase(
      `User.countDocuments({ status: req.query.status })`,
      `User.countDocuments({ status: { $eq: req.query.status } })`
    ),

    // =================================================================
    // OPTIONS: allowInTests: false
    // =================================================================

    // OPT-1: Test file with allowInTests: false should flag
    createInvalidCase(
      `User.find({ email: req.body.email })`,
      `User.find({ email: { $eq: req.body.email } })`,
      { filename: 'user.test.ts', options: [{ allowInTests: false }] }
    ),

    // OPT-2: Spec file with allowInTests: false should flag
    createInvalidCase(
      `User.find({ email: req.body.email })`,
      `User.find({ email: { $eq: req.body.email } })`,
      { filename: 'user.spec.ts', options: [{ allowInTests: false }] }
    ),

    // =================================================================
    // OPTIONS: additionalMethods
    // =================================================================

    // OPT-3: Custom method added via additionalMethods
    createInvalidCase(
      `User.customFind({ email: req.body.email })`,
      `User.customFind({ email: { $eq: req.body.email } })`,
      { options: [{ additionalMethods: ['customFind'] }] }
    ),
  ],
});
