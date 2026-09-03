---
title: Rule Documentation Compliance Audit - Part 1
description: Automation and Integration Standards for rule documentation.
---

# Rule Documentation Compliance Audit Standard - Part 1 (Automation)

**Version:** 1.1 | **Date:** January 2026 | **Scope:** SECURITY-FOCUSED ESLint plugins

## Automation Integration

> **Context**: Rule documentation compliance is integrated with our automated synchronization and validation infrastructure.

### How It Works Together

Rule Docs --> sync-docs-data.yml --> sync-plugin-stats.mjs --> Validation Scripts --> Vercel Deploy.

#### 1. **GitHub Workflow**: `sync-docs-data.yml`

- Runs daily at midnight UTC.
- Syncs plugin stats and README rules tables.
- Triggers Vercel rebuild on changes.

#### 2. **Rule Counting Script**: `sync-plugin-stats.mjs`

- Scans all `eslint-plugin-*` packages.
- Counts rules by parsing `src/index.ts` exports.
- **Requirement**: Rule doc filenames MUST match the rule name in `src/index.ts`.

#### 3. **Validation Scripts**: `markdown-content-sync-checks.md`

- `check-markdown-links.ts`: Validates all internal links.
- `sync-readme-rules.ts`: Updates "Rules" tables in READMEs.
- `validate-docs.ts`: General documentation integrity checks.

---

## Mandatory Structure

All **security rule** documentation files **MUST** follow this exact section order:

# rule-name

> Short description (1 sentence)
> **Severity:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW
> **CWE:** [CWE-XXX](link)
> **OWASP:** [Category](link)
> **CVSS:** X.X

## Rule Details

## ❌ Incorrect (at least 2 examples)

## ✅ Correct (at least 2 examples)

## Options (if configurable)

## 🛡️ Why This Matters

## Known False Negatives (3+ examples)

## 🔗 Related Rules

## 📚 References

---

## Documentation Quality Checklist

- [ ] Title matches exact rule name from source code.
- [ ] Description is concise (<100 chars).
- [ ] Includes CWE/OWASP/CVSS metadata.
- [ ] At least 2 incorrect and 2 correct examples.
- [ ] All code blocks have inline comments.
- [ ] Known False Negatives section has 3+ examples with mitigations.
