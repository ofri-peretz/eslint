# Monorepo Release Checklist

This document outlines all requirements for packages in the forge-js monorepo to be included in official releases.

## ✅ Package Requirements

Each package in the monorepo must meet the following criteria to be eligible for release.

### 1. Package Metadata (package.json)

- [x] **name**: Scoped package name (e.g., `@forge-js/package-name`)
- [x] **version**: Valid semantic version (e.g., `0.0.3-rc.20`)
- [x] **description**: Clear, concise description of package purpose
- [x] **author**: Author information with email
- [x] **license**: License type (recommend: MIT)
- [x] **homepage**: Link to repository homepage
- [x] **repository**: Object with type, url, and directory path
- [x] **bugs**: Object with url pointing to issue tracker
- [x] **publishConfig**: `{"access": "public"}` for scoped packages
- [x] **keywords**: Relevant keywords for discoverability
- [x] **engines**: Node version requirement (e.g., `">=18.0.0"`)

### 2. Code Quality

- [x] **TypeScript**: All source code written in TypeScript
- [x] **Compilation**: Builds without errors (`nx build <package>`)
- [x] **Linting**: No eslint errors (`nx lint <package>`)
- [x] **Type Safety**: No implicit `any` types or TS errors
- [x] **Tests**: Package has test suite (if applicable)
- [x] **Test Coverage**: All tests pass (`nx test <package>`)

### 3. Build Output

- [x] **dist/ directory**: Compiled JavaScript and type definitions
- [x] **package.json**: Valid `main` and `types` fields pointing to correct files
  - `main`: Points to compiled JavaScript (e.g., `./src/index.js`)
  - `types`: Points to TypeScript definitions (e.g., `./src/index.d.ts`)
- [x] **Source Maps**: Optionally included for debugging
- [x] **README.md**: Documentation in package root directory

### 4. Dependencies

- [x] **dependencies**: Only production dependencies listed
- [x] **devDependencies**: Build/test tools only
- [x] **peerDependencies**: Specify if package is a plugin (e.g., ESLint plugin)
- [x] **No circular deps**: Packages don't depend on each other circularly
- [x] **Version compatibility**: Pin compatible versions (semver)

### 5. Documentation

- [x] **README.md**: 
  - Purpose and features
  - Installation instructions
  - Basic usage examples
  - Links to full documentation
- [x] **LICENSE**: MIT license file
- [x] **CHANGELOG.md**: Version history and changes

### 6. Git Configuration

- [x] **repository.directory**: Correct path to package in monorepo
- [x] **Homepage**: Points to correct GitHub repository
- [x] **Bugs URL**: Points to issue tracker

### 7. Distribution Tags

Packages use the following npm distribution tags:

| Version Pattern | Tag | Stability |
|-----------------|-----|-----------|
| `X.Y.Z` | `latest` | Stable |
| `X.Y.Z-alpha.N` | `alpha` | Experimental |
| `X.Y.Z-beta.N` | `beta` | Pre-release |
| `X.Y.Z-rc.N` | `rc` | Release Candidate |
| `X.Y.Z-next.N` | `next` | Next version |
| `X.Y.Z-canary.SHA` | `canary` | Development |

**Current Status**: All packages are pre-release (`0.0.3-rc.N`) with `rc` tag.

## 📋 Current Package Status

### @forge-js/eslint-plugin-llm-optimized (v0.0.3-rc.20)

| Requirement | Status | Notes |
|-----------|--------|-------|
| Metadata | ✅ | All fields present and valid |
| Code Quality | ✅ | TypeScript, no errors, all tests pass |
| Build Output | ✅ | Compiled to dist/, types included |
| Dependencies | ✅ | Clean dependency tree |
| Documentation | ✅ | README.md, LICENSE, CHANGELOG.md present |
| Git Config | ✅ | Repository directory configured |
| Ready for Release | ✅ | **YES** |

