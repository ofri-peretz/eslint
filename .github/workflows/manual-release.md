# Release Process

## Option 1: Full Release (Recommended)
```bash
# 1. Version packages, update changelogs, create git tag (but don't publish)
pnpm nx release --skip-publish

# 2. Push changes and tags to trigger CI
git push && git push --tags
```

## Option 2: Version Specific Package
```bash
# Version only the eslint-plugin
pnpm nx release --projects=@forge-js/eslint-plugin --skip-publish

# Push to trigger CI
git push && git push --tags
```

## Option 3: Manual Tag Creation
```bash
# Create a tag manually
git tag eslint-plugin@1.0.0
git push origin eslint-plugin@1.0.0
```
