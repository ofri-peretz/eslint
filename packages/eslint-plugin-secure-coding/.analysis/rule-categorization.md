# Rule Categorization Analysis

## Criteria for `eslint-plugin-secure-coding`:

1. ✅ **Universal JS/TS** - Works for any JavaScript/TypeScript code
2. ✅ **Protocol-related** - HTTP, WebSocket, cryptographic protocols, etc.
3. ✅ **No SDK/tool/vendor specific** - Framework-agnostic
4. ❌ **LLM/Agentic rules** → Should move to `eslint-plugin-agentic-security`

---

## ✅ KEEP - Core Security Rules (Universal JS/TS)

### Injection Vulnerabilities

- ✅ `no-sql-injection` - Universal SQL injection patterns
- ✅ `database-injection` - Generic database injection
- ✅ `detect-eval-with-expression` - eval() is universally dangerous
- ✅ `detect-child-process` - exec/spawn are Node.js core APIs
- ✅ `no-unsafe-dynamic-require` - require() is core Node.js
- ✅ `no-graphql-injection` - GraphQL is a protocol/spec
- ✅ `no-xxe-injection` - XML protocol vulnerability
- ✅ `no-xpath-injection` - XPath is a standard query language
- ✅ `no-ldap-injection` - LDAP is a protocol
- ✅ `no-directive-injection` - Template injection (universal)
- ✅ `no-format-string-injection` - Format string vulnerabilities

### Path & File Operations

- ✅ `detect-non-literal-fs-filename` - Node.js fs module (core)
- ✅ `no-zip-slip` - Archive protocol vulnerability
- ✅ `no-toctou-vulnerability` - Universal race condition pattern

### Regex Vulnerabilities

- ✅ `detect-non-literal-regexp` - Universal JS pattern
- ✅ `no-redos-vulnerable-regex` - Universal ReDoS detection
- ✅ `no-unsafe-regex-construction` - Universal regex safety

### Object & Prototype

- ✅ `detect-object-injection` - Universal JS prototype pollution
- ✅ `no-unsafe-deserialization` - JSON.parse, eval patterns

### Credentials & Cryptography

- ✅ `no-hardcoded-credentials` - Universal pattern
- ✅ `no-weak-crypto` - Cryptographic protocol weakness
- ✅ `no-insufficient-random` - Math.random() vs crypto
- ✅ `no-timing-attack` - Universal timing attack patterns
- ✅ `no-insecure-comparison` - String comparison issues
- ✅ `no-insecure-jwt` - JWT protocol vulnerabilities

### Input Validation & XSS

- ✅ `no-unvalidated-user-input` - Universal pattern
- ✅ `no-unsanitized-html` - DOM manipulation (browser standard)
- ✅ `no-unescaped-url-parameter` - URL protocol
- ✅ `no-improper-sanitization` - Universal validation
- ✅ `no-improper-type-validation` - Universal type checking

### Authentication & Authorization

- ✅ `no-missing-authentication` - Universal auth patterns
- ✅ `no-privilege-escalation` - Universal privilege checking
- ✅ `no-weak-password-recovery` - Universal password patterns

### Session & Cookies

- ✅ `no-insecure-cookie-settings` - HTTP Cookie protocol
- ✅ `no-missing-csrf-protection` - HTTP protocol attack
- ✅ `no-document-cookie` - Browser DOM API

### Network & Headers

- ✅ `no-missing-cors-check` - HTTP CORS protocol
- ✅ `no-missing-security-headers` - HTTP headers protocol
- ✅ `no-insecure-redirects` - Universal redirect patterns
- ✅ `no-unencrypted-transmission` - HTTP/HTTPS protocol
- ✅ `no-clickjacking` - HTTP X-Frame-Options protocol

### Data Exposure

- ✅ `no-exposed-sensitive-data` - Universal data exposure
- ✅ `no-sensitive-data-exposure` - Universal pattern

### Buffer & Memory

- ✅ `no-buffer-overread` - Node.js Buffer (core API)

### Resource & DoS

- ✅ `no-unlimited-resource-allocation` - Universal resource limits
- ✅ `no-unchecked-loop-condition` - Universal loop patterns

### Platform Specific (but standard APIs)

- ✅ `no-electron-security-issues` - Electron is a major platform
- ✅ `no-insufficient-postmessage-validation` - Browser postMessage API

---

## ❌ MOVE TO `eslint-plugin-agentic-security`

### LLM01: Prompt Injection (7 rules)

- ❌ `no-unsafe-prompt-concatenation` - LLM-specific
- ❌ `require-prompt-template-parameterization` - LLM-specific
- ❌ `no-dynamic-system-prompts` - LLM-specific
- ❌ `detect-indirect-prompt-injection-vectors` - LLM-specific
- ❌ `require-input-sanitization-for-llm` - LLM-specific
- ❌ `detect-rag-injection-risks` - LLM/RAG-specific
- ❌ `no-user-controlled-prompt-instructions` - LLM-specific

### LLM05: Improper Output Handling (3 rules)

