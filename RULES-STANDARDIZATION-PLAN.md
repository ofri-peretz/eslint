# 📋 Standardizing All Rules - Action Plan

## 🎯 Objective

Ensure all 78 rules in `eslint-plugin-secure-coding` follow consistent patterns:

1. ✅ **Use `formatLLMMessage`** for AI-parseable messages
2. ✅ **Define `MessageIds` type** for all message IDs
3. ✅ **Define `Options` interface** for rule configuration
4. ✅ **Define `RuleOptions` type** as `[Options?]`
5. ✅ **Use generic `createRule<RuleOptions, MessageIds>`**

---

## 📊 Current Status

### ✅ Rules Already Following Pattern (38 rules)

These rules already use `formatLLMMessage` and proper structure:

- `database-injection`
- `no-sql-injection`
- `detect-eval-with-expression`
- `detect-child-process`
- `no-hardcoded-credentials`
- `no-insecure-redirects`
- `no-directive-injection`
- `no-buffer-overread`
- `no-unchecked-loop-condition`
- ... (29 more core rules)

###⚠️ Rules Needing Updates (40 rules)
These rules need to be updated to use `formatLLMMessage`:

#### Platform/Mobile Rules (Most of these):

1. `no-http-urls` ✅ **FIXED**
2. `no-credentials-in-query-params`
3. `require-storage-encryption`
4. `require-url-validation`
5. `no-sensitive-data-in-cache`
6. `no-credentials-in-storage-api`
7. `detect-weak-password-validation`
8. `no-arbitrary-file-access`
9. `require-csp-headers`
10. `no-tracking-without-consent`
11. `no-dynamic-dependency-loading`
12. `require-dependency-integrity`
13. `require-secure-deletion`
14. `no-hardcoded-session-tokens`
15. `no-unvalidated-deeplinks`
16. `require-data-minimization`
17. `no-unencrypted-local-storage`
18. `no-insecure-websocket`
19. `detect-suspicious-dependencies`
20. `no-verbose-error-messages`
21. `require-code-minification`
22. `detect-mixed-content`
23. `no-password-in-url`
24. `no-disabled-certificate-validation`
25. `no-pii-in-logs`
26. `require-https-only`
27. `no-postmessage-origin-wildcard`
28. `no-client-side-auth-logic`
29. `no-debug-code-in-production`
30. `require-network-timeout`
31. `no-permissive-cors`
32. `no-exposed-debug-endpoints`
33. `no-allow-arbitrary-loads`
34. `no-sensitive-data-in-analytics`
35. `require-secure-defaults`
36. `require-backend-authorization`
37. `require-mime-type-validation`
38. `no-data-in-temp-storage`
39. `require-secure-credential-storage`
40. `require-package-lock`

---

## 🔧 Standard Pattern

### Before (Plain messages):

```typescript
import { createRule } from '@interlace/eslint-devkit';

export const myRule = createRule({
  name: 'my-rule',
  meta: {
    messages: {
      myError: 'Something bad happened',
    },
  },
  create(context) {
    // ...
  },
});
```

### After (AI-parseable):

```typescript
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'myError';

export interface Options {
  /** Option description */
  someOption?: boolean;
}

type RuleOptions = [Options?];

export const myRule = createRule<RuleOptions, MessageIds>({
  name: 'my-rule',
  meta: {
    messages: {
      myError: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Security Issue',
        cwe: 'CWE-###',
        description: 'Something bad happened',
        severity: 'HIGH',
        fix: 'Do this instead: ...',
        documentationLink: 'https://cwe.mitre.org/...',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          someOption: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ someOption: false }],
  create(context) {
    const [options = {}] = context.options;
    // ...
  },
});
```

---

## 📝 Implementation Strategy

### Option A: Manual (High Quality, Slow)

- Go through each rule individually
- Research proper CWE/OWASP/CVSS for each
- Write meaningful fix suggestions
- **Time:** ~1-2 hours per rule = 40-80 hours total

### Option B: Semi-Automated (Good Quality, Faster)

- Create script to extract existing messages
- Generate templates with placeholders
- Human review and fill in CWE/OWASP/CVSS
- **Time:** ~15-30 min per rule = 10-20 hours total

### Option C: Template + Batch (Acceptable Quality, Fast)

- Use generic CWE mappings based on rule category
- Generate all at once
- Review and refine critical rules
- **Time:** ~2-3 hours for batch + 5-10 hours for review = 7-13 hours total

---

## 🎯 Recommended Approach: **Option B**

1. **Create extraction script** → Pull existing messages from each rule
2. **Generate templates** → Create properly structured files with TODOs
3. **Human review** → Fill in proper CWE/OWASP/CVSS values
4. **Batch apply** → Update all files
5. **Test** → Verify no regressions

---

## 📊 CWE Mapping Reference

Quick reference for common categories:

| Category             | Common CWE                                                                     |
| -------------------- | ------------------------------------------------------------------------------ |
| **Credentials**      | CWE-798 (Hardcoded), CWE-522 (Insufficiently Protected)                        |
| **Storage**          | CWE-312 (Cleartext Storage), CWE-313 (Cleartext in File)                       |
| **Communication**    | CWE-319 (Cleartext Transmission), CWE-295 (Improper Certificate Validation)    |
| **Input Validation** | CWE-20 (Improper Input Validation), CWE-116 (Improper Output Encoding)         |
| **Authentication**   | CWE-306 (Missing Auth), CWE-287 (Improper Auth)                                |
| **Privacy**          | CWE-359 (Exposure of Private Info), CWE-532 (Log Injection)                    |
| **Configuration**    | CWE-693 (Protection Mechanism Failure), CWE-16 (Configuration)                 |
| **Supply Chain**     | CWE-1104 (Use of Unmaintained Third Party), CWE-829 (Untrusted Control Sphere) |

---

##✅ Next Steps

1. **Review this plan** - Decide on approach (A, B, or C)
2. **Prioritize rules** - Which are most critical?
3. **Execute** - Run chosen strategy
4. **Test** - Ensure no breakage
5. **Document** - Update README with new counts

---

**Current Progress: 1/40 rules fixed (2.5%)**  
**Estimated time remaining: 7-80 hours** (depending on approach)

Would you like me to:

- [ ] Create the semi-automated script (Option B)?
- [ ] Do a batch template generation (Option C)?
- [ ] Help fix rules manually one-by-one (Option A)?
