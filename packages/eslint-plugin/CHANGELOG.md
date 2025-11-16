## [Unreleased]

### Added

- **New Rule: `no-hardcoded-credentials`** - Detects hardcoded passwords, API keys, tokens, and other sensitive credentials (CWE-798). Provides autofix suggestions for using environment variables or secret managers.

- **New Rule: `no-weak-crypto`** - Detects use of weak cryptography algorithms (MD5, SHA1, DES, 3DES, RC4) and suggests secure alternatives (SHA-256, AES-256-GCM, bcrypt, scrypt). CWE-327 compliance.

- **New Rule: `no-insufficient-random`** - Detects weak random number generation (Math.random() and custom weak PRNGs) and suggests using crypto.getRandomValues() for cryptographically secure randomness. CWE-338 compliance.

- **New Rule: `no-unvalidated-user-input`** - Detects unvalidated user input usage (req.body, req.query, req.params, etc.) and suggests using validation libraries (Zod, Joi, Yup, class-validator). CWE-20 compliance.

- **New Rule: `no-unsanitized-html`** - Detects unsanitized HTML injection vulnerabilities (innerHTML assignments, dangerouslySetInnerHTML) and suggests using sanitization libraries (DOMPurify, sanitize-html). CWE-79 (XSS) compliance.

- **New Rule: `no-unescaped-url-parameter`** - Detects unescaped URL parameters in template literals and string concatenations that could lead to XSS attacks. Suggests using encodeURIComponent() or URLSearchParams. CWE-79 compliance.

- **New Rule: `no-missing-cors-check`** - Detects missing CORS origin validation (wildcard origins) and suggests proper origin validation functions. CWE-346 compliance.

- **New Rule: `prefer-dependency-version-strategy`** - Enforce consistent version strategy (caret, tilde, exact, etc.) for package.json dependencies. Complements `@nx/dependency-checks` by ensuring version specifier format consistency. Supports workspace, file, and link protocols for monorepo compatibility. Auto-fixable with configurable strategies.

## 0.3.3 (2025-11-07)

### 🩹 Fixes

- configs ([55925e4](https://github.com/ofri-peretz/forge-js/commit/55925e4))
- test config ([37e7ba5](https://github.com/ofri-peretz/forge-js/commit/37e7ba5))
- drop codecov vite plugin ([4b1ae7e](https://github.com/ofri-peretz/forge-js/commit/4b1ae7e))

### 🧱 Updated Dependencies

- Updated eslint-plugin-utils to 0.2.1

### ❤️ Thank You

- Ofri Peretz

## 0.3.2 (2025-11-02)

### 🩹 Fixes

- resolve 3 LLM optimization issues for 100% clarity ([#1](https://github.com/ofri-peretz/forge-js/issues/1), [#2](https://github.com/ofri-peretz/forge-js/issues/2), [#3](https://github.com/ofri-peretz/forge-js/issues/3))

### ❤️ Thank You

- Ofri Peretz

## 0.3.1 (2025-11-02)

### 🩹 Fixes

- align package versions with git tags (eslint-plugin@0.2.1, utils@0.2.0) ([3fe5e0d](https://github.com/ofri-peretz/forge-js/commit/3fe5e0d))

### ❤️ Thank You

- Ofri Peretz

## 0.3.0 (2025-11-02)

### 🚀 Features

- enhance LLM optimization for rules 15 and 18 ([babd185](https://github.com/ofri-peretz/forge-js/commit/babd185))

### ❤️ Thank You

- Ofri Peretz

## 0.2.1 (2025-11-02)

### 🩹 Fixes

- optimize ESLint rule messages for LLM parsing ([10927e9](https://github.com/ofri-peretz/forge-js/commit/10927e9))

### ❤️ Thank You

- Ofri Peretz

## 0.2.0 (2025-11-02)

### 🩹 Fixes

- improve llm optimization for 8 rules ([7219655](https://github.com/ofri-peretz/forge-js/commit/7219655))
- remove unnecessary escape character in database-injection rule ([333d470](https://github.com/ofri-peretz/forge-js/commit/333d470))

### 🧱 Updated Dependencies

- Updated eslint-plugin-utils to 0.2.0

### ❤️ Thank You

- Ofri Peretz

## 0.1.1 (2025-11-02)

### 🧱 Updated Dependencies

- Updated eslint-plugin-utils to 0.1.1

## 0.1.0 (2025-11-02)

This was a version bump only for eslint-plugin to align it with other projects, there were no code changes.
