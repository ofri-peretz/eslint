# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2025-12-31

### ⚠️ BREAKING CHANGES

Removed 12 rules that now have dedicated, specialized plugins with enhanced functionality.

#### Removed Rules (use dedicated plugins instead)

| Removed Rule                             | Replacement Plugin               | Replacement Rule(s)                                 |
| ---------------------------------------- | -------------------------------- | --------------------------------------------------- |
| `no-sql-injection`                       | `eslint-plugin-pg`               | `pg/no-unsafe-query`                                |
| `database-injection`                     | `eslint-plugin-pg`               | `pg/no-unsafe-query`                                |
| `no-insecure-jwt`                        | `eslint-plugin-jwt`              | 13 dedicated JWT rules                              |
| `no-weak-crypto`                         | `eslint-plugin-crypto`           | `crypto/no-weak-hash-algorithm`                     |
| `no-timing-attack`                       | `eslint-plugin-crypto`           | `crypto/no-timing-unsafe-compare`                   |
| `no-insufficient-random`                 | `eslint-plugin-crypto`           | `crypto/no-math-random-crypto`                      |
| `no-document-cookie`                     | `eslint-plugin-browser-security` | `browser-security/no-sensitive-cookie-js`           |
| `no-unsanitized-html`                    | `eslint-plugin-browser-security` | `browser-security/no-innerhtml`                     |
| `no-postmessage-origin-wildcard`         | `eslint-plugin-browser-security` | `browser-security/no-postmessage-wildcard-origin`   |
| `no-insecure-cookie-settings`            | `eslint-plugin-browser-security` | `browser-security/require-cookie-secure-attrs`      |
| `no-insufficient-postmessage-validation` | `eslint-plugin-browser-security` | `browser-security/require-postmessage-origin-check` |
| `no-unencrypted-local-storage`           | `eslint-plugin-browser-security` | `browser-security/no-sensitive-localstorage`        |
| `no-credentials-in-storage-api`          | `eslint-plugin-browser-security` | `browser-security/no-sensitive-localstorage`        |

### Migration Guide

Install the specialized plugins for the functionality you need:

```bash
# For PostgreSQL/SQL security
npm install --save-dev eslint-plugin-pg

# For JWT security
npm install --save-dev eslint-plugin-jwt

# For cryptography security
npm install --save-dev eslint-plugin-crypto

# For browser/client-side security
npm install --save-dev eslint-plugin-browser-security
```

### Why This Change?

Specialized plugins provide:

- **More rules**: 13 JWT rules vs 1, 24 crypto rules vs 3
- **Better detection**: Domain-specific AST patterns
- **Focused maintenance**: Faster updates for each security domain

## [3.0.2] - 2025-12-20

### Performance

- **detect-object-injection**: Replaced `getText()` + regex with AST-based validation (~4x faster)
- **detect-non-literal-fs-filename**: Replaced `getText()` + regex with AST-based validation
- **no-timing-attack**: Set-based O(1) lookups for sensitive variables and auth patterns
- **no-buffer-overread**: Set-based O(1) lookups for buffer methods and user-controlled keywords
- **no-missing-csrf-protection**: Set-based O(1) lookups for protected HTTP methods
- **detect-child-process**: Set-based O(1) lookups for dangerous child_process methods

## [3.0.1] - 2025-12-20

### Fixed444

- **detect-object-injection**: Reduced false positives by detecting validation patterns:
  - `includes()` checks in enclosing if-blocks
  - `hasOwnProperty()` / `Object.hasOwn()` / `in` operator checks
  - Preceding guard clauses with early exit (`if (!valid) throw`)
  - Numeric index access (`items[0]`, `items[1]`) now recognized as safe
- **detect-non-literal-fs-filename**: Allow safe path patterns:
  - `path.join(__dirname, ...literals)` with all literal arguments
  - Paths validated with `startsWith()` checks (both inside if-blocks and after guard clauses)
- **no-timing-attack**: Skip false positives in timing-safe contexts:
  - Length comparisons before `crypto.timingSafeEqual()`
  - Early returns inside functions using `timingSafeEqual`
  - Fixed file-level sensitive variable detection to be function-scoped
- **no-unsanitized-html**: Track sanitized variables:
  - Variables assigned from `DOMPurify.sanitize()` now recognized as safe
- **no-unlimited-resource-allocation**: Allow safe static paths:
  - `fs.readFileSync(path.join(__dirname, ...literals))` patterns now recognized as safe

