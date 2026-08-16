/**
 * @fileoverview Tests for require-secure-credential-storage
 * 
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireSecureCredentialStorage } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-secure-credential-storage', requireSecureCredentialStorage, {
  valid: [
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
        'const items = [];',
        'const obj = {};',
        'class Foo {}',
    { code: "await Keychain.setPassword(service, password)" },
    { code: "SecureStore.setItemAsync('key', value)" }
  ],

  invalid: [
    { code: "AsyncStorage.setItem('apiKey', key)", errors: [{ messageId: 'violationDetected' }] }
  ],
});

/**
 * Regression lock — a credential in client storage, judged on evidence.
 *
 * This rule and `require-storage-encryption` previously carried byte-identical
 * implementations that fired on ANY `.setItem` or `.writeFile`, so every match was
 * reported twice under two rule ids and the same CWE — `writeFile(sitemapPath, sitemap)`
 * included. This one now owns client storage; disk writes belong to the other.
 */
ruleTester.run('require-secure-credential-storage: evidence gate', requireSecureCredentialStorage, {
  valid: [
    // A store, but nothing says a credential is going into it.
    { code: "localStorage.setItem('theme', 'dark')" },
    { code: "localStorage.setItem('lastSeen', timestamp)" },
    // A credential, but already encrypted on the way in.
    { code: "localStorage.setItem('authToken', encrypt(token))" },
    { code: "localStorage.setItem('authToken', crypto.encryptSync(token))" },
    // `setItem` on something that is not a persistent store.
    { code: "cache.setItem('password', pwd)" },
    { code: "this.setItem('password', pwd)" },
    // Disk writes are the other rule's subject now.
    { code: "fs.writeFile('creds.json', password)" },
    // `key` alone is not evidence: reading a TLS key at startup is how TLS works.
    { code: "localStorage.setItem('key', publicKey)" },
    // A computed receiver carries no name to judge.
    { code: "stores[name].setItem('password', pwd)" },
    // A non-string literal key names nothing.
    { code: "localStorage.setItem(42, value)" },
    // Spread arguments hide their contents.
    { code: "localStorage.setItem(...args)" },
    // A computed member with a non-identifier key carries no name to read.
    { code: "localStorage.setItem(k, creds[0])" },
    // A computed METHOD name is not provably `setItem`.
    { code: "localStorage['setItem']('password', p)" },
  ],
  invalid: [
    { code: "localStorage.setItem('authToken', t)", errors: [{ messageId: 'violationDetected' }] },
    { code: "sessionStorage.setItem('refresh_token', t)", errors: [{ messageId: 'violationDetected' }] },
    // React Native's AsyncStorage is unencrypted by its own documentation.
    { code: "AsyncStorage.setItem('apiKey', v)", errors: [{ messageId: 'violationDetected' }] },
    // `window.` / `globalThis.` qualified receivers.
    { code: "window.localStorage.setItem('password', p)", errors: [{ messageId: 'violationDetected' }] },
    { code: "globalThis.sessionStorage.setItem('jwt', t)", errors: [{ messageId: 'violationDetected' }] },
    // Evidence can come from the VALUE rather than the key.
    { code: "localStorage.setItem('u', clientSecret)", errors: [{ messageId: 'violationDetected' }] },
    { code: "localStorage.setItem('u', session.accessToken)", errors: [{ messageId: 'violationDetected' }] },
    // A template-literal key still carries its text.
    { code: "localStorage.setItem(`user_password`, p)", errors: [{ messageId: 'violationDetected' }] },
    // An encrypt-looking VARIABLE is not proof anything encrypted it.
    { code: "localStorage.setItem('authToken', encrypted)", errors: [{ messageId: 'violationDetected' }] },
    // Encryption on a THIRD argument does not encrypt the stored value. Checking "any
    // argument" let `setItem('authToken', token, encrypt(metadata))` store the token in
    // cleartext and silence the rule with an encryption call on something else.
    { code: "localStorage.setItem('authToken', token, encrypt(metadata))", errors: [{ messageId: 'violationDetected' }] },
    // A wrapper call that is not encryption.
    { code: "localStorage.setItem('authToken', String(t))", errors: [{ messageId: 'violationDetected' }] },
  ],
});

/**
 * VACUOUS-RULE lock — the Node sink.
 *
 * Every sink above is a browser or React Native global: `localStorage`,
 * `sessionStorage`, `AsyncStorage`. None of the three exists in Node. So inside
 * `eslint-plugin-node-security` this rule could not fire on a pure server
 * codebase at all — 29 test cases, a CWE, a CVSS score, and no reachable sink.
 * Every case in this block is QUIET on the pre-fix rule.
 *
 * Disk writes could not simply be added: `require-storage-encryption` owns
 * those, and duplicating them recreates the double-reporting defect the two
 * rules were split apart to fix. `process.env` is the sink neither rule
 * claimed, and it is the one Node actually has — CWE-526, inherited by every
 * child process, readable at /proc/<pid>/environ, captured by crash dumps.
 *
 * The valid cases matter more than usual here. `process.env.X = …` is
 * overwhelmingly used for PORT and NODE_ENV, and a rule that reported those
 * would be turned off within a day.
 */
ruleTester.run('require-secure-credential-storage — process.env', requireSecureCredentialStorage, {
  valid: [
    // The two things this assignment is nearly always for.
    'process.env.PORT = "3000";',
    'process.env.NODE_ENV = "test";',
    'process.env.TZ = "UTC";',
    // READS are fine and universal — only the write is the finding.
    'const token = process.env.AUTH_TOKEN;',
    'if (process.env.API_KEY) { start(); }',
    // Encrypted on the way in.
    'process.env.API_TOKEN = encrypt(rawToken);',
    'process.env.SESSION_SECRET = vault.encryptSync(s);',
    // A computed key with no readable name is no evidence.
    'process.env[dynamicKey] = value;',
    // Not `process.env` — a lookalike object.
    'config.env.SESSION_TOKEN = t;',
    'process.argv.SECRET = s;',
    // `env` reached through a computed property is not provably process.env.
    'process["env"].SESSION_TOKEN = t;',
  ],
  invalid: [
    // Evidence in the TARGET name.
    {
      code: 'process.env.SESSION_TOKEN = sessionToken;',
      errors: [{ messageId: 'credentialInEnvironment' }],
    },
    // Bracket notation names the same slot as dot notation.
    {
      code: 'process.env["CLIENT_SECRET"] = readSecret();',
      errors: [{ messageId: 'credentialInEnvironment' }],
    },
    // Evidence in the VALUE only — the variable name is the credential.
    {
      code: 'process.env.X = apiKey;',
      errors: [{ messageId: 'credentialInEnvironment' }],
    },
    {
      code: 'process.env.UPSTREAM = config.refreshToken;',
      errors: [{ messageId: 'credentialInEnvironment' }],
    },
    // A decrypt call is not an encrypt call — the `decrypt` ⊃ `encrypt`
    // substring trap, checked on this sink too.
    {
      code: 'process.env.DB_PASSWORD = decrypt(blob);',
      errors: [{ messageId: 'credentialInEnvironment' }],
    },
    // The archetype: hoisting a fetched secret into the environment so child
    // processes pick it up. That inheritance IS the vulnerability.
    {
      code: 'process.env.NPM_TOKEN = await vault.read("npm/token");',
      errors: [{ messageId: 'credentialInEnvironment' }],
    },
  ],
});
