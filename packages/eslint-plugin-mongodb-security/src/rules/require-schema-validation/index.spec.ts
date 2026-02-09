import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireSchemaValidation } from '../require-schema-validation/index';

const ruleTester = new RuleTester();

ruleTester.run('require-schema-validation', requireSchemaValidation, {
  valid: [
    // Field with required validation
    `new Schema({ name: { type: String, required: true } });`,
    // Field with enum validation
    `new Schema({ status: { type: String, enum: ["active", "inactive"] } });`,
    // Field with validate function
    `new Schema({ email: { type: String, validate: validateEmail } });`,
    // Field with min/max
    `new Schema({ age: { type: Number, min: 0, max: 150 } });`,
    // Field with match
    `new Schema({ phone: { type: String, match: /^\\d{10}$/ } });`,
    // Shorthand schema definition (no object)
    `new Schema({ name: String });`,
    // Not Schema constructor
    `new Model({ name: { type: String } });`,
    // Test file (allowed by default)
    {
      code: `new Schema({ name: { type: String } });`,
      filename: 'schema.test.ts',
    },
    // minlength/maxlength
    `new Schema({ name: { type: String, minlength: 2, maxlength: 100 } });`,
  ],

  invalid: [
    // Field with type but no validation
    {
      code: `new Schema({ name: { type: String } });`,
      errors: [{ messageId: 'requireSchemaValidation' }],
    },
    // Number field without validation
    {
      code: `new Schema({ age: { type: Number } });`,
      errors: [{ messageId: 'requireSchemaValidation' }],
    },
    // Multiple fields without validation
    {
      code: `new Schema({ name: { type: String }, age: { type: Number } });`,
      errors: [
        { messageId: 'requireSchemaValidation' },
        { messageId: 'requireSchemaValidation' },
      ],
    },
    // Field with only type and default (no validation)
    {
      code: `new Schema({ active: { type: Boolean, default: true } });`,
      errors: [{ messageId: 'requireSchemaValidation' }],
    },
    // allowInTests: false
    {
      code: `new Schema({ name: { type: String } });`,
      filename: 'schema.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'requireSchemaValidation' }],
    },
  ],
});
