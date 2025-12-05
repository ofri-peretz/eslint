# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-01

### Added

- Initial release with 48 security-focused ESLint rules
- LLM-optimized error messages with CWE references and OWASP mapping
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
