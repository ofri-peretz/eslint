# ⚡ Nx Release - Quick Start Card

## 🎯 TL;DR - The 3 Commands You Need

```bash
# 1️⃣  Fix commit type (if needed)
git commit --amend -m "fix: optimize ESLint rule messages"

# 2️⃣  Preview changes (safe, no side effects)
pnpm nx release --dry-run

# 3️⃣  Release everything (one command!)
pnpm nx release
```

**That's it!** Nx automatically handles:
- ✅ Version detection & bump
- ✅ package.json updates
- ✅ CHANGELOG.md generation
- ✅ Git commits & tags
- ✅ NPM publishing

---

## 📋 Commit Type Reference

| Type | Bump | Example |
|------|------|---------|
| `fix:` | 0.2.1 → **0.2.2** (patch) | `fix: optimize messages` |
| `feat:` | 0.2.1 → **0.3.0** (minor) | `feat: add new rule` |
| `BREAKING CHANGE:` | 0.2.1 → **1.0.0** (major) | `feat!: redesign API` |
| `refactor:`, `docs:`, `chore:` | ❌ NO BUMP | (code improvements only) |

---

## 🚀 Common Scenarios

### Scenario 1: Your token optimization work (most common)

```bash
# Your commit is already made:
#   commit: refactor: align ALL 19 ESLint rules...

# Change it to trigger a patch bump:
git commit --amend -m "fix: optimize ESLint rule messages for 40% token reduction"

# Preview
pnpm nx release --dry-run

# Release!
pnpm nx release
```

**Result**: 0.2.1 → 0.2.2 ✅

---

### Scenario 2: Release only one package

```bash
pnpm nx release --projects=eslint-plugin
```

---

### Scenario 3: Manually set version

```bash
pnpm nx release --version=minor
# or
pnpm nx release --version=0.3.0
```

---

### Scenario 4: Publish-only (already have tags)

```bash
pnpm nx release publish
```

---

## ✅ What Happens During `pnpm nx release`

```
┌─────────────────────────────────────────────────────────┐
│  pnpm nx release                                        │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│ 1. Read git tags: eslint-plugin@0.2.1                  │
│ 2. Scan commits since 0.2.1                            │
│ 3. Find: "fix: optimize..." → patch bump               │
│ 4. Calculate: 0.2.1 → 0.2.2                            │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│ UPDATE: package.json                                    │
│   "version": "0.2.2"                                   │
│                                                         │
│ UPDATE: CHANGELOG.md                                    │
│   ## 0.2.2 (2025-11-02)                               │
│   ### 🩹 Fixes                                         │
│   - optimize ESLint rule messages...                   │
│                                                         │
│ CREATE: Git commit                                      │
│   chore(release): 0.2.2                                │
│   [package.json, CHANGELOG.md]                         │
│                                                         │
│ CREATE: Git tag                                         │
│   eslint-plugin@0.2.2                                  │
│                                                         │
│ PUSH: To GitHub                                         │
│   Commits + Tags                                        │
│                                                         │
│ PUBLISH: To NPM                                         │
│   @forge-js/eslint-plugin-llm-optimized@0.2.2         │
└─────────────────────────────────────────────────────────┘
           ↓
        ✅ DONE!
```

---

## 🔍 Before vs After

### BEFORE Release
```
✗ package.json: 0.2.1
✗ CHANGELOG.md: No entry for 0.2.2
✗ Git tag: eslint-plugin@0.2.1 (latest)
✗ NPM: Version 0.2.1 (latest)
```

### AFTER `pnpm nx release`
```
✓ package.json: 0.2.2 (updated)
✓ CHANGELOG.md: New 0.2.2 entry (generated)
✓ Git tag: eslint-plugin@0.2.2 (new!)
✓ Git commit: chore(release): 0.2.2 (new!)
✓ NPM: Version 0.2.2 (published!)
```

---

## ⚠️ Important Notes

### DO:
- ✅ Always run `--dry-run` first
- ✅ Use conventional commit types
- ✅ Let Nx calculate the version
- ✅ Make sure you're on the right branch

### DON'T:
- ❌ Manually edit package.json version
- ❌ Manually create git tags
- ❌ Use non-conventional commit messages
- ❌ Run release from detached HEAD

---

## 📞 Quick Reference

```bash
# Preview (SAFE - no changes)
pnpm nx release --dry-run

# Release everything
pnpm nx release

# Release one package
pnpm nx release --projects=eslint-plugin

# Release and publish only (skip versioning)
pnpm nx release publish

# Force specific version
pnpm nx release --version=patch
pnpm nx release --version=minor
pnpm nx release --version=major
```

---

## 🎓 Why This Approach?

1. **Automatic**: No manual version management
2. **Safe**: `--dry-run` lets you preview
3. **Traceable**: Full git history of releases
4. **Consistent**: Same process everywhere
5. **Semantic**: Versions mean something (semver)

---

**Status**: Ready to release! 🚀

For full details, see: `NX_RELEASE_VERSION_GUIDE.md`
