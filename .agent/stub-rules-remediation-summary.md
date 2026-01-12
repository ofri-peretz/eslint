# Stub Rule Documentation Remediation

**Status:** In Progress (1/27 complete)  
**Created:** 2026-01-12  
**Last Updated:** 2026-01-12

---

## Progress Summary

### ✅ Completed (1 rule)

1. **require-data-minimization** - Full implementation-based documentation
   - CWE-213 mapping
   - OWASP Mobile M6 mapping
   - Real code examples from AST visitor logic
   - 3 false negatives with mitigations
   - Validation: PASS

### 📋 Remaining (26 rules)

All with metadata extracted and ready for doc generation:

| Rule | CWE | Description | OWASP Category |
|------|-----|-------------|----------------|
| no-sensitive-data-in-analytics | CWE-359 | Prevent PII being sent to analytics services | M6: Privacy |
| no-data-in-temp-storage | CWE-312 | Prevent sensitive data in temp directories | M9: Data Storage |
| require-https-only | CWE-319 | Enforce HTTPS for all external requests | M5: Communication |
| require-secure-credential-storage | CWE-312 | Enforce secure storage patterns for credentials | M1: Credentials |
| no-dynamic-dependency-loading | CWE-1104 | Prevent runtime dependency injection with dynamic paths | M2: Supply Chain |
| no-hardcoded-session-tokens | CWE-798 | Detect hardcoded session/JWT tokens | M1: Credentials |
| no-password-in-url | CWE-521 | Prevent passwords in URLs | M1: Credentials |
| no-tracking-without-consent | CWE-359 | Require consent before analytics tracking | M6: Privacy |
| no-insecure-websocket | CWE-319 | Require secure WebSocket connections (wss://) | M5: Communication |
| require-secure-deletion | CWE-459 | Require secure data deletion patterns | M9: Data Storage |
| require-secure-defaults | CWE-1188 | Ensure secure default configurations | M8: Misconfiguration |
| require-package-lock | CWE-829 | Ensure package-lock.json or yarn.lock exists | M2: Supply Chain |
| require-storage-encryption | CWE-312 | Require encryption for persistent storage | M9: Data Storage |
| require-mime-type-validation | CWE-434 | Require MIME type validation for file uploads | M4: Input Validation |
| require-dependency-integrity | CWE-494 | Require SRI (Subresource Integrity) for CDN resources | M2: Supply Chain |
| require-backend-authorization | CWE-602 | Require server-side authorization checks | M3: Authentication |
| require-url-validation | CWE-601 | Enforce URL validation before navigation | M4: Input Validation |
| no-sensitive-data-in-cache | CWE-200 | Prevent caching sensitive data without encryption | M9: Data Storage |
| no-exposed-debug-endpoints | CWE-489 | Detect debug endpoints without auth | M8: Misconfiguration |
| no-unvalidated-deeplinks | CWE-939 | Require validation of deep link URLs | M4: Input Validation |
| no-disabled-certificate-validation | CWE-295 | Prevent disabled SSL/TLS certificate validation | M5: Communication |
| require-code-minification | CWE-656 | Require minification configuration | M7: Binary Protection |
| no-verbose-error-messages | CWE-209 | Prevent exposing stack traces to users | M8: Misconfiguration |
| require-csp-headers | CWE-1021 | Require Content Security Policy headers | M8: Misconfiguration |
| require-network-timeout | CWE-400 | Require timeout limits for network requests | M5: Communication |
| no-permissive-cors | CWE-942 | Prevent overly permissive CORS configuration | M8: Misconfiguration |

---

## Tools Created

### 1. Validation Script
**File:** `scripts/validate-rule-docs.js`  
**Purpose:** Scan all 397 rule docs for compliance issues  
**Usage:**
```bash
node scripts/validate-rule-docs.js
```

**Output:**
- Identifies HIGH priority stubs (placeholder content)
- Identifies MEDIUM priority issues (missing sections)
- Generates detailed report in `.agent/rule-docs-validation-report.md`

### 2. Documentation Generator (Template)
**File:** `scripts/generate-stub-docs.js`  
**Purpose:** Auto-generate docs from implementation analysis  
**Status:** Template created, needs minor syntax fixes

### 3. Workflow Documentation
**File:** `.agent/workflows/fix-stub-rule-docs.md` (intended)  
**Purpose:** Step-by-step process for fixing stub documentation

---

## Documentation Template

Based on `require-data-minimization.md`, each rule doc must include:

### Required Sections:
1. **Title + Description** (1 sentence, <100 chars)
2. **Severity + CWE + OWASP** (with links)
3. **Rule Details** (what the rule detects)
4. **Why This Matters** (security/privacy impact)
5. **❌ Incorrect** (2+ examples with comments)
6. **✅ Correct** (2+ examples with comments)
7. **Known False Negatives** (3+ with Why/Mitigation)
8. **Related Rules** (optional)
9. **References** (CWE, OWASP links)

### Quality Checklist:
- [ ] Title matches rule name exactly
- [ ] TypeScript code blocks (not JavaScript  
- [ ] Inline comments in all examples
- [ ] No placeholder text
- [ ] Based on actual implementation
- [ ] Passes validation script

---

## Next Steps

### Phase 1: Generate Base Documentation (2-3 hours)
For each of the 26 remaining rules:
1. Read implementation file (`src/rules/{rule}/index.ts`)
2. Extract detection logic from `create()` function
3. Generate examples based on AST visitor patterns
4. Populate template with metadata
5. Add 3 false negative examples

### Phase 2: Quality Review (1-2 hours)
1. Run validation: `node scripts/validate-rule-docs.js`
2. Fix any compliance issues
3. Ensure code examples are realistic
4. Verify CWE/OWASP mappings

### Phase 3: Commit in Batches (1 hour)
```bash
# Batch 1: M6 Privacy rules (5 rules)
git add packages/eslint-plugin-secure-coding/docs/rules/
git commit -m "docs: fix privacy control rule stubs (batch 1/5)"

# Batch 2: M5 Communication rules (5 rules)
# ... etc
```

---

## Validation Metrics

### Before:
```
✅ Compliant: 110/397 (28%)
🔴 HIGH: 27 stubs
🟡 MEDIUM: 260 issues
```

### Target After (Phase 1-3):
```
✅ Compliant: 137/397 (35%)  
🔴 HIGH: 0 stubs  ← Target
🟡 MEDIUM: 260 issues (unchanged for now)
```

---

## Automation Opportunities

### Current Manual Process:
- ~20 minutes per rule × 26 rules = ~9 hours

### With Full Automation:
1. Parse TypeScript AST to extract:
   - `meta.docs.description`
   - `meta.messages` error text
   - CWE from `formatLLMMessage`
   - Detection patterns from `create()` visitors
2. Generate code examples by reversing AST checks
3. Auto-populate template
4. Est. time: 2-3 hours (mostly review)

### Implementation:
- Use `@typescript-eslint/typescript-estree` to parse implementations
- Map AST visitor patterns to code examples
- Auto-generate false negatives based on common patterns

---

## Related Files

- `.agent/rules-compliance-audit.md` - Full compliance standard
- `.agent/rule-docs-validation-report.md` - Detailed validation report
- `.agent/workflows/fix-stub-rule-docs.md` - Step-by-step workflow
- `packages/eslint-plugin-secure-coding/docs/rules/require-data-minimization.md` - Template example

---

## Timeline Estimate

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| Setup | Validator + Template | 2h | ✅ Done |
| Fix 1 Rule (Template) | require-data-minimization | 30m | ✅ Done |
| Metadata Extraction | All 26 rules | 30m | ✅ Done |
| Generate Docs | 26 rules | 6-8h | ⏳ TODO |
| Quality Review | Validation + fixes | 2h | ⏳ TODO |
| **Total** | | **11-13h** | **25% done** |

---

## Success Criteria

Run after completion:
```bash
node scripts/validate-rule-docs.js
```

Expected:
- 🔴 HIGH PRIORITY: 0 (currently 27)
- ✅ Compliant: 137+ (currently 110)
- All stub rules have complete documentation

