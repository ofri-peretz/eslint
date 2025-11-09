# 📦 Manual Publish Workflow Guide

## Overview

The **Manual Publish Workflow** (`publish-manual.yml`) provides complete control over the release and publishing process with three independent, controllable steps:

1. **✅ CI Validation** - Run tests and builds to ensure code quality
2. **📝 Prepare Release** - Update versions, changelogs, and create a PR
3. **🚀 Publish to NPM** - Push packages to NPM registry

Each step can be run independently, skipped, or combined based on your needs.

---

## Quick Start

### Scenario 1: Full Release (Recommended First Time)

**Goal:** Run everything end-to-end

**Steps:**

1. Go to: [GitHub Actions → Manual Publish](../../actions/workflows/publish-manual.yml)
2. Click **"Run workflow"**
3. Set parameters:
   - `run-ci`: ✅ **true** (always validate first)
   - `prepare-version`: ✅ **true** (create release PR)
   - `publish-packages`: ❌ **false** (don't publish yet)
   - `version-specifier`: `auto` (use conventional commits)
   - `dist-tag`: `latest`
   - `dry-run`: ✅ **true** (preview first)
4. Click **"Run workflow"**
5. Review the results
6. If everything looks good, re-run with `dry-run: false`

---

### Scenario 2: Quick Dry-Run Preview

**Goal:** See what would be released without making changes

**Parameters:**

- `run-ci`: ✅ **true**
- `prepare-version`: ✅ **true**
- `publish-packages`: ❌ **false**
- `dry-run`: ✅ **true**

**Result:** Preview changes without modifying git or NPM

---

### Scenario 3: Publish After Manual Prepare

**Goal:** Skip CI and prepare, just publish to NPM

**Use when:** You've already run preparation and reviewed the PR

**Parameters:**

- `run-ci`: ❌ **false** (skip validation)
- `prepare-version`: ❌ **false** (already prepared)
- `publish-packages`: ✅ **true** (do publish)
- `dry-run`: ❌ **false** (actually publish)

---

### Scenario 4: Beta/Canary Release

**Goal:** Release a pre-release version

**Parameters:**

- `run-ci`: ✅ **true**
- `prepare-version`: ✅ **true**
- `publish-packages`: ❌ **false** (review PR first)
- `version-specifier`: `prerelease`
- `dist-tag`: `beta` or `canary`
- `dry-run`: ✅ **true** (preview)

---

## Parameter Guide

### Control Flow Options

| Parameter          | Type    | Default | Description                                       |
| ------------------ | ------- | ------- | ------------------------------------------------- |
| `run-ci`           | boolean | `true`  | Run tests, linting, and builds before release     |
| `prepare-version`  | boolean | `true`  | Prepare version and create PR with changes        |
| `publish-packages` | boolean | `false` | Publish to NPM registry (explicit safety default) |

**Safety Note:** `publish-packages` defaults to `false` to prevent accidental publishing. You must explicitly enable it.

---

### Version Strategy

| Option       | Description                                | Use Case                           |
| ------------ | ------------------------------------------ | ---------------------------------- |
| `auto`       | Use conventional commits to determine bump | Recommended for automated releases |
| `major`      | Bump major version (breaking changes)      | Major releases                     |
| `minor`      | Bump minor version (features)              | Feature releases                   |
| `patch`      | Bump patch version (bug fixes)             | Patch releases                     |
| `premajor`   | Prerelease for major                       | Alpha/beta majors                  |
| `preminor`   | Prerelease for minor                       | Alpha/beta features                |
| `prepatch`   | Prerelease for patch                       | Alpha/beta patches                 |
| `prerelease` | Bump prerelease version                    | Continue pre-release               |

---

### Distribution Tags

| Tag      | NPM Behavior               | Use Case              |
| -------- | -------------------------- | --------------------- |
| `latest` | Default version installed  | Stable releases       |
| `next`   | Next major version preview | Upcoming features     |
| `beta`   | Testing pre-release        | Beta testing          |
| `rc`     | Release candidate          | Pre-release candidate |
| `alpha`  | Early pre-release          | Very early testing    |
| `canary` | Cutting-edge unstable      | Continuous testing    |

---

### Dry-Run Mode

| Setting | Behavior                                     |
| ------- | -------------------------------------------- |
| `true`  | Preview changes without modifying git or NPM |
| `false` | Actually commit changes and publish          |

**Best Practice:** Always run with `dry-run: true` first to review changes.

---

## Job Dependencies & Flow

```
run-ci (optional)
    ↓
    ├─→ prepare-version (optional, depends on run-ci if enabled)
    │       ↓
    └─→ publish-packages (optional, depends on both above if enabled)
```

### Key Points

- Jobs **only run if their condition is met**
- `prepare-version` skips its CI validation if `run-ci: false`
- `publish-packages` skips checks if previous steps are disabled
- Jobs **fail fast** if prerequisites fail

---

## Workflow Examples

### Example 1: Complete Release Process

```
1. User clicks "Run workflow"
2. Sets: run-ci=true, prepare-version=true, publish-packages=false, dry-run=true
3. Workflow runs:
   - validate-ci ✅ (all tests pass)
   - prepare-release ✅ (PR created, no changes committed due to dry-run)
4. User reviews job logs and results
5. User re-runs with dry-run=false
6. prepare-release runs again, commits changes and creates PR
7. User reviews and merges the PR on GitHub
8. User runs workflow again with:
   - run-ci=false, prepare-version=false, publish-packages=true, dry-run=false
9. publish job runs and publishes to NPM
```

### Example 2: Skip CI (Already Tested)

```
User is confident code is ready, skips CI:
- run-ci=false (skip tests)
- prepare-version=true (do prepare)
- publish-packages=false (review PR first)
- dry-run=true (preview)
```

### Example 3: Publish Only (Already Prepared)

```
User already created release PR, now wants to publish:
- run-ci=false (skip)
- prepare-version=false (already done)
- publish-packages=true (publish now)
- dry-run=false (actually publish)
- dist-tag=latest
```

---

## Troubleshooting

### Issue: "Job failed - needs validation passed but was skipped"

**Cause:** You disabled `run-ci` but left `prepare-version` enabled, and it needs CI results

**Solution:** Either:

1. Enable `run-ci: true`, OR
2. Disable both `run-ci` and `prepare-version`, only doing `publish-packages`

---

### Issue: "No changes published"

**Cause:** Likely you ran with `dry-run: true`

**Solution:** Check workflow logs. If changes look good, re-run with `dry-run: false`

---

### Issue: "Nx release version: Unknown argument: skipPublish"

**Status:** ✅ **FIXED** - This was the original bug, now uses correct `--dry-run` flag

---

## Best Practices

1. **Always dry-run first**: Use `dry-run: true` to preview before actual changes
2. **Review PRs before publishing**: Use the prepared PR as a checklist
3. **Use conventional commits**: Keep `version-specifier: auto` for consistency
4. **Test independently**: Run `run-ci: true` at least once before preparing
5. **Document pre-releases**: Add notes when using beta/canary tags
6. **Archive results**: Save workflow summaries for audit trail

---

## Integration with CI Workflow

This workflow uses the **same setup and structure as `ci.yml`**:

- ✅ Same Node.js and pnpm versions
- ✅ Same caching strategy
- ✅ Same test and build commands
- ✅ Same parallel execution settings

This ensures **consistency between CI and release workflows**.

---

## Related Files

- **Workflow file:** `.github/workflows/publish-manual.yml`
- **Prepare-only workflow:** `.github/workflows/prepare-release.yml` (legacy)
- **CI workflow:** `.github/workflows/ci.yml` (for reference)
- **Nx config:** `nx.json` (release configuration)

---

## Questions?

If you encounter issues:

1. Check the **workflow run logs** on GitHub Actions
2. Review the **step summaries** for each job
3. Check **Nx documentation** for `nx release` flags
4. Open an issue with workflow logs attached

---

**Last Updated:** November 8, 2025  
**Status:** ✅ Production Ready
