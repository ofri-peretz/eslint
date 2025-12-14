# Mobile Security Rules - Implementation Strategy

## Current Status

- ✅ **1 rule** fully implemented: `no-http-urls`
- ⚠️ **39 rules** need implementation

## Implementation Approach

Given the scale (39 rules), I'll implement them in focused batches using proven patterns from existing rules like `no-sql-injection` and `no-http-urls`.

### Batch 1: High-Priority Communication & Storage Rules (10 rules)

**Target: 30 minutes**

1. `no-disabled-certificate-validation` - Detect `rejectUnauthorized: false`
2. `require-https-only` - Enforce HTTPS in fetch/axios calls
3. `no-insecure-websocket` - Detect `ws://` instead of `wss://`
4. `no-credentials-in-storage-api` - Detect credentials in localStorage
5. `no-credentials-in-query-params` - Detect credentials in URL params
6. `no-postmessage-origin-wildcard` - Detect `postMessage(*, '*')`
7. `no-permissive-cors` - Detect CORS with `*` origin
8. `no-verbose-error-messages` - Detect stack traces in responses
9. `no-unencrypted-local-storage` - Detect sensitive data in storage
10. `no-pii-in-logs` - Detect PII in console.log

### Batch 2: Authentication & Input Validation (10 rules)

**Target: 30 minutes**

11. `no-client-side-auth-logic` - Detect auth logic in frontend
12. `require-backend-authorization` - Detect client-side authz decisions
13. `no-hardcoded-session-tokens` - Detect hardcoded JWT/tokens
14. `detect-weak-password-validation` - Detect weak password rules
15. `no-password-in-url` - Detect passwords in URLs
16. `no-unvalidated-deeplinks` - Detect unvalidated deep link handling
17. `require-url-validation` - Require URL validation before navigation
18. `no-arbitrary-file-access` - Detect file access from user input
19. `require-mime-type-validation` - Require file type validation
20. `require-csp-headers` - Check for CSP configuration

### Batch 3: Privacy & Supply Chain (10 rules)

**Target: 30 minutes**

21. `no-tracking-without-consent` - Detect analytics before consent
22. `require-data-minimization` - Detect excessive data collection
23. `no-sensitive-data-in-analytics` - Detect PII in analytics
24. `require-dependency-integrity` - Require SRI for CDN resources
25. `detect-suspicious-dependencies` - Detect typosquatting
26. `no-dynamic-dependency-loading` - Detect dynamic imports
27. `require-package-lock` - Ensure lock file exists
28. `detect-mixed-content` - Detect HTTP in HTTPS pages
29. `no-allow-arbitrary-loads` - Detect insecure load configs
30. `require-network-timeout` - Require timeout for requests

### Batch 4: Configuration & Data Storage (9 rules)

**Target: 30 minutes**

31. `no-debug-code-in-production` - Detect DEBUG flags
32. `require-code-minification` - Check build config
33. `no-exposed-debug-endpoints` - Detect /debug routes
34. `require-secure-defaults` - Check secure default configs
35. `require-secure-credential-storage` - Enforce secure storage
36. `no-sensitive-data-in-cache` - Detect caching sensitive data
37. `require-storage-encryption` - Require encryption for storage
38. `no-data-in-temp-storage` - Detect sensitive data in /tmp
39. `require-secure-deletion` - Require secure data deletion

---

## Implementation Pattern

Each rule will follow this proven pattern:

```typescript
export const ruleName = createRule({
  name: 'rule-name',
  meta: {
    type: 'problem',
    docs: {
      description: '...',
      category: 'Security',
      recommended: true,
      owaspMobile: ['M#'],
      cweIds: ['CWE-###'],
    },
    messages: { ... },
    schema: [ ... ],
  },
  defaultOptions: [ ... ],
  create(context) {
    // AST visitors with security detection logic
    return {
      CallExpression(node) { ... },
      Literal(node) { ... },
      MemberExpression(node) { ... },
    };
  },
});
```

**Each rule gets:**

- ✅ Proper AST visitor logic
- ✅ Configurable options where applicable
- ✅ Comprehensive test cases (8-12 per rule)
- ✅ Complete markdown documentation
- ✅ CWE/OWASP mappings

---

## Execution

Starting implementation now in 4 batches...
