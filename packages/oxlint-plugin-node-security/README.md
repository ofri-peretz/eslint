<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-node-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://nodejs.org" target="_blank"><img src="https://eslint.interlace.tools/logos/node.svg" alt="Node.js" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Security-focused ESLint plugin for Node.js built-in modules (fs, child_process, vm, crypto, Buffer).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-node-security" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-node-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-node-security" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-node-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-node-security" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-node-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-node-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-node-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-node-security` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security). It carries the same rules under the same IDs (`node-security/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Covered natively by oxlint

None of these 43 rules has an oxlint built-in equivalent. Every rule here is new to oxlint.

- **Why** — a linter nobody reads protects nothing. We would rather miss a finding
  than spend your attention on one that was never real.
- **How** — evidence, not names. A rule fires on what the code _does_, resolved
  through the AST and ESLint's own scope analysis.
- **What** — every finding carries its fix, in prose for a human and as structured
  JSON for an agent. Security rules add a CWE mapping and, where assigned, a CVSS score.

That trade costs recall, and we measure it:
[methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
· [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md)
· [a false positive is a bug](https://github.com/ofri-peretz/eslint/issues).

## Getting Started

```bash
npm install oxlint-plugin-node-security --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-node-security'],
    rules: {
      'node-security/detect-child-process': 'error',
      'node-security/detect-eval-with-expression': 'error',
      'node-security/no-arbitrary-file-access': 'error',
      'node-security/no-cryptojs': 'error',
      'node-security/no-data-in-temp-storage': 'error',
      'node-security/no-deprecated-buffer': 'error',
      'node-security/no-dynamic-algorithm-selection': 'error',
      'node-security/no-dynamic-command-string': 'error',
      'node-security/no-ecb-mode': 'error',
      'node-security/no-env-injection': 'error',
      'node-security/no-insecure-http-parser': 'error',
      'node-security/no-math-random-crypto': 'error',
      'node-security/no-self-signed-certs': 'error',
      'node-security/no-shell-injection': 'error',
      'node-security/no-static-iv': 'error',
      'node-security/no-toctou-vulnerability': 'error',
      'node-security/no-unbounded-decompression': 'error',
      'node-security/no-unsafe-dynamic-require': 'error',
      'node-security/no-weak-cipher-algorithm': 'error',
      'node-security/no-weak-dh-parameters': 'error',
      'node-security/no-weak-hash-algorithm': 'error',
      'node-security/no-zip-slip': 'error',
      'node-security/require-aead-tag-verification': 'error',
      'node-security/require-dependency-integrity': 'error',
      'node-security/require-stream-error-handler': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-node-security"],
  "rules": {
    "node-security/detect-child-process": "error",
    "node-security/detect-eval-with-expression": "error",
    "node-security/no-arbitrary-file-access": "error",
    "node-security/no-cryptojs": "error",
    "node-security/no-data-in-temp-storage": "error",
    "node-security/no-deprecated-buffer": "error",
    "node-security/no-dynamic-algorithm-selection": "error",
    "node-security/no-dynamic-command-string": "error",
    "node-security/no-ecb-mode": "error",
    "node-security/no-env-injection": "error",
    "node-security/no-insecure-http-parser": "error",
    "node-security/no-math-random-crypto": "error",
    "node-security/no-self-signed-certs": "error",
    "node-security/no-shell-injection": "error",
    "node-security/no-static-iv": "error",
    "node-security/no-toctou-vulnerability": "error",
    "node-security/no-unbounded-decompression": "error",
    "node-security/no-unsafe-dynamic-require": "error",
    "node-security/no-weak-cipher-algorithm": "error",
    "node-security/no-weak-dh-parameters": "error",
    "node-security/no-weak-hash-algorithm": "error",
    "node-security/no-zip-slip": "error",
    "node-security/require-aead-tag-verification": "error",
    "node-security/require-dependency-integrity": "error",
    "node-security/require-stream-error-handler": "error"
  }
}
```

These are the rules the plugin recommends (💼 in the table below).

### ESLint

Install [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) instead. It has the same rules, plus presets for ESLint's flat config.

## 📦 Compatibility

| Package | Version                                                          |
| :------ | :--------------------------------------------------------------- |
| oxlint  | verified on `1.88.0`: CI loads every rule ID through `jsPlugins` |
| Vite+   | `lint.jsPlugins` in `vite.config.ts`                             |
| Node.js | `>=18.0.0`                                                       |

## Rules

**Legend**

| Icon | Description                                                               |
| :--: | :------------------------------------------------------------------------ |
|  💼  | **Recommended**: Included in the recommended preset.                      |
|  ⚠️  | **Warns**: Set to warn in recommended preset.                             |
|  🔧  | **Auto-fixable**: Automatically fixable by the `--fix` CLI option.        |
|  💡  | **Suggestions**: Providing code suggestions in IDE.                       |
|  🚫  | **Deprecated**: This rule is deprecated.                                  |
|  🟢  | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier.                |
|  🟡  | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
|  🟠  | **Type-aware (graceful)**: requires TS program; silent without it.        |

| Rule                                                                                                                                                                                                                          |   CWE    |  OWASP   | CVSS | Description                                                                                                  | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :------: | :--: | :----------------------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [detect-child-process](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/detect-child-process?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                           |  CWE-78  |          |      | Detects instances of childprocess & non-literal exec() calls that may allow command injection                | 🟢  | 💼  |     |     |     |     |
| [detect-eval-with-expression](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/detect-eval-with-expression?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)             |  CWE-95  | A03:2021 |      | Detects eval(variable) which can allow an attacker to run arbitrary code inside your process                 | 🟢  | 💼  |     |     |     |     |
| [detect-non-literal-fs-filename](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/detect-non-literal-fs-filename?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)       |  CWE-22  |          |      | Detects variable in filename argument of fs calls, which might allow an attacker to access anything on your… | 🟢  |     | ⚠️  |     |     |     |
| [detect-suspicious-dependencies](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/detect-suspicious-dependencies?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)       | CWE-506  |          |      | This rule detects package imports that look like typosquatting attempts on popular npm packages              | 🟢  |     | ⚠️  |     |     |     |
| [lock-file](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/lock-file?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                                                 | CWE-829  |          |      | CWE: [CWE-829](https://cwe.mitre.org/data/definitions/829.html)                                              | 🟢  |     |     |     |     |     |
| [no-arbitrary-file-access](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-arbitrary-file-access?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                   |  CWE-22  | A01:2021 |      | Prevents file system access with unsanitized user input to protect against path traversal attacks.           | 🟢  | 💼  |     |     |     |     |
| [no-buffer-overread](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-buffer-overread?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                               | CWE-126  |          |      | Detects buffer access beyond bounds                                                                          | 🟢  |     | ⚠️  |     |     |     |
| [no-cryptojs](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-cryptojs?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                                             | CWE-1104 | A06:2021 |      | Disallow deprecated crypto-js library (use native crypto instead)                                            | 🟢  | 💼  |     |     |     |     |
| [no-cryptojs-weak-random](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-cryptojs-weak-random?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                     | CWE-338  | A02:2021 |      | Disallow crypto-js WordArray.random() (CVE-2020-36732)                                                       | 🟢  |     |     |     |     |     |
| [no-data-in-temp-storage](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-data-in-temp-storage?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                     | CWE-312  |          |      | Temporary directories (/tmp, /var/tmp, temp/) are often world-readable or persist longer than expected       | 🟢  | 💼  |     |     |     |     |
| [no-deprecated-buffer](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-deprecated-buffer?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                           | CWE-676  |          |      | Disallow the deprecated `new Buffer()` constructor and `Buffer()` factory call.                              | 🟢  | 💼  |     |     | 💡  |     |
| [no-deprecated-cipher-method](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-deprecated-cipher-method?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)             | CWE-327  | A02:2021 |      | Disallow deprecated crypto.createCipher/createDecipher methods                                               | 🟢  |     |     |     |     |     |
| [no-dynamic-algorithm-selection](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-dynamic-algorithm-selection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)       | CWE-327  | A02:2021 |      | Disallow dynamic algorithm names in Node.js crypto functions (CWE-327)                                       | 🟢  | 💼  |     |     |     |     |
| [no-dynamic-command-string](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-dynamic-command-string?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                 |  CWE-77  | A03:2021 |      | Detects dynamically assembled command strings handed to a shell flag (bash -c) or to a command-runner that…  | 🟢  | 💼  |     |     |     |     |
| [no-dynamic-dependency-loading](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-dynamic-dependency-loading?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)         | CWE-1104 |          |      | This rule detects dynamically constructed paths in require() and import() statements                         | 🟢  |     |     |     |     |     |
| [no-dynamic-require](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-dynamic-require?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                               |          |          |      | Forbid require() calls with non-literal arguments                                                            | 🟢  |     |     |     |     |     |
| [no-ecb-mode](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-ecb-mode?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                                             | CWE-327  | A02:2021 |      | Disallow ECB encryption mode (use GCM or CBC instead)                                                        | 🟢  | 💼  |     |     |     |     |
| [no-env-injection](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-env-injection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                                   |  CWE-99  | A03:2021 |      | Detects writes to process.env under a key the caller controls, which can overwrite PATH, NODE_OPTIONS or LD… | 🟢  | 💼  |     |     |     |     |
| [no-insecure-http-parser](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-insecure-http-parser?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                     | CWE-444  | A03:2021 |      | Disallow insecureHTTPParser true on Node HTTP servers and clients                                            | 🟢  | 💼  |     |     |     |     |
| [no-insecure-key-derivation](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-insecure-key-derivation?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)               | CWE-916  | A02:2021 |      | Disallow PBKDF2 with insufficient iterations (< 100,000)                                                     | 🟢  |     |     |     |     |     |
| [no-insecure-rsa-padding](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-insecure-rsa-padding?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                     | CWE-327  | A02:2021 |      | Disallow RSA PKCS#1 v1.5 padding (CVE-2023-46809 Marvin Attack)                                              | 🟢  |     |     |     |     |     |
| [no-math-random-crypto](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-math-random-crypto?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                         | CWE-338  | A02:2021 |      | Disallow Math.random() for cryptographic purposes (tokens, keys, secrets, salts, IVs)                        | 🟢  | 💼  |     |     |     |     |
| [no-self-signed-certs](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-self-signed-certs?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                           | CWE-295  | A07:2021 |      | Disallow rejectUnauthorized false in TLS options                                                             | 🟢  | 💼  |     |     |     |     |
| [no-sha1-hash](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-sha1-hash?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                                           | CWE-327  | A02:2021 |      | Disallow sha1() from crypto-hash package (use sha256 or sha512)                                              | 🟢  |     |     |     |     |     |
| [no-shell-injection](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-shell-injection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                               |  CWE-78  | A03:2021 |      | Disallow string concatenation or template expressions in shell command arguments (CWE-78)                    | 🟢  | 💼  |     |     |     |     |
| [no-ssrf](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-ssrf?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                                                     | CWE-918  | A10:2021 |      | Detect HTTP requests with user-controlled URLs (server-side request forgery).                                | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-static-iv](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-static-iv?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                                           | CWE-329  | A02:2021 |      | Disallow static or hardcoded initialization vectors (IVs)                                                    | 🟢  | 💼  |     |     |     |     |
| [no-timing-unsafe-compare](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-timing-unsafe-compare?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                   | CWE-208  | A02:2021 |      | Disallow timing-unsafe comparison of secrets                                                                 | 🟢  |     | ⚠️  |     |     |     |
| [no-toctou-vulnerability](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-toctou-vulnerability?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                     | CWE-367  | A01:2021 |      | Detects Time-of-Check-Time-of-Use (TOCTOU) race condition vulnerabilities in file system operations.         | 🟢  | 💼  |     |     |     |     |
| [no-unbounded-decompression](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-unbounded-decompression?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)               | CWE-409  | A05:2021 |      | Require a maxOutputLength ceiling on zlib one-shot decompression                                             | 🟢  | 💼  |     |     |     |     |
| [no-unsafe-buffer-alloc](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-unsafe-buffer-alloc?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                       | CWE-908  | A01:2021 |      | Disallow `Buffer.allocUnsafe()` and `Buffer.allocUnsafeSlow()`, which return uninitialized memory.           | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-unsafe-dynamic-require](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-unsafe-dynamic-require?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                 | CWE-494  |          |      | Disallows dynamic require() calls with non-literal arguments that could lead to security vulnerabilities     | 🟢  | 💼  |     |     |     |     |
| [no-weak-cipher-algorithm](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-weak-cipher-algorithm?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                   | CWE-327  | A02:2021 |      | Disallow weak cipher algorithms (DES, 3DES, RC4, Blowfish, RC2, IDEA)                                        | 🟢  | 💼  |     |     |     |     |
| [no-weak-dh-parameters](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-weak-dh-parameters?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                         | CWE-326  | A04:2025 |      | Disallow Diffie-Hellman and ECDH parameters below a safe strength                                            | 🟢  | 💼  |     |     |     |     |
| [no-weak-hash-algorithm](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-weak-hash-algorithm?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                       | CWE-327  | A02:2021 |      | Disallow weak hash algorithms (MD5, MD4, SHA-1, RIPEMD)                                                      | 🟢  | 💼  |     |     |     |     |
| [no-zip-slip](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-zip-slip?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                                             |  CWE-22  |          |      | Detects zip slip/archive extraction vulnerabilities                                                          | 🟢  | 💼  |     |     |     |     |
| [prefer-native-crypto](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/prefer-native-crypto?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                           | CWE-1104 | A06:2021 |      | Prefer native crypto over third-party libraries                                                              | 🟢  |     |     |     |     |     |
| [require-aead-tag-verification](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-aead-tag-verification?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)         | CWE-327  | A02:2021 |      | Require AEAD decryption to verify the authentication tag (setAuthTag + final)                                | 🟢  | 💼  |     |     |     |     |
| [require-dependency-integrity](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-dependency-integrity?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)           | CWE-494  |          |      | CWE: [CWE-494](https://cwe.mitre.org/data/definitions/494.html)                                              | 🟢  | 💼  |     |     |     |     |
| [require-secure-credential-storage](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-secure-credential-storage?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security) | CWE-312  |          |      | This rule detects a credential written to localStorage, sessionStorage, AsyncStorage or process.env without… | 🟢  |     |     |     |     |     |
| [require-secure-deletion](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-secure-deletion?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)                     | CWE-459  |          |      | CWE: [CWE-459](https://cwe.mitre.org/data/definitions/459.html)                                              | 🟢  |     |     |     |     |     |
| [require-storage-encryption](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-storage-encryption?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)               | CWE-312  |          |      | CWE: [CWE-312](https://cwe.mitre.org/data/definitions/312.html)                                              | 🟢  |     |     |     |     |     |
| [require-stream-error-handler](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-stream-error-handler?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security)           | CWE-248  | A04:2021 |      | Require an error listener on streams passed to pipe, which does not forward errors                           | 🟢  | 💼  |     |     |     |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-node-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security"><img src="https://eslint.interlace.tools/images/og-node-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-node-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-node-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
