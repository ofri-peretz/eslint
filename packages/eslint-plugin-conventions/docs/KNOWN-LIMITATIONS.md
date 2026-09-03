# Known False Negatives and False Positives

This document catalogs known limitations in conventions rules.

## Naming & Style Rules

### `filename-case`

**Known False Negatives (Not Detected)**

- Files generated at build time with wrong casing
- Symbolic links with different casing

**Known False Positives (Incorrectly Flagged)**

- Framework-required filenames (e.g., `README.md`, `Dockerfile`)
- Config files that must match external tool expectations
- Files imported from libraries requiring specific names

---

### `consistent-existence-index-check`

**Known False Negatives (Not Detected)**

- Custom hasOwnProperty implementations
- Checks using `Reflect.has()`
- Existence checks via try-catch on property access

**Known False Positives (Incorrectly Flagged)**

- Intentional use of `in` for prototype chain checks
- Cases where `hasOwnProperty` is needed for objects without prototype

---

## Code Quality Rules

### `no-console-spaces`

**Known False Negatives (Not Detected)**

- Spaces in console output from concatenated variables
- Spaces in template literal expressions

**Known False Positives (Incorrectly Flagged)**

- Intentional formatting with leading/trailing spaces
- Multi-line console output that requires spacing

---

### `no-commented-code`

**Known False Negatives (Not Detected)**

- Code in multi-line comments with heavy formatting
- Code in documentation blocks that aren't JSDoc
- Minified code in comments

**Known False Positives (Incorrectly Flagged)**

- Pseudocode in comments for explanation
- Code examples in documentation
- Configuration examples in comments

---

### `prefer-code-point`

**Known False Negatives (Not Detected)**

- `charCodeAt` used with proper surrogate pair handling
- Code points accessed through third-party libraries

**Known False Positives (Incorrectly Flagged)**

- Legacy code that intentionally uses UTF-16 code units
- Interop with APIs that expect UTF-16 values

---

### `prefer-dom-node-text-content`

**Known False Negatives (Not Detected)**

- `innerText` accessed through bracket notation
- DOM text accessed through library abstractions

**Known False Positives (Incorrectly Flagged)**

- Intentional use of `innerText` for visible text only
- Cases where CSS-styled visibility matters

---

### `expiring-todo-comments`

**Known False Negatives (Not Detected)**

- TODOs in non-standard comment formats
- Expiration dates in different date formats

**Known False Positives (Incorrectly Flagged)**

- TODOs that are intentionally long-term
- Date references that aren't expiration dates

---

### `prefer-dependency-version-strategy`

**Known False Negatives (Not Detected)**

- Version constraints in lockfiles
- Versions in monorepo workspace protocols

**Known False Positives (Incorrectly Flagged)**

- Intentionally pinned versions for security
- Workspace-relative versions

---

## Deprecation Rules

### `no-deprecated-api`

**Known False Negatives (Not Detected)**

- Deprecated APIs from third-party libraries
- Custom deprecated markers
- Runtime deprecation warnings

**Known False Positives (Incorrectly Flagged)**

- APIs with the same name that aren't deprecated
- Polyfills for deprecated browser APIs

---

## Mitigation Strategies

1. **Prettier Integration**: Use Prettier for consistent formatting
2. **EditorConfig**: Define shared editor settings
3. **Pre-commit Hooks**: Catch convention violations early
4. **Documentation**: Document project-specific exceptions
