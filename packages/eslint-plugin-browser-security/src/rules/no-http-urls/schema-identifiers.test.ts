/**
 * JSON Schema identifiers (`$schema`, `$id`) are not destinations.
 *
 * Exactly those two keys are exempt. Every neighbouring shape keeps reporting.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHttpUrls } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('no-http-urls (schema identifiers)', noHttpUrls, {
  valid: [
    {
      // @source dependency-cruiser/dependency-cruiser tools/schema/configuration.schema.mjs:6 (65ae57fe)
      // @found real-source scan
      name: 'FP: $schema names the JSON Schema dialect, it is compared and never fetched',
      code: 'export default { $schema: "http://json-schema.org/draft-07/schema#", title: "x" };',
    },
    {
      // @source dependency-cruiser/dependency-cruiser tools/schema/configuration.schema.mjs:7 (65ae57fe)
      // @found real-source scan
      name: 'FP: $id names the schema itself',
      code: 'export default { $id: "http://dependency-cruiser.example.org/schema/configuration.schema.json" };',
    },
    {
      // @source dependency-cruiser/dependency-cruiser tools/schema/cruise-result.schema.mjs:8 (65ae57fe)
      // @found real-source scan
      name: 'FP: a quoted $schema key declares the same property',
      code: 'const s = { "$schema": "http://json-schema.org/draft-07/schema#" };',
    },
    {
      // @source dependency-cruiser/dependency-cruiser src/schema/baseline-violations.schema.mjs:1 (65ae57fe)
      // @found real-source scan
      name: 'FP: a template under $id is declared by the same key',
      code: 'const s = { $id: `http://schemas.acmecorp.io/${name}.json` };',
    },
  ],
  invalid: [
    {
      name: 'a real http URL under an ordinary key still reports',
      code: 'const s = { url: "http://api.acmecorp.io/v1" };',
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    {
      name: 'a schema-looking key that is not $schema or $id still reports',
      code: 'const s = { schemaUrl: "http://schemas.acmecorp.io/a.json" };',
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    {
      name: '$ref is a reference that is resolved, so it still reports',
      code: 'const s = { $ref: "http://schemas.acmecorp.io/a.json" };',
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    {
      name: 'a $schema-named VARIABLE is not a property declaration',
      code: 'const $schema = "http://schemas.acmecorp.io/a.json";',
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    {
      name: 'the value must be under $schema, not nested inside it',
      code: 'const s = { $schema: { url: "http://schemas.acmecorp.io/a.json" } };',
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    {
      name: 'an anchor href is a navigation, not a schema identifier',
      code: 'const a = <a href="http://acmecorp.io/x" />;',
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
  ],
});
