import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireSchemaValidation } from '../require-schema-validation/index';

/**
 * Every fixture imports mongoose, because the rules now abstain in files with
 * no Mongo in them. Wrapping the arrays rather than editing each fixture means
 * one cannot be left behind — a fixture missing the import would pass
 * vacuously on the gate instead of exercising the detection it was written
 * for. `output` and errors[].suggestions[].output are prefixed too, since
 * autofix fixtures assert the whole file back.
 */
// A SIDE-EFFECT import: satisfies the gate without reserving any binding, so
// fixtures that already declare `mongoose`/`db` do not redeclare.
const asMongo = (code: string): string => `import 'mongoose';\n${code}`;
type MongoSuggestion = { output?: string | null };
type MongoCase = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly MongoSuggestion[] } | string>;
};
const xmo = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asMongo(c) as T;
    const test = c as MongoCase;
    return {
      ...c,
      code: asMongo(test.code),
      ...(typeof test.output === 'string' ? { output: asMongo(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !Array.isArray(e.suggestions)
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asMongo(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


const ruleTester = new RuleTester();

ruleTester.run('require-schema-validation', requireSchemaValidation, {
  valid: xmo([
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
  ]),

  invalid: xmo([
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
  ]),
});
