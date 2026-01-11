# Markdown Content Sync & Compliance Checks

This document summarizes the automated checks and lint rules enforced to ensure markdown content integrity, documentation synchronization, and changelog standard compliance across the repository.

## 1. ESLint Rules

These rules are enforced via the `eslint` task and configured in `eslint.config.mjs`.

| Rule ID                  | Target Files      | Description                                                                                                                                                 | Criticality |
| :----------------------- | :---------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------- |
| `local/changelog-format` | `**/CHANGELOG.md` | Enforces strict header format: `## [version] - YYYY-MM-DD` or `## [Unreleased]`. Ensures the documentation UI parser can correctly extract version history. | **BLOCKER** |

### Fix Violations

```bash
# Run linting to check for formatting issues
pnpm nx lint
```

## 2. Validation Scripts

These scripts are located in `scripts/` and perform deeper content validation and synchronization.

| Script                            | Purpose                                                                                    | When to Run                  |
| :-------------------------------- | :----------------------------------------------------------------------------------------- | :--------------------------- |
| `scripts/check-markdown-links.ts` | Validates that all internal links in markdown files resolve to existing files and anchors. | Pre-commit / CI              |
| `scripts/sync-readme-rules.ts`    | Automatically updates the "Rules" tables in package READMEs based on source code metadata. | After adding/modifying rules |
| `scripts/sync-rule-docs.ts`       | Synchronizes rule documentation files with source code.                                    | After adding/modifying rules |
| `scripts/validate-docs.ts`        | General validation for documentation integrity (metadata, structure).                      | Pre-deployment               |

### Usage

```bash
# Check for broken links
npx tsx scripts/check-markdown-links.ts

# Sync README rule tables
npx tsx scripts/sync-readme-rules.ts

# Validate documentation integrity
npx tsx scripts/validate-docs.ts
```

## 3. Deployment Checklist

Before proceeding to deployment, ensure the following checks pass:

- [ ] **Changelog Compliance**: run `pnpm nx lint` to verify `CHANGELOG.md` formats.
- [ ] **Content Synchronization**: run `npx tsx scripts/sync-readme-rules.ts` to ensure READMEs are up to date.
- [ ] **Link Integrity**: run `npx tsx scripts/check-markdown-links.ts` to prevent 404s in docs.
