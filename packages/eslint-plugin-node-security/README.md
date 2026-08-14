<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security" target="blank"><img src="https://eslint.interlace.tools/logos/interlace.svg" alt="Interlace" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://nodejs.org" target="_blank"><img src="https://eslint.interlace.tools/logos/node.svg" alt="Node.js" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><img src="https://eslint.interlace.tools/logos/oxlint.svg" alt="oxlint" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><img src="https://eslint.interlace.tools/logos/eslint.svg" alt="ESLint" height="90" /></a>
</p>

<p align="center">
  Security-focused ESLint plugin for Node.js built-in modules (fs, child_process, vm, crypto, Buffer).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-node-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-node-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-node-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-node-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-node-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-node-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Security rules for Node.js core modules (fs, child_process, crypto, etc).

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

<!-- AUTO-GENERATED:DOCTRINE:START - Do not edit manually -->

## Why these rules are quiet

**Noise creates apathy, and apathy is not a security posture.** A linter that reports
a thousand things a week gets switched off in a month, and the real finding goes with
it. So every rule here is built to be worth reading: we would rather miss a finding
than spend your attention on one that was never real.

That is a trade, and it is made deliberately. It costs recall, and we measure what it
costs rather than assuming it is free.

## How the rules decide

**Evidence, not names.** A rule fires on what the code *does*, resolved through the
AST and ESLint's own scope analysis — not on an identifier that happens to contain
`query`, a method called `setItem`, or a file whose path contains `key`. Every one of
those was a real false positive in this ecosystem, found by reading our own output on
open-source projects and fixed with a test that fails on the unfixed rule.

Where a rule has known false-positive shapes, its page carries a **Not a finding**
section: what it deliberately stays quiet on, and what to check first when it fires
and you disagree.

## What you get

