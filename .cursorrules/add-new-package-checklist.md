---
description: Complete checklist for adding new packages to the forge-js monorepo
globs:
  - 'packages/**/package.json'
  - 'packages/**/project.json'
  - '.github/workflows/release*.yml'
  - 'nx.json'
alwaysApply: true
---

# 📦 Adding a New Package Checklist

> **Purpose:** Ensure all new packages are properly integrated, configured, and released following project standards.

**⚠️ CRITICAL:** When adding a new package to the forge-js monorepo, you MUST complete ALL items in this checklist. Missing any item will cause issues in the release process.

When adding a new package to this monorepo, **ALWAYS** follow this checklist:

## 1. Package Structure Setup

- [ ] Create package directory: `packages/<package-name>/`
- [ ] Create `package.json` with correct `name` field
- [ ] Create `project.json` for Nx configuration
- [ ] Create `tsconfig.json` (or copy from similar package)
- [ ] Create `README.md` with package documentation
- [ ] Create `CHANGELOG.md` (if package will be published)
- [ ] Add `LICENSE` file (copy from root or another package)

## 2. Nx Configuration

- [ ] Add package to `nx.json` → `release.projects` array:
  ```json
  "release": {
    "projects": [
      "packages/<package-name>",
      // ... existing packages
    ]
  }
  ```
- [ ] Verify `project.json` has correct `name` field matching directory name
- [ ] Configure build/test targets in `project.json` if needed

## 3. Release Workflow Configuration ⚠️ **CRITICAL**

**Determine if package is SCOPED or UNscoped:**

### For SCOPED Packages (`@forge-js/*`):

- [ ] Add to `.github/workflows/release.yml`:
  - Find `SCOPED_PROJECTS` variable (appears in multiple places)
  - Add project name to the list: `SCOPED_PROJECTS="eslint-plugin,eslint-plugin-utils,cli,<new-package>"`
  - Update in ALL locations:
    - Version preparation step (around line 250)
    - Publish step (around line 573)
    - Dry-run step (around line 675)
  - Update workflow documentation at top of file (around line 8) listing the new package
- [ ] Verify `scope: "@forge-js"` is set in `setup-node@v6` step (around line 153)
- [ ] Package will use **Trusted Publishing (OIDC)**

### For UNscoped Packages (`eslint-plugin-*` or similar):

- [ ] Add to `.github/workflows/release-unscoped.yml`:
  - Find `UNSCOPED_PROJECTS` variable (appears in multiple places)
  - Add project name to the list: `UNSCOPED_PROJECTS="eslint-plugin-llm,eslint-plugin-mcp,eslint-plugin-llm-optimized,eslint-plugin-mcp-optimized,<new-package>"`
  - Update in ALL locations:
    - Version preparation step (around line 114)
    - Publish step (around line 137)
    - Dry-run step (around line 159)
  - Update workflow documentation at top of file (around line 8) listing the new package
- [ ] Verify NO scope is set in `setup-node@v6` step (around line 63)
- [ ] Package will use **NPM_TOKEN (Granular Access Token)**

## 4. Package.json Configuration

- [ ] Set correct `name` field:
  - Scoped: `"@forge-js/<package-name>"`
  - Unscoped: `"<package-name>"`
- [ ] Set `version` to `"0.0.0"` (or appropriate starting version)
- [ ] Add `publishConfig` if publishing:
  ```json
  "publishConfig": {
    "access": "public"
  }
  ```
- [ ] Add repository links:
  ```json
  "repository": {
    "type": "git",
    "url": "git+https://github.com/ofri-peretz/forge-js.git",
    "directory": "packages/<package-name>"
  }
  ```
- [ ] Add `homepage` and `bugs` URLs
- [ ] Configure `files` array for published files
- [ ] Set `engines.node` if needed

## 5. TypeScript Configuration

- [ ] Create `tsconfig.json` (copy from similar package)
- [ ] Update `tsconfig.base.json` paths if needed
- [ ] Verify TypeScript compilation works: `pnpm nx build <package-name>`

## 6. Testing Setup

- [ ] Create test files (`.test.ts` or `.spec.ts`)
- [ ] Configure test target in `project.json`
- [ ] Add `vitest.config.mts` if needed
- [ ] Verify tests run: `pnpm nx test <package-name>`

## 7. Build Configuration

- [ ] Configure build target in `project.json`
- [ ] Set correct `outputs` in `project.json`
- [ ] Verify build works: `pnpm nx build <package-name>`
- [ ] Check build output in `dist/packages/<package-name>/`

## 8. Documentation

