# ✅ Quick Actions - Next Session Checklist

## 🎯 Start Here

**Goal:** Fix 39 remaining rules to use `formatLLMMessage`

---

## 📋 Pre-Work (5 minutes)

1. **Review the list:**

   ```bash
   cat rules-needing-format-fix.json
   ```

2. **Pick approach:**
   - [ ] **Option B (Recommended):** Semi-automated - 10-20 hours
   - [ ] **Option C:** Batch template - 7-13 hours
   - [ ] **Option A:** Manual - 40-80 hours

---

## 🚀 If You Choose Option B (Semi-Automated)

### Step 1: Generate Templates (30 min)

```bash
node scripts/generate-rule-templates.js
```

This will create updated files with:

- ✅ Proper imports (`formatLLMMessage`, `MessageIcons`)
- ✅ `MessageIds` type
- ✅ `Options` interface
- ✅ `RuleOptions` type
- ⚠️ **TODO placeholders** for CWE/OWASP/CVSS

### Step 2: Fill in CWE Values (10-20 hours)

For each rule, add proper CWE from this quick reference:

| Rule Pattern                | CWE                | Severity        |
| --------------------------- | ------------------ | --------------- |
| `*-credentials-*`           | CWE-798 / CWE-522  | CRITICAL / HIGH |
| `*-storage-*`               | CWE-312 / CWE-313  | HIGH            |
| `*-https-*` / `*-http-*`    | CWE-319            | HIGH            |
| `*-certificate-*`           | CWE-295            | HIGH            |
| `*-validation-*`            | CWE-20             | HIGH / MEDIUM   |
| `*-pii-*` / `*-sensitive-*` | CWE-359 / CWE-532  | HIGH            |
| `*-cors-*` / `*-csp-*`      | CWE-942 / CWE-693  | MEDIUM          |
| `*-dependency-*`            | CWE-1104 / CWE-829 | MEDIUM          |

### Step 3: Verify (1 hour)

```bash
npm run build
npm test
```

---

## 🚀 If You Choose Option C (Batch Template)

### Step 1: Auto-generate All (30 min)

```bash
node scripts/batch-update-rules.js
```

This applies generic CWE mappings based on rule names.

### Step 2: Review Critical Rules (5-10 hours)

Focus manual review on high-impact rules:

- [ ] `no-credentials-in-storage-api`
- [ ] `no-unencrypted-local-storage`
- [ ] `require-https-only`
- [ ] `no-disabled-certificate-validation`
- [ ] `no-pii-in-logs`
- [ ] `require-csp-headers`

### Step 3: Verify (1 hour)

```bash
npm run build
npm test
```

---

## 📊 After Fixing Rules

### 1. Version Bump

```bash
cd packages/eslint-plugin-secure-coding
# Update package.json: "version": "3.0.0"

cd ../eslint-plugin-agentic-security
# Update package.json: "version": "1.0.0"
```

### 2. Update Documentation

- [ ] Update README.md rule count to 78
- [ ] Remove "LLM-optimized" → Use "AI-parseable"
- [ ] Update CHANGELOG.md in both packages

### 3. Test Everything

```bash
npm run build
npm test
```

### 4. Publish

```bash
npm publish --access public
```

---

## 📂 Files to Review

Created during this session:

- ✅ `SESSION-SUMMARY.md` - What we did
- ✅ `COMPREHENSIVE-REVIEW.md` - Full 9.2/10 review
- ✅ `LLM-MIGRATION-SUMMARY.md` - Migration details
- ✅ `RULES-STANDARDIZATION-PLAN.md` - Fix plan
- ✅ `rules-needing-format-fix.json` - List of 40 rules

---

## 🎯 Success Criteria

You'll know you're done when:

1. ✅ All 78 rules use `formatLLMMessage`
2. ✅ All rules have `MessageIds`, `Options`, `RuleOptions`
3. ✅ Tests pass
4. ✅ Builds successfully
5. ✅ Both packages published to npm
6. ✅ Documentation updated

---

## 💡 Quick Wins

While fixing rules, also:

- [ ] Add `"test": "vitest run"` to package.json
- [ ] Create `.github/workflows/ci.yml` for automated tests
- [ ] Add contributing guide
- [ ] Create v2 → v3 migration guide

---

**Estimated Total Time:** 10-20 hours (Option B) or 7-13 hours (Option C)

**Want the script?** Let me know and I'll create `generate-rule-templates.js` or `batch-update-rules.js`! 🚀
