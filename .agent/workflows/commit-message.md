---
description: Standards for generating valid commit messages that pass commitlint and husky validation
---

# Commit Message Standards

Before generating any commit message, review and follow these rules to ensure the commit passes all validation hooks.

## Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

## Required Rules

### 1. Type (REQUIRED)

Must be one of the following **lowercase** types:

| Type       | Purpose                                                 |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only changes                              |
| `style`    | Code style (formatting, missing semi-colons, etc)       |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or updating tests                                |
| `build`    | Changes to build system or dependencies                 |
| `ci`       | Changes to CI configuration                             |
| `chore`    | Other changes that don't modify src or test files       |
| `revert`   | Reverts a previous commit                               |

### 2. Scope (OPTIONAL but validated)

- Wrap in parentheses: `feat(eslint-plugin-pg): ...`
- **MUST match Nx project name** exactly (if provided)
- Valid package scopes: `eslint-devkit`, `eslint-plugin-pg`, `eslint-plugin-jwt`, `eslint-plugin-crypto`, etc.
- Special scopes: `ci`, `deps`, `release`, `docs`, `workspace`
- Can be omitted for workspace-wide changes: `chore: update dependencies`

> ⚠️ **CRITICAL**: Use the **full project name** (e.g., `eslint-plugin-pg`), not abbreviations like `pg`.
> Nx Release matches commits by scope to determine version bumps.

### 3. Subject (REQUIRED)

**MUST:**

- Start with **lowercase** letter
- Be present (not empty)
- Follow the colon with a single space: `type: subject`

**MUST NOT:**

- End with a period (`.`)
- Start with uppercase letter
- Use PascalCase or UPPER_CASE

### 4. Colon Format (REQUIRED)

- Must have colon and **single space** after type: `fix: message`
- With scope: `fix(scope): message`
- **NOT:** `fix:message` or `fix : message`

## ✅ Valid Examples

```
feat(crypto): add AES-256 encryption rule
fix(jwt): validate expiry correctly
docs: update README with installation steps
refactor(devkit): simplify AST traversal logic
chore: update dependencies
ci: add codecov integration
test(pg): add edge cases for SQL injection
build: bump vitest to v2.0
perf(import-next): cache module resolution
```

## ❌ Invalid Examples

| Invalid                      | Issue                         | Fixed                       |
| ---------------------------- | ----------------------------- | --------------------------- |
| `Feat: add feature`          | Type must be lowercase        | `feat: add feature`         |
| `feat: Add feature`          | Subject must start lowercase  | `feat: add feature`         |
| `feat: add feature.`         | Subject must not end with `.` | `feat: add feature`         |
| `feat:add feature`           | Missing space after colon     | `feat: add feature`         |
| `feat (crypto): add feature` | No space before parentheses   | `feat(crypto): add feature` |
| `feature: add feature`       | `feature` is not a valid type | `feat: add feature`         |
| `: add feature`              | Missing type                  | `feat: add feature`         |
| `feat:`                      | Missing subject               | `feat: add feature`         |

## Breaking Changes

Two ways to indicate a breaking change:

### 1. Exclamation mark after type/scope (preferred)

```
feat(eslint-plugin-secure-coding)!: remove deprecated rules
```

### 2. BREAKING CHANGE footer

```
feat(api): change authentication flow

BREAKING CHANGE: removed legacy token support
```

Both trigger a **major** version bump in Nx Release.

> ⚠️ **CRITICAL: Nx determines affected projects by FILES CHANGED, not commit scope!**
>
> A commit with `feat(pkg-a)!: breaking change` will only bump `pkg-a` to major if it actually modifies files in `packages/pkg-a/`.
>
> **For breaking change releases:**
>
> 1. The commit MUST modify a file in the target package, OR
> 2. Use `gh workflow run release.yml -f package=<name> -f force-version=major`

## Multi-line Commits

For detailed commits:

```
fix(jwt): handle expired tokens gracefully

Previously, expired tokens would cause an unhandled exception.
Now we catch the error and return a structured response.

Closes #123
```

## Validation Pipeline

Commit messages are validated in this order:

1. **Husky pre-check** (`.husky/commit-msg`): Fast regex checks for common issues
2. **Commitlint** (`commitlint.config.mjs`): Full conventional commit validation

If either fails, the commit is rejected with a helpful error message.

## Version Bump Mapping

The commit type determines the version bump in Nx Release (configured in `nx.json`):

| Type                                  | Version Bump |
| ------------------------------------- | ------------ |
| `feat`                                | **minor**    |
| `fix`, `docs`, `perf`, etc.           | **patch**    |
| `feat!:` or `BREAKING CHANGE:` footer | **major**    |
