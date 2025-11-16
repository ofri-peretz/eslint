# 📚 Contributing & Release Guide

> **Note:** This is documentation for contributors. For general project information, see the [main README](../README.md).

Welcome! This document explains how to contribute and release packages for Forge.js.

---

## 🚀 Quick Navigation

### For Releasing Code
- **[RELEASE_QUICK_START.md](./RELEASE_QUICK_START.md)** - How to release packages

### For Setting Up Authentication
- **[TRUSTED_PUBLISHING_SETUP.md](./TRUSTED_PUBLISHING_SETUP.md)** - Secure npm publishing (recommended)
- **[NPM_SETUP_QUICK_REFERENCE.md](./NPM_SETUP_QUICK_REFERENCE.md)** - NPM token setup (alternative)

---

## 🎯 Workflow Overview

### 3 Workflows

| Workflow | Trigger | What it does |
|----------|---------|------------|
| **ci-pr.yml** | Pull Request | Tests & builds code |
| **lint-pr.yml** | Pull Request | Lints code (ESLint) |
| **release.yml** | Manual | Prepares & publishes release |

---

## 📖 How to Release

### 1. Ensure Main is Ready
```bash
# All PRs merged to main
# ci-pr.yml and lint-pr.yml pass ✅
```

### 2. Run Release Workflow
```bash
# Default: auto version (from commits), latest tag
gh workflow run release.yml

# Or with custom options:
gh workflow run release.yml -f dist-tag=beta
gh workflow run release.yml -f version-specifier=major
gh workflow run release.yml -f dry-run=true  # preview only
```

### 3. Monitor Progress
```bash
# List recent releases
gh run list --workflow release.yml

# View logs
gh run view <run-id> --log
```

---

## 🔐 Release Parameters

All optional. Sensible defaults provided.

| Parameter | Default | Options |
|-----------|---------|---------|
| `version-specifier` | `auto` | auto, major, minor, patch, prerelease |
| `dist-tag` | `latest` | latest, beta, rc, alpha, canary, next |
| `run-ci` | `true` | true, false |
| `dry-run` | `false` | true, false |

---

## 📊 Release Process

**What happens when you run `gh workflow run release.yml`:**

```
1. ✅ Validate CI (if run-ci=true)
   ├─ Run all tests
   └─ Build all packages

2. ✅ Prepare Release
   ├─ Analyze git commits
   ├─ Determine version bump
   ├─ Update package.json
   ├─ Update CHANGELOG.md
   └─ Create git tags

3. ✅ Publish to NPM (if dry-run=false)
   ├─ Publish packages
   └─ Apply distribution tag
```

---

## 🔐 Authentication Setup

Choose one setup method:

### Option 1: Trusted Publishing (Recommended)
- **Secure:** Temporary tokens, no storage
- **Maintenance:** Zero (auto-renewed)
- **Setup time:** 5 minutes
- **See:** [TRUSTED_PUBLISHING_SETUP.md](./TRUSTED_PUBLISHING_SETUP.md)

### Option 2: NPM Token
- **Setup time:** 2 minutes
- **Maintenance:** Annual rotation
- **See:** [NPM_SETUP_QUICK_REFERENCE.md](./NPM_SETUP_QUICK_REFERENCE.md)

---

## 📋 Before Your First Release

- [ ] Read: [RELEASE_QUICK_START.md](./RELEASE_QUICK_START.md)
- [ ] Setup authentication (5-10 min)
- [ ] Test: `gh workflow run release.yml -f dry-run=true`
- [ ] Ready!

---

## 🆘 Quick Help

### Release Failed?
```bash
# Check logs
gh run view <run-id> --log

# Retry
gh run rerun <run-id>
```

### Authentication Issues?
- See: [TRUSTED_PUBLISHING_SETUP.md](./TRUSTED_PUBLISHING_SETUP.md) or [NPM_SETUP_QUICK_REFERENCE.md](./NPM_SETUP_QUICK_REFERENCE.md)

### Want to Learn More?
- See: [RELEASE_QUICK_START.md](./RELEASE_QUICK_START.md)

---

## 📂 Files in This Directory

```
.github/
├── README.md                           ← You are here
├── RELEASE_QUICK_START.md              ← Release guide
├── TRUSTED_PUBLISHING_SETUP.md         ← Auth setup (recommended)
├── NPM_SETUP_QUICK_REFERENCE.md        ← Auth setup (alternative)
├── workflows/
│   ├── ci-pr.yml                       ← Test/build on PR
│   ├── lint-pr.yml                     ← Lint on PR
│   └── release.yml                     ← Release process
└── PULL_REQUEST_TEMPLATE.md            ← PR template
```

---

## ✨ Key Features

✅ **Simple:** 3 focused workflows
✅ **Safe:** CI validation before publishing
✅ **Flexible:** Optional parameters
✅ **Secure:** Trusted Publishing ready
✅ **Fast:** Easy one-command releases

---

**Ready to release?** Start with [RELEASE_QUICK_START.md](./RELEASE_QUICK_START.md) 🚀
