/**
 * @fileoverview Tests for require-secure-deletion
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireSecureDeletion } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-secure-deletion', requireSecureDeletion, {
  valid: [
    'const x = 42;',
    'const flag = true;',
    'function noop() {}',
    // Secure deletion patterns
    { name: 'an explicit secure delete', code: 'secureDelete(file)' },
    {
      name: 'a negated or typeof read of a sensitive property is not a delete',
      code: 'if (!user.password || typeof user.apiKey !== "string") reject();',
    },
    {
      code: 'data = null; gc()',
      name: 'nulling a value and forcing a collection is not a file deletion',
    },
    { code: 'const x = 1' },

    // Corpus regression — `delete` on an ordinary property is not a security
    // finding. Before this narrowing the rule fired on EVERY `delete obj.prop`,
    // producing 120 hits across a 1,470-file corpus (webpack, lodash,
    // eslint-plugin-import, two NestJS boilerplates) with no secret in sight.
    { name: 'a delete of a non-secret option is not reported', code: 'delete options.cacheable;' },
    { code: 'delete obj.prop;' },
    { code: 'delete stats.children;' },
    { code: 'delete acc[key];' }, // computed, name not statically known
    { code: 'delete obj["displayName"];' },
    // The name check is a substring match, so it must not be tricked into
    // firing on unrelated words that merely contain a fragment... and must not
    // miss ones that do (see invalid).
    { code: 'delete config.timeout;' },
  ],

  invalid: [
    // Using delete operator (doesn't securely wipe)
    {
      name: 'delete on a property holding a secret leaves the value in memory',
      code: 'delete user.password',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'delete sensitiveData.token',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'delete of a secret property is reported',
      code: 'delete obj.secret',
      errors: [{ messageId: 'violationDetected' }],
    },
    // True positives kept across naming conventions and computed access.
    {
      code: 'delete session.refreshToken',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'delete creds.apiKey',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'delete user.private_key',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'delete payload["accessToken"]',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

ruleTester.run('require-secure-deletion: local shallow copies', requireSecureDeletion, {
  valid: [
    {
      // @source nestjs/jwt lib/jwt.service.ts:193 (`delete options.secret`)
      // @found real-source scan of the nestjs/* packages, 2026-11-24
      // There the copy is made at the call site (`this.mergeJwtOptions({ ...options }, ...)`,
      // jwt.service.ts:34); this case inlines it into a local binding.
      name: 'stripping keys from a spread copy before passing it on is not reported',
      code: `
        function signOptions(options) {
          const opts = { ...options };
          delete opts.secret;
          delete opts.privateKey;
          return opts;
        }`,
    },
    {
      name: 'a copy made with Object.assign({}, …) is a fresh object too',
      code: 'const opts = Object.assign({}, options); delete opts.password;',
    },
    {
      name: 'Reflect.deleteProperty on a spread copy is not reported',
      code: "const copy = { ...record }; Reflect.deleteProperty(copy, 'token');",
    },
    {
      name: 'an optional-chain delete on a spread copy is not reported',
      code: 'let copy = { ...session }; delete copy?.refreshToken;',
    },
  ],
  invalid: [
    {
      name: 'deleting from the original object (a parameter) still reports',
      code: 'function strip(options) { delete options.secret; }',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'an alias of the original is not a copy',
      code: 'const alias = options; delete alias.secret;',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a copy reassigned to a shared object no longer counts',
      code: 'let opts = { ...a }; opts = shared; delete opts.secret;',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'Object.assign into a shared target mutates that target',
      code: 'const opts = Object.assign(shared, extra); delete opts.secret;',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'an object literal with no spread is not a copy of anything',
      code: 'const opts = { secret: s }; delete opts.secret;',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'an object returned by another call is not known to be a copy',
      code: 'const opts = loadOptions(); delete opts.secret;',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'Reflect.deleteProperty on a parameter still reports',
      code: "function strip(record) { Reflect.deleteProperty(record, 'token'); }",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
