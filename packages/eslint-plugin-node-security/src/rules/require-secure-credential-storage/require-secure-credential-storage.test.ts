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

ruleTester.run(
  'require-secure-credential-storage',
  requireSecureCredentialStorage,
  {
    valid: [
      'const x = 42;',
      'const flag = true;',
      'function noop() {}',
      'const items = [];',
      'const obj = {};',
      'class Foo {}',
      { name: 'the platform keychain', code: 'await Keychain.setPassword(service, password)' },
      { code: "SecureStore.setItemAsync('key', value)" },
    ],

    invalid: [
      {
        name: 'an API key in AsyncStorage, which is plain text on disk',
        code: "AsyncStorage.setItem('apiKey', key)",
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);

/**
 * Regression lock — a credential in client storage, judged on evidence.
 *
 * This rule and `require-storage-encryption` previously carried byte-identical
 * implementations that fired on ANY `.setItem` or `.writeFile`, so every match was
 * reported twice under two rule ids and the same CWE — `writeFile(sitemapPath, sitemap)`
 * included. This one now owns client storage; disk writes belong to the other.
 */
ruleTester.run(
  'require-secure-credential-storage: evidence gate',
  requireSecureCredentialStorage,
  {
    valid: [
      // A store, but nothing says a credential is going into it.
      { code: "localStorage.setItem('theme', 'dark')" },
      { code: "localStorage.setItem('lastSeen', timestamp)" },
      // A credential, PROVABLY encrypted on the way in — the callee resolves back
      // through the import that introduced it to `node:crypto`, and to an
      // encryption API rather than to a hash or a nonce.
      //
      // These two cases used to read `encrypt(token)` and `crypto.encryptSync(token)`
      // with nothing declared, and passed because `isEncryptedExpression` judged
      // the callee's SPELLING. See the `invalid` half of this block for what that
      // suppressed.
      {
        code: "const crypto = require('node:crypto'); localStorage.setItem('authToken', crypto.publicEncrypt(key, token))",
      },
      {
        code: "import { publicEncrypt } from 'crypto'; localStorage.setItem('authToken', publicEncrypt(key, token))",
      },
      // The real Node idiom: the factory produces a cipher, and `update`/`final`
      // produce the ciphertext. Only reachable by resolving the RECEIVER.
      {
        code: "const { createCipheriv } = require('crypto'); const cipher = createCipheriv('aes-256-gcm', key, iv); localStorage.setItem('authToken', Buffer.concat([cipher.update(token), cipher.final()]))",
      },
      // A local wrapper that PROVABLY delegates. The name is irrelevant — this
      // one is called `wrap`.
      {
        code: "const { publicEncrypt } = require('crypto'); function wrap(v) { return publicEncrypt(key, v); } localStorage.setItem('authToken', wrap(token))",
      },
      // WebCrypto, which is promise-based, so the proof sits under an `await`.
      {
        code: "import { webcrypto } from 'node:crypto'; async function save(token) { localStorage.setItem('authToken', await webcrypto.subtle.encrypt(algo, key, token)); }",
      },
      // CryptoJS spells it `AES.encrypt`.
      {
        code: "import CryptoJS from 'crypto-js'; localStorage.setItem('authToken', CryptoJS.AES.encrypt(token, key))",
      },
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
      { code: 'localStorage.setItem(42, value)' },
      // Spread arguments hide their contents.
      { code: 'localStorage.setItem(...args)' },
      // A computed member with a non-identifier key carries no name to read.
      { code: 'localStorage.setItem(k, creds[0])' },
      // A computed METHOD name is not provably `setItem`.
      { code: "localStorage['setItem']('password', p)" },
    ],
    invalid: [
      {
        code: "localStorage.setItem('authToken', t)",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: "sessionStorage.setItem('refresh_token', t)",
        errors: [{ messageId: 'violationDetected' }],
      },
      // React Native's AsyncStorage is unencrypted by its own documentation.
      {
        code: "AsyncStorage.setItem('apiKey', v)",
        errors: [{ messageId: 'violationDetected' }],
      },
      // `window.` / `globalThis.` qualified receivers.
      {
        code: "window.localStorage.setItem('password', p)",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: "globalThis.sessionStorage.setItem('jwt', t)",
        errors: [{ messageId: 'violationDetected' }],
      },
      // Evidence can come from the VALUE rather than the key.
      {
        code: "localStorage.setItem('u', clientSecret)",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: "localStorage.setItem('u', session.accessToken)",
        errors: [{ messageId: 'violationDetected' }],
      },
      // A template-literal key still carries its text.
      {
        code: 'localStorage.setItem(`user_password`, p)',
        errors: [{ messageId: 'violationDetected' }],
      },
      // An encrypt-looking VARIABLE is not proof anything encrypted it.
      {
        code: "localStorage.setItem('authToken', encrypted)",
        errors: [{ messageId: 'violationDetected' }],
      },
      // Encryption on a THIRD argument does not encrypt the stored value. Checking "any
      // argument" let `setItem('authToken', token, encrypt(metadata))` store the token in
      // cleartext and silence the rule with an encryption call on something else.
      {
        code: "localStorage.setItem('authToken', token, encrypt(metadata))",
        errors: [{ messageId: 'violationDetected' }],
      },
      // A wrapper call that is not encryption.
      {
        code: "localStorage.setItem('authToken', String(t))",
        errors: [{ messageId: 'violationDetected' }],
      },

      // ── LOCK: the suppression must come from EVIDENCE, not from a spelling ──
      //
      // `isEncryptedExpression` used to accept any callee with a camelCase token
      // starting `encrypt`. The substring test lived one function away from any
      // `.name`, which is exactly how it got past `lint:name-inference`.
      //
      // The costliest shape, and the one that measured the defect: a local
      // identity function. It is declared right there, its body returns its
      // argument, and it silenced the finding.
      {
        code: "const encrypt = (v) => v; localStorage.setItem('authToken', encrypt(token))",
        errors: [{ messageId: 'violationDetected' }],
      },
      // A declared function whose body demonstrably does not encrypt.
      {
        code: "function encryptToken(v) { return v.toUpperCase(); } localStorage.setItem('authToken', encryptToken(token))",
        errors: [{ messageId: 'violationDetected' }],
      },
      // An unresolvable global that is merely SPELLED like encryption. Nothing in
      // the file says what it does, and "unproven" is not "encrypted".
      {
        code: "localStorage.setItem('authToken', encrypt(token))",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: "localStorage.setItem('authToken', crypto.encryptSync(token))",
        errors: [{ messageId: 'violationDetected' }],
      },
      // A REAL crypto module, but the wrong API: `randomBytes` is a nonce and
      // `createHash` is a digest. Neither encrypts the token sitting next to it.
      {
        code: "const crypto = require('node:crypto'); localStorage.setItem('authToken', crypto.randomBytes(32))",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: "import { createHash } from 'crypto'; localStorage.setItem('authToken', createHash('sha256').update(token).digest('hex'))",
        errors: [{ messageId: 'violationDetected' }],
      },
      // The right API name off the WRONG module — a local helper file that
      // happens to export `publicEncrypt`.
      {
        code: "const { publicEncrypt } = require('./crypto-helpers'); localStorage.setItem('authToken', publicEncrypt(key, token))",
        errors: [{ messageId: 'violationDetected' }],
      },
      // `decrypt` is the inverse of the control, and the shape that made the
      // original substring match ship as a token match. It still must report.
      {
        code: "const { privateDecrypt } = require('crypto'); localStorage.setItem('authToken', privateDecrypt(key, blob))",
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);

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
ruleTester.run(
  'require-secure-credential-storage — process.env',
  requireSecureCredentialStorage,
  {
    valid: [
      // The two things this assignment is nearly always for.
      'process.env.PORT = "3000";',
      'process.env.NODE_ENV = "test";',
      'process.env.TZ = "UTC";',
      // READS are fine and universal — only the write is the finding.
      'const token = process.env.AUTH_TOKEN;',
      'if (process.env.API_KEY) { start(); }',
      // PROVABLY encrypted on the way in — the callee is resolved back to
      // `node:crypto`, not read for the word `encrypt`. Both of these used to be
      // `encrypt(rawToken)` / `vault.encryptSync(s)` with nothing declared.
      "const crypto = require('node:crypto'); process.env.API_TOKEN = crypto.publicEncrypt(key, rawToken);",
      "import { publicEncrypt } from 'node:crypto'; process.env.SESSION_SECRET = publicEncrypt(key, s);",
      // A computed key with no readable name is no evidence.
      'process.env[dynamicKey] = value;',
      // An assignment whose target is not a member expression at all. The
      // AssignmentExpression visitor sees every assignment in the file, so this
      // is the commonest thing it is handed.
      'let sessionToken = 0; sessionToken = fetchToken();',
      // Not `process.env` — a lookalike object.
      'config.env.SESSION_TOKEN = t;',
      'process.argv.SECRET = s;',
      // `env` reached through a computed property is not provably process.env.
      'process["env"].SESSION_TOKEN = t;',

      // ── The alias arm, and where it stops ──────────────────────────────────
      // A `let` can hold something else by the time the write happens, so its
      // initializer proves nothing.
      'let env = process.env; env.API_TOKEN = t;',
      // A binding that resolves to something other than process.env.
      'const env = getEnvironment(); env.API_TOKEN = t;',
      // Three hops is past the resolution bound — unresolved, not safe.
      'const a = process.env; const b = a; const c = b; c.API_TOKEN = t;',

      // ── Object.assign, and the shapes that are not it ─────────────────────
      // Target is not process.env.
      'Object.assign(config, { API_TOKEN: token });',
      // process.env, but nothing that names a credential.
      'Object.assign(process.env, { PORT: "3000", NODE_ENV: "test" });',
      // Provably encrypted on the way in.
      "import { publicEncrypt } from 'crypto'; Object.assign(process.env, { API_TOKEN: publicEncrypt(key, token) });",
      // A source that is not an object literal has no readable keys.
      'Object.assign(process.env, resolvedSecrets);',
      // A spread property names nothing.
      'Object.assign(process.env, { ...resolvedSecrets });',
      // No target at all.
      'Object.assign();',
      // Neither the receiver, the method, nor the notation is Object.assign.
      'Object.keys(process.env);',
      'lodash.assign(process.env, { API_TOKEN: token });',
      'Object["assign"](process.env, { API_TOKEN: token });',
      'assign(process.env, { API_TOKEN: token });',
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

      // ── FN locks from benchmarks/rule-corpus/node-security__require-secure-credential-storage ──
      //
      // vulnerable/12-env-alias.js. `const env = process.env` is how config
      // modules are written, and the write through the alias mutates the same
      // object. Quiet on the unfixed rule.
      {
        code: 'const env = process.env;\nenv.SERVICE_API_KEY = rotation.newKey;',
        errors: [{ messageId: 'credentialInEnvironment' }],
      },
      // vulnerable/11-object-assign-env.js. A secrets loader publishes a whole
      // map at once; that never forms an AssignmentExpression, so the only
      // handler this rule had could not see it. Quiet on the unfixed rule.
      {
        code: 'Object.assign(process.env, { DATABASE_PASSWORD: r.dbPassword, JWT_SIGNING_SECRET: r.jwtSecret });',
        errors: [
          { messageId: 'credentialInEnvironment' },
          { messageId: 'credentialInEnvironment' },
        ],
      },
      // Both new arms at once.
      {
        code: 'const env = process.env;\nObject.assign(env, { NPM_TOKEN: grant.token, PORT: "3000" });',
        errors: [{ messageId: 'credentialInEnvironment' }],
      },
    ],
  },
);