- [ ] Update root `README.md` with new package entry
- [ ] Create package-specific `README.md` with:
  - Installation instructions
  - Usage examples
  - API documentation
  - Configuration options
- [ ] Add package to appropriate section (Scoped vs Unscoped) in root README

## 9. CI/CD Integration

- [ ] Verify package is included in `nx.json` → `release.projects`
- [ ] Test workflow manually:

  ```bash
  # For scoped packages
  gh workflow run release.yml -f dry-run=true

  # For unscoped packages
  gh workflow run release-unscoped.yml -f dry-run=true
  ```

- [ ] Verify package appears in workflow logs

## 10. NPM Publishing Setup

### For Scoped Packages (`@forge-js/*`):

- [ ] Verify Trusted Publishing is configured at: https://www.npmjs.com/org/forge-js/settings/publishing
- [ ] Ensure GitHub repository is listed as Trusted Publisher
- [ ] No NPM_TOKEN needed (uses OIDC)

### For Unscoped Packages:

- [ ] Verify `NPM_TOKEN` secret exists in GitHub repository
- [ ] Token must be Granular Access Token (NOT classic - deprecated)
- [ ] Token must have "Publish packages" permission

## 11. Verification Steps

- [ ] Run: `pnpm nx graph` - verify package appears in dependency graph
- [ ] Run: `pnpm nx run-many -t build --all` - verify package builds
- [ ] Run: `pnpm nx run-many -t test --all` - verify package tests pass
- [ ] Run: `pnpm nx run-many -t lint --all` - verify package lints
- [ ] Check: `pnpm nx release --dry-run` - verify package is detected

## 12. First Release

- [ ] Create initial commit with package
- [ ] Use conventional commit: `feat: add <package-name> package`
- [ ] Run release workflow (dry-run first):

  ```bash
  # Scoped
  gh workflow run release.yml -f dry-run=true

  # Unscoped
  gh workflow run release-unscoped.yml -f dry-run=true
  ```

- [ ] Verify package appears in release preview
- [ ] Run actual release when ready

---

## 🎯 Package Type Decision Tree

```
Is package name prefixed with @forge-js/?
│
├─ YES → SCOPED Package
│   ├─ Use: release.yml workflow
│   ├─ Add to: SCOPED_PROJECTS variable
│   ├─ Auth: Trusted Publishing (OIDC)
│   └─ Scope: @forge-js (set in setup-node@v6)
│
└─ NO → UNscoped Package
    ├─ Use: release-unscoped.yml workflow
    ├─ Add to: UNSCOPED_PROJECTS variable
    ├─ Auth: NPM_TOKEN (Granular Access Token)
    └─ Scope: NONE (not set in setup-node@v6)
```

## 📋 Current Package List

### Scoped Packages (`@forge-js/*`)

- `eslint-plugin` → `@forge-js/eslint-plugin-llm-optimized`
- `eslint-plugin-utils` → `@forge-js/eslint-plugin-utils`
- `cli` → `@forge-js/cli`

### Unscoped Packages

- `eslint-plugin-llm`
- `eslint-plugin-mcp`
- `eslint-plugin-llm-optimized`
- `eslint-plugin-mcp-optimized`

## ⚠️ Common Mistakes to Avoid

- ❌ **Forgetting to add package to release workflow** - Package won't be published!
- ❌ **Adding scoped package to unscoped workflow** - Will fail with 404
- ❌ **Adding unscoped package to scoped workflow** - Will fail with 404
- ❌ **Not updating SCOPED_PROJECTS/UNSCOPED_PROJECTS in all locations** - Some steps will fail
- ❌ **Missing package in nx.json → release.projects** - Nx won't detect it
- ❌ **Wrong package name format** - Scoped vs unscoped mismatch

## 🔍 Verification Commands

```bash
# Check if package is in nx.json
grep -A 10 "release" nx.json | grep "<package-name>"

# Check if package is in scoped workflow
grep "SCOPED_PROJECTS" .github/workflows/release.yml | grep "<package-name>"

# Check if package is in unscoped workflow
grep "UNSCOPED_PROJECTS" .github/workflows/release-unscoped.yml | grep "<package-name>"

# Verify package structure
ls -la packages/<package-name>/

# Test build
pnpm nx build <package-name>

# Test release detection
pnpm nx release --dry-run
```

## 📚 Related Documentation

- [Nx Release Documentation](https://nx.dev/recipes/nx-release)
- [npm Package Publishing](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Trusted Publishing Setup](./.github/TRUSTED_PUBLISHING_SETUP.md)
- [Release Workflows](./.github/workflows/release.yml)
