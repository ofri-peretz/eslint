---
type: orchestrator
name: Release Pipeline
agents:
  - eslint
  - release-manager
---

# Release Pipeline Orchestrator

Multi-step orchestration for releasing npm packages.

## Usage

```
/pipeline release: Release eslint-plugin-pg version 1.0.1
```

## Pipeline Steps

### Step 1: Pre-release Verification

// turbo

```bash
npx turbo run lint --filter=<package>
```

// turbo

```bash
npx turbo run test --filter=<package>
```

### Step 2: Version Bump

```bash
gh workflow run release.yml --ref main -f dry-run=true
```

**Expected**: User selects semantic version (patch/minor/major)

### Step 3: Changelog Review

After version bump:

1. Review generated CHANGELOG.md changes
2. Verify version number in package.json
3. Commit changes if not auto-committed

### Step 4: Publish to npm

```bash
nx release publish <package>
```

**Expected**: User provides 2FA OTP when prompted

### Step 5: Push to GitHub

// turbo

```bash
git push origin main --follow-tags
```

## Rollback Procedure

If publish fails:

```bash
# Reset version bump
git reset --hard HEAD~1

# Delete local tag
git tag -d v<version>
```

## Package-Specific Notes

### eslint-plugin-secure-coding

- Currently at v2.2.x
- 89 rules, 8 OWASP categories

### eslint-plugin-pg

- Currently at v1.0.x
- 13 rules for PostgreSQL

### eslint-plugin-vercel-ai-security

- AI-focused security rules
