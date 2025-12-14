# Mobile Security Rules - Framework-Agnostic Edition

## 40 NEW Rules for `eslint-plugin-secure-coding`

### Filtering Criteria

✅ **Include**: Generic vulnerable code patterns
❌ **Exclude**: Platform-specific APIs (iOS Keychain, Android Keystore, etc.)

---

## Revised Mobile Security Rules (Framework-Agnostic)

### M1: Improper Credential Usage (3 rules)

_Detects hardcoded/insecure credential storage patterns_

1. **`no-credentials-in-storage-api`**
   - Detects credentials in localStorage, sessionStorage, IndexedDB
   - Pattern: `localStorage.setItem('password', ...)`, `sessionStorage.setItem('token', ...)`
2. **`no-credentials-in-query-params`**
   - Flags credentials in URL query strings
   - Pattern: `?token=...`, `?apiKey=...`, `?password=...`

3. **`require-secure-credential-storage`**
   - Enforces use of secure storage patterns (not plain text)
   - Detects: `AsyncStorage.setItem('password', password)` without encryption

---

### M2: Supply Chain Security (4 rules)

_Generic dependency security patterns_

4. **`require-dependency-integrity`**
   - Requires integrity hashes (SRI) for CDN resources
   - Pattern: `<script src="https://cdn..." />` without `integrity=` attribute

5. **`detect-suspicious-dependencies`**
   - Flags dependencies with suspicious patterns (typosquatting)
   - Pattern: `loadash` instead of `lodash`, `reaqct` instead of `react`

6. **`no-dynamic-dependency-loading`**
   - Prevents runtime dependency injection
   - Pattern: `import(userProvidedPath)`, `require(variablePath)`

7. **`require-package-lock`**
   - Ensures package-lock.json/yarn.lock exists
   - Static file check

---

### M3: Insecure Authentication/Authorization (5 rules)

_Client-side auth anti-patterns_

8. **`no-client-side-auth-logic`**
   - Detects authentication logic in client code
   - Pattern: `if (password === storedPassword)` in frontend

9. **`require-backend-authorization`**
   - Flags client-side authorization decisions
   - Pattern: `if (user.role === 'admin')` controlling access in frontend

10. **`no-hardcoded-session-tokens`**
    - Detects hardcoded session/JWT tokens
    - Pattern: `Authorization: Bearer abc123...`

11. **`detect-weak-password-validation`**
    - Identifies weak password requirements
    - Pattern: `password.length >= 6` (too weak)

12. **`no-password-in-url`**
    - Flags passwords in URLs
    - Pattern: `https://user:password@example.com`

---

### M4: Insufficient Input/Output Validation (6 rules)

_Generic injection and validation patterns_

13. **`no-unvalidated-deeplinks`**
    - Detects unvalidated deep link handling
    - Pattern: `const url = getIntent().getData(); navigate(url)` without validation

14. **`require-url-validation`**
    - Enforces URL validation before navigation
    - Pattern: `window.location = userInput` without validation

15. **`no-arbitrary-file-access`**
    - Detects file access from user input
    - Pattern: `fs.readFile(req.query.file)`

16. **`require-mime-type-validation`**
    - Requires validation of file uploads by content
    - Pattern: File upload without content-type checking

17. **`no-postmessage-origin-wildcard`**
    - Detects `postMessage` with `*` origin
    - Pattern: `window.postMessage(data, '*')`

18. **`require-csp-headers`**
    - Checks for Content Security Policy
    - Pattern: Missing CSP meta tag or headers

---

### M5: Insecure Communication (7 rules)

_Network security patterns_

19. **`no-http-urls`**
    - Detects hardcoded HTTP URLs (not HTTPS)
    - Pattern: `'http://api.example.com'`, `'http://...'`

20. **`no-disabled-certificate-validation`**
    - Flags disabled SSL/TLS certificate checks
    - Pattern: `rejectUnauthorized: false`, `verify: false`

21. **`require-https-only`**
    - Enforces HTTPS for all external requests
    - Pattern: `fetch('http://...')`, `axios.get('http://...')`

22. **`no-insecure-websocket`**
    - Detects unencrypted WebSocket connections
    - Pattern: `new WebSocket('ws://...')` (should be `wss://`)

23. **`detect-mixed-content`**
    - Identifies HTTPS pages loading HTTP resources
    - Pattern: `<script src="http://...">` in HTTPS context

24. **`no-allow-arbitrary-loads`**
    - Flags configuration allowing insecure loads
    - Pattern: `allowArbitraryLoads: true` in config

25. **`require-network-timeout`**
    - Ensures network requests have timeout limits
    - Pattern: `fetch(url)` without timeout, `axios.get(url)` without timeout

---

### M6: Inadequate Privacy Controls (4 rules)

_PII and privacy patterns_

26. **`no-pii-in-logs`**
    - Detects PII (email, SSN, credit cards) in console.log
    - Pattern: `console.log('User email:', email)`

27. **`no-tracking-without-consent`**
    - Flags analytics tracking before consent
    - Pattern: `analytics.track()` before consent check

28. **`require-data-minimization`**
    - Identifies excessive data collection
    - Pattern: Collecting more fields than necessary