The rules below, with a CWE mapping, a CVSS score and a fix on every message — in
prose for a human and as structured JSON for an agent. Install it, enable
`recommended`, and read the findings. If one of them is wrong,
[open an issue](https://github.com/ofri-peretz/eslint/issues) — a false positive is a
bug here, not a tuning exercise for you.

How that is measured, on which projects, and where it falls short:
[benchmark methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
and [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md).

<!-- AUTO-GENERATED:DOCTRINE:END -->

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-node-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-node-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-node-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-node-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-node-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-node-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security). 📚

```bash
npm install eslint-plugin-node-security --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                                           |
| :------------ | :---------------------------------------------------- |
| `recommended` | Balanced security for most Node.js projects           |
| `strict`      | Maximum security enforcement (all rules as errors)    |
| `fs-security` | Focus on file system vulnerabilities (CWE-22, CWE-73) |
| `crypto`      | Cryptographic security rules only                     |

## 💡 What You Get
- **31 security rules** covering Node.js core module vulnerabilities
- **Command Injection Detection** for `child_process.exec`, `spawn`, and `execFile`
- **Path Traversal Prevention** for `fs` module operations
- **TOCTOU Race Condition Detection** for file system operations
- **Cryptographic Security** for weak algorithms and key management
- **LLM-optimized messages** with CWE references and fix guidance

## 📦 Compatibility
| Package | Version |
| :--- | :--- |
| ESLint | `^8.40.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set to warn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |
| 🟢 | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier. |
| 🟡 | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
| 🟠 | **Type-aware (graceful)**: requires TS program; silent without it. |

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [detect-child-process](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/detect-child-process?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-78 |  |  | Detects instances of childprocess & non-literal exec() calls that may allow command injection | 🟢 | 💼 |  |  |  |  |
| [detect-eval-with-expression](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/detect-eval-with-expression?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-95 | A03:2021 |  | Detects eval(variable) which can allow an attacker to run arbitrary code inside your process | 🟢 | 💼 |  |  |  |  |
| [detect-non-literal-fs-filename](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/detect-non-literal-fs-filename?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-22 |  |  | Detects variable in filename argument of fs calls, which might allow an attacker to access anything on your… | 🟢 |  | ⚠️ |  |  |  |
| [detect-suspicious-dependencies](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/detect-suspicious-dependencies?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-506 |  |  | This rule detects package imports that look like typosquatting attempts on popular npm packages | 🟢 |  | ⚠️ |  |  |  |
| [lock-file](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/lock-file?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-829 |  |  | CWE: [CWE-829](https://cwe.mitre.org/data/definitions/829.html) | 🟢 |  |  |  |  |  |
| [no-arbitrary-file-access](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-arbitrary-file-access?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-22 | A01:2021 |  | Prevents file system access with unsanitized user input to protect against path traversal attacks. | 🟢 | 💼 |  |  |  |  |
| [no-buffer-overread](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-buffer-overread?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-126 |  |  | Detects buffer access beyond bounds | 🟢 |  | ⚠️ |  |  |  |
| [no-cryptojs](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-cryptojs?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-1104 | A06:2021 |  | Disallow deprecated crypto-js library (use native crypto instead) | 🟢 | 💼 |  |  |  |  |
| [no-cryptojs-weak-random](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-cryptojs-weak-random?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-338 | A02:2021 |  | Disallow crypto-js WordArray.random() (CVE-2020-36732) | 🟢 |  |  |  |  |  |
| [no-data-in-temp-storage](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-data-in-temp-storage?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-312 |  |  | Temporary directories (/tmp, /var/tmp, temp/) are often world-readable or persist longer than expected | 🟢 | 💼 |  |  |  |  |
| [no-deprecated-buffer](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-deprecated-buffer?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-676 |  |  | Disallow the deprecated `new Buffer()` constructor and `Buffer()` factory call. | 🟢 | 💼 |  |  | 💡 |  |
| [no-deprecated-cipher-method](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-deprecated-cipher-method?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-327 | A02:2021 |  | Disallow deprecated crypto.createCipher/createDecipher methods | 🟢 |  |  |  |  |  |
| [no-dynamic-algorithm-selection](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-dynamic-algorithm-selection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-327 | A02:2021 |  | Disallow dynamic algorithm names in Node.js crypto functions (CWE-327) | 🟢 | 💼 |  |  |  |  |
| [no-dynamic-command-string](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-dynamic-command-string?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-77 | A03:2021 |  | Detects dynamically assembled command strings handed to a shell flag (bash -c) or to a command-runner that… | 🟢 | 💼 |  |  |  |  |
| [no-dynamic-dependency-loading](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-dynamic-dependency-loading?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-1104 |  |  | This rule detects dynamically constructed paths in require() and import() statements | 🟢 |  |  |  |  |  |
| [no-dynamic-require](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-dynamic-require?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) |  |  |  | Forbid require() calls with non-literal arguments | 🟢 |  |  |  |  |  |
| [no-ecb-mode](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-ecb-mode?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-327 | A02:2021 |  | Disallow ECB encryption mode (use GCM or CBC instead) | 🟢 | 💼 |  |  |  |  |
| [no-env-injection](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-env-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-99 | A03:2021 |  | Detects writes to process.env under a key the caller controls, which can overwrite PATH, NODE_OPTIONS or LD… | 🟢 | 💼 |  |  |  |  |
| [no-insecure-http-parser](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-insecure-http-parser?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-444 | A03:2021 |  | Disallow insecureHTTPParser true on Node HTTP servers and clients | 🟢 | 💼 |  |  |  |  |
| [no-insecure-key-derivation](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-insecure-key-derivation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-916 | A02:2021 |  | Disallow PBKDF2 with insufficient iterations (< 100,000) | 🟢 |  |  |  |  |  |
| [no-insecure-rsa-padding](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-insecure-rsa-padding?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-327 | A02:2021 |  | Disallow RSA PKCS#1 v1.5 padding (CVE-2023-46809 Marvin Attack) | 🟢 |  |  |  |  |  |
| [no-math-random-crypto](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-math-random-crypto?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-338 | A02:2021 |  | Disallow Math.random() for cryptographic purposes (tokens, keys, secrets, salts, IVs) | 🟢 | 💼 |  |  |  |  |
| [no-self-signed-certs](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-self-signed-certs?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-295 | A07:2021 |  | Disallow rejectUnauthorized false in TLS options | 🟢 | 💼 |  |  |  |  |
| [no-sha1-hash](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-sha1-hash?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-327 | A02:2021 |  | Disallow sha1() from crypto-hash package (use sha256 or sha512) | 🟢 |  |  |  |  |  |
| [no-shell-injection](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-shell-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-78 | A03:2021 |  | Disallow string concatenation or template expressions in shell command arguments (CWE-78) | 🟢 | 💼 |  |  |  |  |
| [no-ssrf](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-ssrf?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-918 | A10:2021 |  | Detect HTTP requests with user-controlled URLs (server-side request forgery). | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-static-iv](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-static-iv?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-329 | A02:2021 |  | Disallow static or hardcoded initialization vectors (IVs) | 🟢 | 💼 |  |  |  |  |
| [no-timing-unsafe-compare](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-timing-unsafe-compare?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-208 | A02:2021 |  | Disallow timing-unsafe comparison of secrets | 🟢 |  | ⚠️ |  |  |  |
| [no-toctou-vulnerability](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-toctou-vulnerability?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-367 | A01:2021 |  | Detects Time-of-Check-Time-of-Use (TOCTOU) race condition vulnerabilities in file system operations. | 🟢 | 💼 |  |  |  |  |
| [no-unbounded-decompression](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-unbounded-decompression?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-409 | A05:2021 |  | Require a maxOutputLength ceiling on zlib one-shot decompression | 🟢 | 💼 |  |  |  |  |
| [no-unsafe-buffer-alloc](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-unsafe-buffer-alloc?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-908 | A01:2021 |  | Disallow `Buffer.allocUnsafe()` and `Buffer.allocUnsafeSlow()`, which return uninitialized memory. | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-unsafe-dynamic-require](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-unsafe-dynamic-require?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-494 |  |  | Disallows dynamic require() calls with non-literal arguments that could lead to security vulnerabilities | 🟢 | 💼 |  |  |  |  |
| [no-weak-cipher-algorithm](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-weak-cipher-algorithm?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-327 | A02:2021 |  | Disallow weak cipher algorithms (DES, 3DES, RC4, Blowfish, RC2, IDEA) | 🟢 | 💼 |  |  |  |  |
| [no-weak-hash-algorithm](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-weak-hash-algorithm?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-327 | A02:2021 |  | Disallow weak hash algorithms (MD5, MD4, SHA-1, RIPEMD) | 🟢 | 💼 |  |  |  |  |
| [no-zip-slip](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/no-zip-slip?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-22 |  |  | Detects zip slip/archive extraction vulnerabilities | 🟢 | 💼 |  |  |  |  |
| [prefer-native-crypto](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/prefer-native-crypto?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-1104 | A06:2021 |  | Prefer native crypto over third-party libraries | 🟢 |  |  |  |  |  |
| [require-aead-tag-verification](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-aead-tag-verification?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-327 | A02:2021 |  | Require AEAD decryption to verify the authentication tag (setAuthTag + final) | 🟢 | 💼 |  |  |  |  |
| [require-dependency-integrity](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-dependency-integrity?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-494 |  |  | CWE: [CWE-494](https://cwe.mitre.org/data/definitions/494.html) | 🟢 | 💼 |  |  |  |  |
| [require-secure-credential-storage](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-secure-credential-storage?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-312 |  |  | This rule detects when credentials are stored using localStorage.setItem() or fs.writeFile() without encryp… | 🟢 |  |  |  |  |  |
| [require-secure-deletion](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-secure-deletion?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-459 |  |  | CWE: [CWE-459](https://cwe.mitre.org/data/definitions/459.html) | 🟢 |  |  |  |  |  |
| [require-storage-encryption](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-storage-encryption?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-312 |  |  | CWE: [CWE-312](https://cwe.mitre.org/data/definitions/312.html) | 🟢 |  |  |  |  |  |
| [require-stream-error-handler](https://eslint.interlace.tools/docs/security/plugin-node-security/rules/require-stream-error-handler?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security) | CWE-248 | A04:2021 |  | Require an error listener on streams passed to pipe, which does not forward errors | 🟢 | 💼 |  |  |  |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-node-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-node-security) | Node.js core-module security (fs, child_process, vm, crypto, Buffer). |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB security best practices. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |

<!-- INTERLACE:STAR_CTA:START -->
## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-node-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security"><img src="https://eslint.interlace.tools/images/og-node-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-node-security" target="blank"><img src="https://eslint.interlace.tools/icon-light.svg" alt="Interlace" height="70" /></a>
</p>
