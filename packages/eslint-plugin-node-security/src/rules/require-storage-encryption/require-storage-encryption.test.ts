/**
 * @fileoverview Tests for require-storage-encryption
 *
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireStorageEncryption } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-storage-encryption', requireStorageEncryption, {
  valid: [
    'const x = 42;',
    'const flag = true;',
    'function noop() {}',
    'const items = [];',
    'const obj = {};',
    'class Foo {}',
    { name: "the platform's encrypted store", code: "await SecureStore.setItemAsync('token', token)" },
    { code: 'const encrypted = encrypt(data)' },
  ],

  invalid: [
    {
      // FN: was `valid` as "a computed method name is not provably a write
      // call". `fs['writeFile']` is provably a write call. The line belongs
      // where `obj[method](...)` above already draws it — an unresolvable key.
      // @found computed-key blind-spot probe
      name: 'FN: an unencrypted credential written through a string subscript',
      code: "fs['writeFile']('creds.json', password)",
      errors: 1,
    },
    // Web Storage now belongs to require-secure-credential-storage; this rule owns the
    // filesystem. The two used to carry byte-identical implementations and reported every
    // match twice, under two rule ids and the same CWE.
    {
      name: 'a password written to a plain file',
      code: "fs.writeFileSync('creds.json', password)",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

/**
 * Regression lock — a credential landing on disk in the clear.
 *
 * Previously fired on every `.writeFile` and `.setItem` in the file, duplicating
 * `require-secure-credential-storage` exactly. Client storage now belongs to that rule;
 * this one owns the filesystem, and both demand evidence a credential is involved.
 */
ruleTester.run(
  'require-storage-encryption: evidence gate',
  requireStorageEncryption,
  {
    valid: [
      // The case from eslint-plugin-security's own valid corpus.
      { code: 'fsp.writeFile(sitemapPath, sitemap)' },
      { code: "fs.writeFileSync('index.html', html)" },
      // A credential, PROVABLY encrypted on the way out.
      //
      // These three were `fs.writeFileSync('creds.json', encrypt(password))` and
      // two variants of it, and they were VACUOUS: `creds.json` contains no
      // credential word (the list has `credential`, not `creds`) and the wrapped
      // `password` is invisible to `storesACredential`, which reads argument
      // NAMES and gets `''` from a CallExpression. All three were quiet because
      // the rule never reached the encryption gate at all — see the positive
      // control in the `invalid` half, which is the same file name with the
      // wrapper removed.
      {
        code: "const crypto = require('node:crypto'); fs.writeFileSync('password.txt', crypto.publicEncrypt(key, secret))",
      },
      {
        code: "const { createCipheriv } = require('crypto'); const cipher = createCipheriv('aes-256-gcm', key, iv); fs.writeFileSync('password.txt', Buffer.concat([cipher.update(secret), cipher.final()]))",
      },
      // A local wrapper that provably delegates, whatever it is called.
      {
        code: "import { publicEncrypt } from 'node:crypto'; const seal = (v) => publicEncrypt(key, v); fs.writeFileSync('password.txt', seal(secret))",
      },
      // Client storage is the other rule's subject now.
      { code: "localStorage.setItem('authToken', t)" },
      // Not a write at all.
      { code: "fs.readFileSync('creds.json')" },
      { code: "obj[method]('creds.json', password)" },

    ],
    invalid: [
      {
        code: "fs.writeFile('creds.json', password)",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: "fs.appendFileSync('log.txt', apiKey)",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: "fs.appendFile('log.txt', authToken)",
        errors: [{ messageId: 'violationDetected' }],
      },
      // The filename can be the evidence.
      {
        code: "fs.writeFileSync('client_secret.json', data)",
        errors: [{ messageId: 'violationDetected' }],
      },
      // `decrypt` CONTAINS `encrypt`. A substring match read this as safely encrypted —
      // the exact inverse of the truth, and the reason both rules sat in
      // scripts/lint-name-inference.ts as recorded debt. Matching at a camelCase token
      // boundary pays it.
      {
        code: "fs.writeFileSync('client_secret.json', decrypt(blob))",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: "fs.appendFileSync('auth_token.log', vault.decryptSync(blob))",
        errors: [{ messageId: 'violationDetected' }],
      },

      // POSITIVE CONTROL for the three `valid` cases above: the same sink and the
      // same credential-naming file name, with no encryption wrapper. If this
      // ever goes quiet, those three prove nothing.
      {
        code: "fs.writeFileSync('password.txt', secret)",
        errors: [{ messageId: 'violationDetected' }],
      },

      // ── LOCK: suppression from EVIDENCE, not from a spelling ──────────────
      // A local identity function called `encrypt` encrypts nothing.
      {
        code: "const encrypt = (v) => v; fs.writeFileSync('password.txt', encrypt(secret))",
        errors: [{ messageId: 'violationDetected' }],
      },
      // An unresolvable global spelled like encryption is not proof of any.
      {
        code: "fs.writeFileSync('password.txt', aes256Encrypt(secret))",
        errors: [{ messageId: 'violationDetected' }],
      },
      // A real crypto module, but a hash rather than a cipher.
      {
        code: "const crypto = require('node:crypto'); fs.writeFileSync('password.txt', crypto.createHash('sha256').update(secret).digest())",
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);
