# Changelog

## [2.6.1] - 2025-11-30

### 📚 Documentation

- **Complete Rules Reference**: Added full 137 rules reference with direct links to documentation
- **"How We Differ" Section**: Added concrete before/after examples showing LLM-optimized vs traditional error messages
- **GitHub Documentation Links**: All rule links now point directly to the main eslint-plugin documentation

### ❤️ Thank You

- Ofri Peretz

---

## [2.6.0] - 2025-11-30

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

- Updated @forge-js/eslint-plugin-utils to 1.6.0

### ❤️ Thank You

- Ofri Peretz

---