## [3.0.0] - 2025-12-14

### Added

- **OWASP Mobile Top 10 Coverage**: Added 40 new rules targeting mobile security risks (M1-M10).
- **New Presets**:
  - `owasp-mobile-top-10`: Comprehensive mobile security ruleset.
- **Documentation**:
  - Full "Mobile Security" table in README with CVSS scores and fixable icons.
  - Updated `AGENTS.md` with complete rule catalog for AI assistants.

### Changed

- **Recommended Config**: Now includes critical mobile security rules for hybrid web/mobile apps.
- **Rule Improvements**: Refined AST detection for `no-clickjacking` and `no-unvalidated-deeplinks` to reduce false positives.

## [1.0.0] - 2025-01-01

### Added

- Initial release with 48 security-focused ESLint rules
- LLM-optimized error messages with [CWE](https://cwe.mitre.org/) references and [OWASP](https://owasp.org/Top10/) mapping
- Three preset configurations: `recommended`, `strict`, `owasp-top-10`
- Full ESLint 9 flat config support
- TypeScript support

### Security Rules

#### Injection Prevention (11 rules)

- `no-sql-injection` - SQL injection prevention
- `database-injection` - Comprehensive SQL/NoSQL/ORM injection
- `detect-eval-with-expression` - Dynamic eval() detection
- `detect-child-process` - Command injection detection
- `no-unsafe-dynamic-require` - Dynamic require() prevention
- `no-graphql-injection` - GraphQL injection prevention
- `no-xxe-injection` - XXE injection prevention
- `no-xpath-injection` - XPath injection prevention
- `no-ldap-injection` - LDAP injection prevention
- `no-directive-injection` - Template injection prevention
- `no-format-string-injection` - Format string injection prevention

#### Path & File Security (3 rules)

- `detect-non-literal-fs-filename` - Path traversal detection
- `no-zip-slip` - Zip slip vulnerability prevention
- `no-toctou-vulnerability` - TOCTOU race condition detection

#### Regex Security (3 rules)

- `detect-non-literal-regexp` - ReDoS detection in RegExp
- `no-redos-vulnerable-regex` - ReDoS pattern detection
- `no-unsafe-regex-construction` - Unsafe regex prevention

#### Object & Prototype (2 rules)

- `detect-object-injection` - Prototype pollution detection
- `no-unsafe-deserialization` - Unsafe deserialization prevention

#### Cryptography (6 rules)

- `no-hardcoded-credentials` - Hardcoded secrets detection
- `no-weak-crypto` - Weak algorithm detection
- `no-insufficient-random` - Weak randomness detection
- `no-timing-attack` - Timing attack prevention
- `no-insecure-comparison` - Insecure comparison detection
- `no-insecure-jwt` - JWT security issues detection

#### Input Validation & XSS (5 rules)

- `no-unvalidated-user-input` - Input validation enforcement
- `no-unsanitized-html` - XSS via innerHTML prevention
- `no-unescaped-url-parameter` - URL parameter XSS prevention
- `no-improper-sanitization` - Output encoding enforcement
- `no-improper-type-validation` - Type confusion prevention

#### Authentication & Authorization (3 rules)

- `no-missing-authentication` - Auth check enforcement
- `no-privilege-escalation` - Privilege escalation detection
- `no-weak-password-recovery` - Secure password reset enforcement

#### Session & Cookies (3 rules)

- `no-insecure-cookie-settings` - Cookie security enforcement
- `no-missing-csrf-protection` - CSRF protection enforcement
- `no-document-cookie` - Direct cookie access detection

#### Network & Headers (5 rules)

- `no-missing-cors-check` - CORS validation enforcement
- `no-missing-security-headers` - Security header enforcement
- `no-insecure-redirects` - Open redirect prevention
- `no-unencrypted-transmission` - HTTPS enforcement
- `no-clickjacking` - Clickjacking prevention

#### Data Exposure (2 rules)

- `no-exposed-sensitive-data` - Data exposure prevention
- `no-sensitive-data-exposure` - Log sanitization enforcement

#### Buffer & Memory (1 rule)

- `no-buffer-overread` - Buffer safety enforcement

#### DoS & Resource (2 rules)

- `no-unlimited-resource-allocation` - Resource limit enforcement
- `no-unchecked-loop-condition` - Infinite loop prevention

#### Platform-Specific (2 rules)

- `no-electron-security-issues` - Electron security enforcement
- `no-insufficient-postmessage-validation` - postMessage validation
