## 1.2.2 (2026-02-06)

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [1.2.1] - 2026-02-02

This was a version bump only for eslint-plugin-browser-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-browser-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)

## [1.0.0] - 2025-12-29

### Added

#### XSS Prevention Rules (2)

- `no-innerhtml` - Detect dangerous innerHTML/outerHTML assignments (CWE-79)
- `no-eval` - Detect eval(), new Function(), and string-based callbacks (CWE-95)

#### postMessage Security Rules (3)

- `require-postmessage-origin-check` - Require origin validation in message handlers (CWE-346)
- `no-postmessage-wildcard-origin` - Prevent wildcard targetOrigin in postMessage (CWE-346)
- `no-postmessage-innerhtml` - Prevent XSS via innerHTML in postMessage handlers (CWE-79)

#### Storage Security Rules (4)

- `no-sensitive-localstorage` - Prevent storing sensitive data in localStorage (CWE-922)
- `no-sensitive-sessionstorage` - Prevent storing sensitive data in sessionStorage (CWE-922)
- `no-sensitive-indexeddb` - Prevent storing sensitive data in IndexedDB (CWE-922)
- `no-jwt-in-storage` - Prevent storing JWT tokens in browser storage (CWE-922)

#### Cookie Security Rules (3)

- `no-sensitive-cookie-js` - Prevent storing sensitive data in cookies via JavaScript (CWE-1004)
- `no-cookie-auth-tokens` - Prevent auth tokens in JS-accessible cookies (CWE-1004)
- `require-cookie-secure-attrs` - Require Secure and SameSite cookie attributes (CWE-614)

#### WebSocket Security Rules (3)

- `require-websocket-wss` - Require secure WebSocket connections (wss://) (CWE-319)
- `no-websocket-innerhtml` - Prevent XSS via innerHTML in WebSocket handlers (CWE-79)
- `no-websocket-eval` - Prevent RCE via eval() in WebSocket handlers (CWE-95)

#### File API & Workers Security Rules (4)

- `no-filereader-innerhtml` - Prevent XSS via innerHTML with FileReader data (CWE-79)
- `require-blob-url-revocation` - Require revoking Blob URLs to prevent memory leaks (CWE-401)
- `no-dynamic-service-worker-url` - Prevent dynamic URLs in service worker registration (CWE-829)
- `no-worker-message-innerhtml` - Prevent XSS via innerHTML in Worker message handlers (CWE-79)

#### CSP Security Rules (2)

- `no-unsafe-inline-csp` - Disallow 'unsafe-inline' in CSP (CWE-79)
- `no-unsafe-eval-csp` - Disallow 'unsafe-eval' in CSP (CWE-95)

#### Presets (7)

- `recommended` - Balanced security defaults
- `strict` - All 21 rules as errors
- `xss` - XSS-focused rules only
- `storage` - Storage security rules only
- `postmessage` - postMessage security rules only
- `websocket` - WebSocket security rules only
- `cookies` - Cookie security rules only

#### Features

- LLM-optimized error messages with CWE references
- OWASP Top 10 2021 alignment
- TypeScript support with exported option types
- Comprehensive test coverage (297 tests, 97.73% line coverage)
- Auto-fix suggestions where safe

### Security

- Covers 8 CWEs: 79, 95, 319, 346, 401, 614, 829, 922, 1004
- Maps to OWASP Top 10 2021: A01, A02, A03