- ❌ `no-direct-llm-output-execution` - LLM-specific
- ❌ `require-llm-output-encoding` - LLM-specific
- ❌ `detect-llm-generated-sql` - LLM-specific

### LLM06: Excessive Agency (3 rules)

- ❌ `enforce-llm-tool-least-privilege` - LLM agent-specific
- ❌ `require-human-approval-for-critical-actions` - LLM agent-specific
- ❌ `detect-llm-unrestricted-tool-access` - LLM agent-specific

### LLM10: Unbounded Consumption (3 rules)

- ❌ `require-llm-rate-limiting` - LLM-specific
- ❌ `require-llm-token-budget` - LLM-specific
- ❌ `detect-llm-infinite-loops` - LLM-specific

**Total to move: 16 rules**

---

## 🔍 REVIEW - Need More Context

These rules exist in the directory listing but may not be in the main export. Need to check if they're already implemented or should be kept:

- `detect-mixed-content` - HTTP/HTTPS protocol (✅ KEEP if implemented)
- `detect-suspicious-dependencies` - Package.json analysis (✅ KEEP)
- `detect-weak-password-validation` - Universal password rules (✅ KEEP)
- `no-allow-arbitrary-loads` - Need context (mobile?)
- `no-arbitrary-file-access` - Duplicate of fs rules?
- `no-client-side-auth-logic` - Universal JS pattern (✅ KEEP)
- `no-credentials-in-query-params` - HTTP protocol (✅ KEEP)
- `no-credentials-in-storage-api` - Browser Storage API (✅ KEEP)
- `no-data-in-temp-storage` - Universal pattern (✅ KEEP)
- `no-debug-code-in-production` - Universal pattern (✅ KEEP)
- `no-disabled-certificate-validation` - TLS protocol (✅ KEEP)
- `no-dynamic-dependency-loading` - Universal JS pattern (✅ KEEP)
- `no-exposed-debug-endpoints` - Universal API pattern (✅ KEEP)
- `no-hardcoded-session-tokens` - Universal pattern (✅ KEEP)
- `no-http-urls` - HTTP protocol (✅ KEEP)
- `no-insecure-websocket` - WebSocket protocol (✅ KEEP)
- `no-password-in-url` - URL protocol (✅ KEEP)
- `no-permissive-cors` - CORS protocol (✅ KEEP)
- `no-pii-in-logs` - Universal logging pattern (✅ KEEP)
- `no-postmessage-origin-wildcard` - postMessage API (✅ KEEP)
- `no-sensitive-data-in-analytics` - Universal pattern (✅ KEEP)
- `no-sensitive-data-in-cache` - Universal caching pattern (✅ KEEP)
- `no-tracking-without-consent` - Universal privacy pattern (✅ KEEP)
- `no-unencrypted-local-storage` - Browser Storage API (✅ KEEP)
- `no-unvalidated-deeplinks` - URL protocol (✅ KEEP - mobile deep links)
- `no-verbose-error-messages` - Universal pattern (✅ KEEP)
- `require-backend-authorization` - Universal auth pattern (✅ KEEP)
- `require-code-minification` - Universal JS pattern (✅ KEEP)
- `require-csp-headers` - HTTP CSP protocol (✅ KEEP)
- `require-data-minimization` - Universal privacy pattern (✅ KEEP)
- `require-dependency-integrity` - SRI protocol (✅ KEEP)
- `require-https-only` - HTTP/HTTPS protocol (✅ KEEP)
- `require-mime-type-validation` - MIME protocol (✅ KEEP)
- `require-network-timeout` - Universal network pattern (✅ KEEP)
- `require-package-lock` - Package manager pattern (✅ KEEP)
- `require-secure-credential-storage` - Universal pattern (✅ KEEP)
- `require-secure-defaults` - Universal pattern (✅ KEEP)
- `require-secure-deletion` - Universal data handling (✅ KEEP)
- `require-storage-encryption` - Universal storage pattern (✅ KEEP)
- `require-url-validation` - URL protocol (✅ KEEP)

---

## Summary

### Current State (from imports in index.ts):

- **Core Security Rules**: ~31 rules ✅ KEEP
- **LLM/Agentic Rules**: 16 rules ❌ MOVE to `eslint-plugin-agentic-security`

### Recommended Actions:

1. **Create new package**: `eslint-plugin-agentic-security`
2. **Move all LLM rules** (16 rules) to the new package
3. **Keep all universal JS/TS security rules** in `eslint-plugin-secure-coding`
4. **Verify additional rules** in directory listing are properly categorized

### New Package Structure:

```
eslint-plugin-agentic-security/
├── rules/
│   ├── prompt-injection/       (7 rules)
│   ├── output-handling/         (3 rules)
│   ├── excessive-agency/        (3 rules)
│   └── unbounded-consumption/   (3 rules)
```

This separation will:

- ✅ Keep `eslint-plugin-secure-coding` focused and universal
- ✅ Allow LLM/agentic rules to evolve independently
- ✅ Enable SDK-specific implementations in the agentic plugin
- ✅ Maintain clear separation of concerns
