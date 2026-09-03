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
    { name: 'an explicit secure delete', code: "secureDelete(file)" },
    { code: "data = null; gc()" },
    { code: "const x = 1" },

    // Corpus regression — `delete` on an ordinary property is not a security
    // finding. Before this narrowing the rule fired on EVERY `delete obj.prop`,
    // producing 120 hits across a 1,470-file corpus (webpack, lodash,
    // eslint-plugin-import, two NestJS boilerplates) with no secret in sight.
    { code: 'delete options.cacheable;' },
    { code: 'delete obj.prop;' },
    { code: 'delete stats.children;' },
    { code: 'delete acc[key];' },              // computed, name not statically known
    { code: 'delete obj["displayName"];' },
    // The name check is a substring match, so it must not be tricked into
    // firing on unrelated words that merely contain a fragment... and must not
    // miss ones that do (see invalid).
    { code: 'delete config.timeout;' },
  ],

  invalid: [
    // Using delete operator (doesn't securely wipe)
    { name: 'delete on a property holding a secret leaves the value in memory', code: "delete user.password", errors: [{ messageId: 'violationDetected' }] },
    { code: "delete sensitiveData.token", errors: [{ messageId: 'violationDetected' }] },
    { code: "delete obj.secret", errors: [{ messageId: 'violationDetected' }] },
    // True positives kept across naming conventions and computed access.
    { code: "delete session.refreshToken", errors: [{ messageId: 'violationDetected' }] },
    { code: "delete creds.apiKey", errors: [{ messageId: 'violationDetected' }] },
    { code: "delete user.private_key", errors: [{ messageId: 'violationDetected' }] },
    { code: 'delete payload["accessToken"]', errors: [{ messageId: 'violationDetected' }] },
  ],
});
