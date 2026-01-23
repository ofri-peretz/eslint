# Design: Unified Release Pipeline Architecture

**Status**: ✅ Implemented
**Author**: Antigravity Pipeline
**Date**: 2025-12-30

---

## 🎯 Objective

A robust, deadlock-free release pipeline that:

1. Releases **all affected packages** with a single click (respecting dependency order)
2. Allows **single package releases** when needed
3. Prevents **deadlocks** from git tag / npm registry misalignment
4. Respects **package dependencies** (devkit released first)
5. Is **Trusted Publishers ready** for passwordless OIDC publishing
6. Releases patches **on any change** (including docs)

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      release.yml (Unified)                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  📦 Package Selector                                        │ │
│  │  ├── all-affected (default) - releases all changed pkgs    │ │
│  │  ├── eslint-devkit (released FIRST - dependency order)     │ │
│  │  └── [14 more packages...]                                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  🔍 Detect Affected                                         │ │
│  │  Uses Nx --affected to find changed packages               │ │
│  │  Compares against last git tag                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  🚀 Sequential Release Loop                                 │ │
│  │  For each package (devkit ALWAYS first):                   │ │
│  │   → Tag Reconciliation (deadlock prevention)               │ │
│  │   → CI Validation (test, build, typecheck)                 │ │
│  │   → Version Bump (conventional commits + patch fallback)   │ │
│  │   → Build Package                                          │ │
│  │   → Generate Changelog (GitHub Release)                    │ │
│  │   → Git Push (source of truth - BEFORE npm)               │ │
│  │   → NPM Publish (with provenance)                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Deadlock Prevention Strategy

### The 5 Failure Modes & Mitigations

| #   | Failure Mode           | Symptom                               | Mitigation                       |
| --- | ---------------------- | ------------------------------------- | -------------------------------- |
| 1   | **Orphaned Tag**       | Git tag exists but npm publish failed | Auto-cleanup before version bump |
| 2   | **NPM Ahead**          | Package on npm but tag missing        | Skip + warn (idempotent)         |
| 3   | **Race Condition**     | Concurrent releases                   | `concurrency` group blocks       |
| 4   | **Stale Checkout**     | Push fails due to upstream changes    | `git pull --rebase` before push  |
| 5   | **Auto-Version Empty** | Conventional commits yield no bump    | Fallback to `patch`              |

### Tag Reconciliation Algorithm

```
For each package:
  1. Get current version from package.json
  2. Check if git tag exists for this version
  3. Check if npm has this version published

  Decision Matrix:
  ┌────────────┬────────────┬─────────────────────────────────┐
  │ Git Tag    │ NPM        │ Action                          │
  ├────────────┼────────────┼─────────────────────────────────┤
  │ Exists     │ Exists     │ ✅ Skip (already released)      │
  │ Exists     │ Missing    │ 🧹 Delete tag (orphaned)        │
  │ Missing    │ Exists     │ ⚠️ Warn, bump will create new   │
  │ Missing    │ Missing    │ ✅ Proceed normally             │
  └────────────┴────────────┴─────────────────────────────────┘
```

### Dependency Order

When `all-affected` is selected, packages are released in this order:

1. **@interlace/eslint-devkit** (ALWAYS FIRST - other packages depend on it)
2. eslint-plugin-secure-coding
3. eslint-plugin-crypto
4. eslint-plugin-jwt
5. eslint-plugin-pg
6. eslint-plugin-express-security
7. eslint-plugin-nestjs-security
8. eslint-plugin-browser-security
9. eslint-plugin-lambda-security
10. eslint-plugin-vercel-ai-security
11. eslint-plugin-architecture
12. eslint-plugin-quality
13. eslint-plugin-react-a11y
14. eslint-plugin-react-features
15. eslint-plugin-import-next
16. @interlace/cli

---

## 📁 File Structure

```
.github/workflows/
├── release.yml    # Unified release workflow (all logic here)
├── ci-pr.yml      # PR validation
├── lint-pr.yml    # PR linting
└── codecov.yml    # Coverage reporting
```

---

## 🔧 Workflow Inputs

| Input                | Type    | Default        | Description                          |
| -------------------- | ------- | -------------- | ------------------------------------ |
| `package`            | choice  | `all-affected` | Package to release (or all affected) |
| `version-specifier`  | choice  | `auto`         | Version bump strategy                |
| `dist-tag`           | choice  | `latest`       | npm dist-tag                         |
| `run-ci`             | boolean | `true`         | Run validation before publish        |
| `dry-run`            | boolean | `false`        | Preview mode                         |
| `force-version`      | string  | `""`           | Override version explicitly          |
| `generate-changelog` | boolean | `true`         | Create GitHub release                |

---

## 🚀 Usage

### Release All Affected Packages

1. Go to **Actions** → **Release Package** → **Run workflow**
2. Keep `package` as `all-affected` (default)
3. Configure version strategy (`auto`, `patch`, `minor`, `major`)
4. Click **Run workflow**

The workflow will:

- Detect which packages have changes since last release
- Release them sequentially (devkit first)
- Skip already-released versions
- Report summary of all releases

### Release Single Package

1. Go to **Actions** → **Release Package** → **Run workflow**
2. Select specific package from dropdown
3. Configure options
4. Click **Run workflow**

### Dry Run (Preview)

1. Enable **dry-run** checkbox
2. Run workflow
3. Review what would be released (no changes made)

---

## 🔑 Trusted Publishers Migration Path

**Current**: NPM_TOKEN (Granular Access Token)

**Future**: GitHub OIDC (Trusted Publishers)

### Preparation (Already Done)

- [x] `id-token: write` permission set in workflow
- [x] `environment: production` specified for release job
- [x] `NPM_CONFIG_PROVENANCE: true` enabled

### When Ready to Migrate

1. Configure each package on npmjs.com:
   - Provider: GitHub Actions
   - Owner: `ofri-peretz`
   - Repo: `eslint`
   - Workflow: `release.yml`
   - Environment: `production`

2. Remove `NPM_TOKEN` from workflow (OIDC handles auth automatically)

---

## 📊 Summary Output

Each release generates a GitHub Actions summary with:

- ✅ Released packages (with versions)
- ⏭️ Skipped packages (already released)
- ❌ Failed packages (if any)
