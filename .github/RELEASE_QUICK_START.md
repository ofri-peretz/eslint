# 🚀 Release Quick Start

## TL;DR

3 workflows. That's it.

```
PR events         → ci-pr.yml + lint-pr.yml (automatic)
Manual release    → release.yml (you run it)
```

---

## How to Release

### Option 1: Simple (Recommended)
```bash
gh workflow run release.yml
```
✅ Tests pass? → Bump version (auto) → Publish to NPM

### Option 2: Custom Version
```bash
gh workflow run release.yml -f version-specifier=major
```
✅ Major bump instead of auto

### Option 3: Beta Release
```bash
gh workflow run release.yml -f dist-tag=beta
```
✅ Publish to beta tag on NPM

### Option 4: Preview
```bash
gh workflow run release.yml -f dry-run=true
```
✅ See what would happen (no changes)

---

## Parameters Cheat Sheet

| Flag | Values | Default |
|------|--------|---------|
| `-f version-specifier=` | auto, major, minor, patch, prerelease | auto |
| `-f dist-tag=` | latest, beta, rc, alpha, canary, next | latest |
| `-f run-ci=` | true, false | true |
| `-f dry-run=` | true, false | false |

---

## Common Commands

```bash
# Start a release
gh workflow run release.yml

# Check status
gh run list --workflow release.yml

# View logs
gh run view <run-id> --log

# Beta release
gh workflow run release.yml -f dist-tag=beta

# Major version
gh workflow run release.yml -f version-specifier=major

# Preview mode
gh workflow run release.yml -f dry-run=true
```

---

## What It Does

```
1. Validate CI ✅ (tests + build)
2. Prepare Release 📝 (version + changelog)
3. Publish to NPM 🚀 (with your dist-tag)
```

If any step fails, it stops. Safe.

---

## Workflows Summary

| Workflow | Trigger | What |
|----------|---------|------|
| **ci-pr.yml** | PR | Test code |
| **lint-pr.yml** | PR | Lint code |
| **release.yml** | Manual | Release |

---

**Need help?** See `.github/WORKFLOWS_ARCHITECTURE.md`

