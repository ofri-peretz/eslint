# 📦 Adding a New Package Checklist

> **Purpose:** Ensure new packages are properly integrated, configured, and released following project standards.

**⚠️ CRITICAL:** When adding a new package to the eslint monorepo, you MUST complete ALL items below. Missing any item will cause issues at build, test, or release time.

> **Authoritative references:** [`ARCHITECTURE.md`](../../ARCHITECTURE.md), [`docs/QUALITY_STANDARDS.md`](../../docs/QUALITY_STANDARDS.md), [`docs/ESLINT_VERSION_SUPPORT.md`](../../docs/ESLINT_VERSION_SUPPORT.md). If anything in this checklist conflicts with those, those win — update the checklist.

## 1. Package Structure

- [ ] Create `packages/<package-name>/` directory (must match the `apps/* | packages/* | tools/* | benchmarks` workspace globs in root `package.json`)
- [ ] Create `package.json` — see §3 below for required fields
- [ ] Create `tsconfig.json` and `tsconfig.lib.json` (copy from a similar package — `eslint-plugin-pg` is a good template)
- [ ] Create `turbo.json` if the package needs custom build/test config (otherwise root `turbo.json` defaults apply)
- [ ] Create `README.md` following [`docs/QUALITY_STANDARDS.md`](../../docs/QUALITY_STANDARDS.md) §4 (Documentation)
- [ ] Create `CHANGELOG.md` (required for published packages)
- [ ] Add `LICENSE` file (copy from another package)

## 2. Plugin Scope Decision

Apply [`ARCHITECTURE.md` § "Plugin organization"](../../ARCHITECTURE.md#plugin-organization-the-rule-that-decides-where-new-code-goes) — does the rule belong in an existing plugin? If yes, **stop here and add it there.** Only create a new package when no existing plugin fits.

## 3. `package.json` Required Fields

```jsonc
{
  "name": "<package-name>",                          // see §4 for naming rules
  "version": "0.0.0",
  "description": "...",
  "main": "./src/index.js",
  "types": "./src/index.d.ts",
  "publishConfig": { "access": "public" },
  "files": ["src/", "dist/", "README.md", "LICENSE", "CHANGELOG.md"],
  "engines": { "node": ">=18.0.0" },
  "peerDependencies": {
    "eslint": "^8.0.0 || ^9.0.0 || ^10.0.0"        // REQUIRED — see ESLINT_VERSION_SUPPORT.md
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/ofri-peretz/eslint",
    "directory": "packages/<package-name>"
  },
  "homepage": "https://github.com/ofri-peretz/eslint/tree/main/packages/<package-name>#readme",
  "bugs": { "url": "https://github.com/ofri-peretz/eslint/issues" }
}
```

## 4. Package Naming & Publishing

| Naming | Example | Auth at release time |
| :--- | :--- | :--- |
| **Scoped** (`@interlace/<name>`) | `@interlace/eslint-devkit`, `@interlace/eslint-formatter` | Trusted Publishing (OIDC) — no token needed |
| **Unscoped** (`<name>`) | `eslint-plugin-pg`, `eslint-plugin-secure-coding` | `NPM_TOKEN` (Granular Access Token) |

The release workflow detects which path applies based on the package name and publishes accordingly. There is no separate scoped/unscoped workflow file — `release.yml` handles both.

## 5. Build & Test Verification

- [ ] `npx turbo run build --filter=<package-name>` succeeds
- [ ] `npx turbo run test --filter=<package-name>` passes
- [ ] `npx turbo run lint --filter=<package-name>` passes
- [ ] `npx turbo run typecheck --filter=<package-name>` passes (if defined)
- [ ] Coverage ≥ 90% per [`docs/QUALITY_STANDARDS.md`](../../docs/QUALITY_STANDARDS.md) §2

## 6. Repo-Wide Integration

- [ ] Root [`README.md`](../../README.md) Available Packages table includes the new package in the right section (Security / Code Quality / Supporting)
- [ ] [`ARCHITECTURE.md`](../../ARCHITECTURE.md) "Bird's-eye" tree mentions the new package if it's load-bearing
- [ ] [`AGENTS.md`](../../AGENTS.md) Repository Overview table updated if the new package fits the headline plugins

## 7. Pre-Release Verification

- [ ] All checks above pass locally
- [ ] `npm run release:dry-run` (`gh workflow run release.yml --ref main -f dry-run=true`) shows the new package detected
- [ ] First commit follows conventional-commits: `feat: add <package-name> package`

## 8. First Release

- [ ] Verify dry-run output looks correct
- [ ] Trigger real release: `npm run release` (`gh workflow run release.yml --ref main`)
- [ ] Confirm package appears on npm at the expected name
- [ ] Add the npm download badge to the package's README

## ⚠️ Common Mistakes

- ❌ Missing `peerDependencies.eslint: "^8.0.0 || ^9.0.0 || ^10.0.0"` — the policy gate ([`docs/ESLINT_VERSION_SUPPORT.md`](../../docs/ESLINT_VERSION_SUPPORT.md))
- ❌ Wrong scope or name — pick @interlace/* for shared infra, unscoped for plugins, then verify it matches the npm registry expectation
- ❌ Skipping the [`ARCHITECTURE.md` plugin-organization rule](../../ARCHITECTURE.md#plugin-organization-the-rule-that-decides-where-new-code-goes) and creating a new plugin when an existing one already owns the concern
- ❌ Forgetting to add the new package to the root README's package table — viewers can't find it
- ❌ Pushing the first release before the dry-run is clean
