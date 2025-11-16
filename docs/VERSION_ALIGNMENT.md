# Version Alignment Guide

This guide explains how to keep package versions aligned across `package.json`, `pnpm-lock.yaml`, git tags, and published npm packages.

## Quick Check

Run this command to check if all versions are aligned:

```bash
pnpm check-versions
# or
pnpm nx check-version-alignment
```

## Version Alignment Checklist

When updating package versions, ensure these are all in sync:

1. ✅ **package.json** - The source of truth for version
2. **pnpm-lock.yaml** - Updated via `pnpm install`
3. **Git tags** - Created/updated via `pnpm sync-tags`
4. **Published npm packages** - Should match package.json

## Common Workflows

### Workflow 1: Publishing a New Version

```bash
# 1. Update version in package.json (or use nx release)
# 2. Install to update lockfile
pnpm install

# 3. Build and test
pnpm nx build <project>

# 4. Verify alignment
pnpm check-versions

# 5. Sync git tags (if publishing manually)
pnpm sync-tags

# 6. Publish
pnpm nx run <project>:publish
```

### Workflow 2: Using Nx Release (Recommended)

```bash
# 1. Preview what will be released
pnpm nx release version --dry-run

# 2. Create version, changelog, and tags
pnpm nx release version

# 3. Install to update lockfile
pnpm install

# 4. Verify alignment
pnpm check-versions

# 5. Publish
pnpm nx release publish
```

### Workflow 3: Fixing Misaligned Versions

```bash
# 1. Check current state
pnpm check-versions

# 2. Update package.json to desired version
# (edit manually or use nx release)

# 3. Update lockfile
pnpm install

# 4. Sync git tags if needed
pnpm sync-tags

# 5. Verify
pnpm check-versions
pnpm nx lint <project>  # Should pass @nx/dependency-checks
```

## ESLint Rule: @nx/dependency-checks

The `@nx/dependency-checks` rule automatically validates that:

- Dependencies in `package.json` match what's in `pnpm-lock.yaml`
- Version specifiers are correct

This rule runs automatically when you lint:

```bash
pnpm nx lint <project>
```

## Git Tags Sync

Git tags are used by Nx Release to determine current versions. If you publish manually, sync tags:

```bash
# Preview what tags would be created
pnpm sync-tags:dry-run

# Create/update tags to match package.json versions
pnpm sync-tags
```

## Troubleshooting

### Issue: ESLint complains about version mismatch

**Error:** `The version specifier does not contain the installed version`

**Solution:**

```bash
# Update package.json to match lockfile, or vice versa
pnpm install  # Updates lockfile to match package.json
```

### Issue: Git tags are out of sync

**Error:** `Nx release` resolves wrong version from git tags

**Solution:**

```bash
# Sync tags with current package.json versions
pnpm sync-tags
```

### Issue: Published version doesn't match package.json

**Solution:**

1. Check what's published: `npm view <package> version`
2. Update package.json if needed
3. Publish new version: `pnpm nx run <project>:publish`

## Best Practices

1. **Always use Nx Release** for versioning when possible
   - Automatically creates git tags
   - Updates changelogs
   - Handles dependencies

2. **Run checks before committing**

   ```bash
   pnpm check-versions
   pnpm nx lint
   ```

3. **Keep lockfile in sync**
   - Always run `pnpm install` after changing package.json
   - Commit `pnpm-lock.yaml` changes

4. **Verify before publishing**
   ```bash
   pnpm check-versions
   pnpm nx lint <project>
   ```

## Related Commands

- `pnpm check-versions` - Check version alignment
- `pnpm sync-tags` - Sync git tags with package.json
- `pnpm sync-tags:dry-run` - Preview tag changes
- `pnpm nx release version --dry-run` - Preview release changes
- `pnpm nx lint` - Run ESLint (includes dependency-checks)
