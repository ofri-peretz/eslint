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
    { code: "await SecureStore.setItemAsync('token', token)" },
    { code: "const encrypted = encrypt(data)" }
  ],

  invalid: [
    // Web Storage now belongs to require-secure-credential-storage; this rule owns the
    // filesystem. The two used to carry byte-identical implementations and reported every
    // match twice, under two rule ids and the same CWE.
    { code: "fs.writeFileSync('creds.json', password)", errors: [{ messageId: 'violationDetected' }] }
  ],
});

/**
 * Regression lock — a credential landing on disk in the clear.
 *
 * Previously fired on every `.writeFile` and `.setItem` in the file, duplicating
 * `require-secure-credential-storage` exactly. Client storage now belongs to that rule;
 * this one owns the filesystem, and both demand evidence a credential is involved.
 */
ruleTester.run('require-storage-encryption: evidence gate', requireStorageEncryption, {
  valid: [
    // The case from eslint-plugin-security's own valid corpus.
    { code: "fsp.writeFile(sitemapPath, sitemap)" },
    { code: "fs.writeFileSync('index.html', html)" },
    // A credential, encrypted on the way out.
    { code: "fs.writeFileSync('creds.json', encrypt(password))" },
    { code: "fs.writeFileSync('creds.json', vault.encryptSync(password))" },
    { code: "fs.writeFileSync('creds.json', aes256Encrypt(password))" },
    // Client storage is the other rule's subject now.
    { code: "localStorage.setItem('authToken', t)" },
    // Not a write at all.
    { code: "fs.readFileSync('creds.json')" },
    { code: "obj[method]('creds.json', password)" },
    // A computed method name is not provably a write call.
    { code: "fs['writeFile']('creds.json', password)" },
  ],
  invalid: [
    { code: "fs.writeFile('creds.json', password)", errors: [{ messageId: 'violationDetected' }] },
    { code: "fs.appendFileSync('log.txt', apiKey)", errors: [{ messageId: 'violationDetected' }] },
    { code: "fs.appendFile('log.txt', authToken)", errors: [{ messageId: 'violationDetected' }] },
    // The filename can be the evidence.
    { code: "fs.writeFileSync('client_secret.json', data)", errors: [{ messageId: 'violationDetected' }] },
    // `decrypt` CONTAINS `encrypt`. A substring match read this as safely encrypted —
    // the exact inverse of the truth, and the reason both rules sat in
    // scripts/lint-name-inference.ts as recorded debt. Matching at a camelCase token
    // boundary pays it.
    { code: "fs.writeFileSync('client_secret.json', decrypt(blob))", errors: [{ messageId: 'violationDetected' }] },
    { code: "fs.appendFileSync('auth_token.log', vault.decryptSync(blob))", errors: [{ messageId: 'violationDetected' }] },
  ],
});