29. **`no-sensitive-data-in-analytics`**
    - Detects PII sent to analytics
    - Pattern: `analytics.track('purchase', { email: user.email })`

---

### M7: Insufficient Binary Protections (2 rules)

_Code protection patterns_

30. **`no-debug-code-in-production`**
    - Detects debug code in production builds
    - Pattern: `if (DEBUG)`, `__DEV__`, `console.log`

31. **`require-code-minification`**
    - Checks for minification configuration
    - Pattern: Build config without minification

---

### M8: Security Misconfiguration (4 rules)

_Configuration anti-patterns_

32. **`no-verbose-error-messages`**
    - Detects stack traces exposed to users
    - Pattern: `catch(e) { res.send(e.stack) }`

33. **`no-exposed-debug-endpoints`**
    - Flags debug/admin endpoints in production
    - Pattern: `/debug`, `/admin` routes without auth

34. **`require-secure-defaults`**
    - Ensures secure default configurations
    - Pattern: Default configs with security off

35. **`no-permissive-cors`**
    - Detects overly permissive CORS
    - Pattern: `Access-Control-Allow-Origin: *`

---

### M9: Insecure Data Storage (5 rules)

_Storage security patterns_

36. **`no-unencrypted-local-storage`**
    - Detects sensitive data in unencrypted storage
    - Pattern: `localStorage.setItem('creditCard', card)`

37. **`no-sensitive-data-in-cache`**
    - Flags sensitive data cached without encryption
    - Pattern: Caching PII without encryption

38. **`require-storage-encryption`**
    - Enforces encryption for persistent storage
    - Pattern: Writing to IndexedDB/SQLite without encryption

39. **`no-data-in-temp-storage`**
    - Detects sensitive data in temp/cache directories
    - Pattern: Writing to `/tmp`, `cache/` without cleanup

40. **`require-secure-deletion`**
    - Ensures secure data deletion (overwrite)
    - Pattern: `delete obj.password` (should use secure wipe)

---

## Implementation Notes

### Detection Patterns

Each rule should detect **syntactic patterns** that indicate vulnerability:

```typescript
// Example: no-http-urls rule
export const noHttpUrls = {
  meta: {
    type: 'problem',
    category: 'Security',
    docs: {
      description: 'Disallow hardcoded HTTP URLs',
      owaspMapping: ['M5'],
      cweMapping: ['CWE-319'],
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          const httpPattern = /^http:\/\//i;
          if (httpPattern.test(node.value)) {
            context.report({
              node,
              messageId: 'insecureHttp',
              data: { url: node.value },
            });
          }
        }
      },
    };
  },
};
```

### Framework Detection

While rules are framework-agnostic, they should recognize common patterns across:

- React Native: `AsyncStorage`, `Linking`
- Web: `localStorage`, `fetch`, `XMLHttpRequest`
- Node.js: `fs`, `http`, `https`, `child_process`
- General: String patterns, URL patterns

### Configurable Options

Rules should support framework-agnostic configuration:

```javascript
{
  "rules": {
    "secure-coding/no-http-urls": ["error", {
      "allowedHosts": ["localhost", "127.0.0.1"],
      "allowedPorts": [3000, 8080]
    }],
    "secure-coding/require-https-only": ["error", {
      "exceptions": ["ws://localhost:*"]
    }]
  }
}
```

---

## Rules Summary

| Category            | Count  | Focus                                        |
| ------------------- | ------ | -------------------------------------------- |
| Credential Security | 3      | Storage patterns, query params               |
| Supply Chain        | 4      | Dependencies, integrity, dynamic loading     |
| Authentication      | 5      | Client-side auth anti-patterns               |
| Input/Output        | 6      | Validation, injection, origin checks         |
| Communication       | 7      | HTTP/HTTPS, certificate validation, timeouts |
| Privacy             | 4      | PII in logs/analytics, consent               |
| Code Protection     | 2      | Debug code, minification                     |
| Configuration       | 4      | Verbose errors, CORS, defaults               |
| Data Storage        | 5      | Encryption, temp storage, secure deletion    |
| **TOTAL**           | **40** | **Framework-agnostic patterns**              |

---

## Excluded (Platform-Specific)

These were in the original plan but are **excluded** because they're platform-specific:

❌ `require-keychain-for-credentials` (iOS Keychain API)
❌ `require-android-keystore` (Android Keystore API)
❌ `require-ats-compliance` (iOS App Transport Security)
❌ `require-network-security-config` (Android XML config)
❌ `require-biometric-protection` (Platform biometric APIs)
❌ `require-oauth-pkce` (OAuth-specific, not general code pattern)
❌ `require-code-obfuscation` (Build tool-specific)
❌ `no-debuggable-production-build` (Android manifest-specific)
❌ `require-root-jailbreak-detection` (Platform detection APIs)
❌ `no-exported-components-without-permission` (Android manifest)

These could be added later as **optional** platform-specific rules with clear documentation that they only apply to specific frameworks.

---

## Next Steps

1. ✅ Review these 40 framework-agnostic rules
2. Create rule implementation files
3. Write tests for each rule
4. Update documentation
5. Add to eslint-plugin-secure-coding index

Would you like me to proceed with implementation?
