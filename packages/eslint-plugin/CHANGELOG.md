## [1.9.1] - 2025-11-30

### 🚀 Features

- **7 New Import Validation Rules** - Added missing import validation rules inspired by `eslint-plugin-import`
- **LLM-Optimized** - All new rules include structured error messages with auto-fix instructions where possible

### 📦 Import Rules Added

- **`no-duplicates`** - Reports and merges duplicate imports (auto-fixable)
- **`named`** - Ensures named imports correspond to a named export (supports TypeScript)
- **`default`** - Ensures a default export is present given a default import
- **`namespace`** - Ensures imported namespaces contain dereferenced properties
- **`extensions`** - Enforces consistent use of file extensions (auto-fixable)
- **`first`** - Ensures all imports appear before other statements
- **`newline-after-import`** - Enforces a newline after import statements (auto-fixable)

### ❤️ Thank You

- Ofri Peretz

---

## [1.9.0] - 2025-11-30

### 🚀 Features

- **62+ LLM-Optimized Rules** - Complete rule coverage across security, architecture, development, React, and more
- **All Non-Fixable Common Rules** - Added comprehensive set of non-fixable rules for complete coverage

### 🩹 Fixes

- Fixed TypeScript type issues across multiple React rules
- Fixed implicit `any` type errors in rule implementations
- Fixed unused variable warnings
- Improved type narrowing in AST traversal functions

### 🔒 Security Rules Added

- **`no-hardcoded-credentials`** - Detects hardcoded passwords, API keys, tokens (CWE-798)
- **`no-weak-crypto`** - Detects weak cryptography (MD5, SHA1, DES) (CWE-327)
- **`no-insufficient-random`** - Detects weak random number generation (CWE-338)
- **`no-unvalidated-user-input`** - Detects unvalidated user input (CWE-20)
- **`no-unsanitized-html`** - Detects XSS vulnerabilities (CWE-79)
- **`no-unescaped-url-parameter`** - Detects unescaped URL parameters (CWE-79)
- **`no-missing-cors-check`** - Detects missing CORS validation (CWE-346)
- **`no-insecure-comparison`** - Detects insecure comparison operators (CWE-697)
- **`no-missing-authentication`** - Detects missing auth checks (CWE-287)
- **`no-privilege-escalation`** - Detects privilege escalation vulnerabilities (CWE-269)

### 🏗️ Architecture Rules Added

- **`prefer-dependency-version-strategy`** - Enforce consistent version strategy for package.json

### 🧱 Updated Dependencies

- Updated eslint-plugin-utils to 1.6.0

### ❤️ Thank You

- Ofri Peretz

---

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