**Latest Release**: 0.0.3-rc.20 (published)
**Distribution Tag**: rc

### @forge-js/eslint-plugin-utils (v0.0.3-rc.8)

| Requirement | Status | Notes |
|-----------|--------|-------|
| Metadata | ✅ | All fields present and valid |
| Code Quality | ✅ | TypeScript, no errors, no tests needed (utility library) |
| Build Output | ✅ | Compiled to dist/, types included |
| Dependencies | ✅ | Clean peer dependency tree |
| Documentation | ✅ | README.md, LICENSE, CHANGELOG.md present |
| Git Config | ✅ | Repository directory configured |
| Ready for Release | ✅ | **YES** |

**Latest Release**: 0.0.3-rc.8 (published)
**Distribution Tag**: rc

### @forge-js/cli (v0.0.2-rc.0)

| Requirement | Status | Notes |
|-----------|--------|-------|
| Metadata | ✅ | All fields present and valid |
| Code Quality | ✅ | TypeScript, compiled without errors |
| Build Output | ✅ | Compiled to dist/, bin entry point |
| Dependencies | ✅ | Clean dependency tree |
| Documentation | ✅ | README.md, LICENSE present |
| Git Config | ✅ | Repository directory configured |
| Bin Entry | ✅ | `"bin": { "forge": "./bin/forge.js" }` configured |
| Ready for Release | ⏳ | Not currently published |

**Latest Release**: N/A (development)
**Distribution Tag**: N/A

## 🚀 Release Workflow

### Step 1: Pre-release Verification

```bash
# Verify builds
nx run-many --target=build --all

# Run all tests
nx run-many --target=test --all

# Check linting
nx run-many --target=lint --all
```

### Step 2: Version Bump

```bash
# Check what will be bumped (dry-run)
nx release version --dry-run

# Apply version bump
nx release version
```

### Step 3: Publish

```bash
# Check what will be published (dry-run)
nx release publish --dry-run

# Publish to npm
nx release publish
```

### Step 4: Verify Release

```bash
# Check published version on npm
npm view @forge-js/eslint-plugin-llm-optimized@latest

# Verify installation works
npm install @forge-js/eslint-plugin-llm-optimized@latest
```

## 📊 Release History

### Published Releases

- **0.0.3-rc.20**: @forge-js/eslint-plugin-llm-optimized, @forge-js/eslint-plugin-utils (January 16, 2025)
- **0.0.3-rc.19**: @forge-js/eslint-plugin-llm-optimized (January 15, 2025)
- **0.0.3-rc.18**: @forge-js/eslint-plugin-llm-optimized (January 14, 2025)

### Not Yet Released

- **@forge-js/cli**: Currently in development, not included in releases

## 🔍 Quality Metrics

All packages meet the following quality standards:

| Metric | Target | Status |
|--------|--------|--------|
| TypeScript Compilation | 0 errors | ✅ |
| Type Coverage | 95%+ | ✅ |
| Test Pass Rate | 100% | ✅ |
| Linting | 0 errors | ✅ |
| Dependency Security | No vulnerabilities | ✅ |

## 🎯 Roadmap

### Next Steps for Stable Release (1.0.0)

- [ ] Increase test coverage to 80%+
- [ ] Finalize rule implementations
- [ ] Complete API documentation
- [ ] Performance optimization
- [ ] Browser/environment compatibility testing
- [ ] Release 0.0.3 stable
- [ ] Release 1.0.0 stable

### Breaking Changes Policy

- Pre-release versions (0.0.3-rc.N) may have breaking changes
- Stable versions (1.0.0+) will follow semantic versioning strictly
- Breaking changes must be documented in CHANGELOG.md

## 📚 References

- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Nx Release Documentation](https://nx.dev/recipes/node/release)

---

**Last Updated**: January 16, 2025  
**Maintainer**: Ofri Peretz  
**Status**: ✅ All packages ready for release
