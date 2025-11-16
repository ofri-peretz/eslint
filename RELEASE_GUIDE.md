# Release Preparation Guide

## Current Status

✅ **Tests are now passing** - Fixed Vitest path resolution issue

## Step-by-Step Release Process

### 1. Commit Current Changes

You have uncommitted changes that need to be committed with conventional commit messages:

```bash
# Review what changed
git status

# Stage and commit with conventional commit format
git add .
git commit -m "feat(eslint-plugin): migrate all rules to use formatLLMMessage utility

- Add formatLLMMessage and MessageIcons from eslint-plugin-utils
- Update all 20+ ESLint rules to use centralized message formatting
- Fix Vitest configuration to resolve TypeScript path aliases
- Ensure consistent LLM-optimized error messages across all rules"
```

### 2. Check What Will Be Released

```bash
# Dry-run to see what versions would be calculated
pnpm nx release version --dry-run
```

This will show:

- Which packages have changes
- What version bump each package will get (patch/minor/major)
- Based on conventional commit types (feat, fix, BREAKING CHANGE, etc.)

### 3. Run the Release Version Command

```bash
# This will:
# - Calculate new versions based on conventional commits
# - Update package.json files
# - Generate/update CHANGELOG.md files
# - Create git tags
# - Commit changes
pnpm nx release version
```

### 4. Review the Changes

```bash
# Check what was changed
git status
git diff

# Review the generated changelogs
cat packages/eslint-plugin/CHANGELOG.md
cat packages/eslint-plugin-utils/CHANGELOG.md
```

### 5. Publish (if ready)

```bash
# Build all packages with new versions
pnpm nx run-many -t build --all

# Publish to npm
pnpm nx release publish
```

## Conventional Commit Format

For Nx Release to detect changes, commits must follow this format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

**Types that trigger releases:**

- `feat:` - Minor version bump (1.0.0 → 1.1.0)
- `fix:` - Patch version bump (1.0.0 → 1.0.1)
- `perf:` - Patch version bump
- `BREAKING CHANGE:` or `feat!:` - Major version bump (1.0.0 → 2.0.0)

**Types that DON'T trigger releases:**

- `chore:` - No version bump
- `docs:` - No version bump
- `style:` - No version bump
- `refactor:` - No version bump
- `test:` - No version bump

## Current Uncommitted Changes

Based on `git status`, you have:

- New files: `.cursorrules/eslint-rule-checklist.md`, docs files
- Modified: `eslint.config.mjs`, `vitest.config.mts`, package.json files
- These changes should be committed with a `feat:` or `fix:` message

## Quick Commands Reference

```bash
# 1. Commit changes
git add .
git commit -m "feat(eslint-plugin): migrate rules to formatLLMMessage utility"

# 2. Dry-run release
pnpm nx release version --dry-run

# 3. Run release (updates versions, changelogs, tags)
pnpm nx release version

# 4. Build with new versions
pnpm nx run-many -t build --all

# 5. Publish (when ready)
pnpm nx release publish
```

## Troubleshooting

**If "No changes detected":**

- Ensure commits use conventional commit format
- Check that commits are after the last release tag
- Verify git tags exist: `git tag | grep eslint-plugin`

**If build fails:**

- Run `pnpm nx run-many -t build --all` to see all errors
- Fix any TypeScript or import issues
- Re-run the build
