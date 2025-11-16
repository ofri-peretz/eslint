# Cursor Rules - Forge.js Monorepo

This directory contains checklists and guidelines for common development tasks in the forge-js monorepo.

## 📋 Available Checklists

### 1. 📦 Adding a New Package

**File:** [`add-new-package-checklist.md`](./add-new-package-checklist.md)

**When to use:**

- Creating a new package in the `packages/` directory
- Setting up a new npm package for publishing
- Adding packages that need to be released

**Key Steps:**

- ✅ Package structure setup
- ✅ Nx configuration
- ✅ **Release workflow configuration (CRITICAL)**
  - Add to `SCOPED_PROJECTS` in `release.yml` (for scoped packages)
  - Add to `UNSCOPED_PROJECTS` in `release-unscoped.yml` (for unscoped packages)
- ✅ NPM publishing setup
- ✅ Documentation

**⚠️ CRITICAL:** Must add package to the appropriate release workflow!

### 2. 🔧 Adding a New ESLint Rule

**File:** [`eslint-rule-checklist.md`](./eslint-rule-checklist.md)

**When to use:**

- Adding a new rule to `@forge-js/eslint-plugin-llm-optimized`
- Creating rule documentation
- Updating rule exports

**Key Steps:**

- ✅ Rule implementation with LLM-optimized messages (use `formatLLMMessage`)
- ✅ Testing (unit tests required)
- ✅ Documentation (AEO-optimized docs page)
- ✅ Configuration (add to recommended config if applicable)
- ✅ Version & release (update CHANGELOG, README)

**⚠️ CRITICAL:** Must use `formatLLMMessage` utility for all error messages!

## 🎯 Quick Reference

### Package Type Decision

```
Is package name prefixed with @forge-js/?
│
├─ YES → SCOPED Package
│   ├─ Use: release.yml workflow
│   ├─ Add to: SCOPED_PROJECTS variable
│   └─ Auth: Trusted Publishing (OIDC)
│
└─ NO → UNscoped Package
    ├─ Use: release-unscoped.yml workflow
    ├─ Add to: UNSCOPED_PROJECTS variable
    └─ Auth: NPM_TOKEN (Granular Access Token)
```

## 📚 Related Documentation

- [Contributing Guide](../docs/CONTRIBUTING.md)
- [Release Guide](../RELEASE_GUIDE.md)
- [Trusted Publishing Setup](../.github/TRUSTED_PUBLISHING_SETUP.md)
