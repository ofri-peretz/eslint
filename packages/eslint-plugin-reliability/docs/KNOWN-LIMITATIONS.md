# Known False Negatives and False Positives

This document catalogs known limitations in reliability rules.

## Error Handling Rules

### `no-unhandled-promises`

**Known False Negatives (Not Detected)**

- Promises created in callbacks
- Async iterators without error handling
- Promise.all with partial error handling

**Known False Positives (Incorrectly Flagged)**

- Fire-and-forget patterns (intentional)
- Promises handled by global error boundary
- Test utilities that handle errors internally

---

### `require-error-cause`

**Known False Negatives (Not Detected)**

- Errors thrown from helper functions
- Errors created dynamically

**Known False Positives (Incorrectly Flagged)**

- Root-level errors (nothing to wrap)
- Validation errors (no cause needed)

---

### `no-swallowed-errors`

**Known False Negatives (Not Detected)**

- Errors logged but not re-thrown (may be intentional)
- Errors stored in state for later handling

**Known False Positives (Incorrectly Flagged)**

- Intentional error suppression with logging
- Fallback patterns that handle errors gracefully

---

## Type Safety Rules

### `no-unsafe-type-assertion`

**Known False Negatives (Not Detected)**

- Assertions in generic functions
- Assertions via helper utilities

**Known False Positives (Incorrectly Flagged)**

- Type assertions after runtime validation
- Assertions in migration code (legacy to TS)

---

### `no-any-parameters`

**Known False Negatives (Not Detected)**

- `any` through generics defaulting to any
- `any` from untyped dependencies

**Known False Positives (Incorrectly Flagged)**

- Generic utility functions (intentionally flexible)
- Interop with dynamic runtime values

---

## Runtime Safety Rules

### `require-null-checks`

**Known False Negatives (Not Detected)**

- Nullability handled in parent function
- Values guaranteed non-null by business logic

**Known False Positives (Incorrectly Flagged)**

- Values checked by TypeScript's strict null checks
- Values from trusted sources

---

### `no-unsafe-array-access`

**Known False Negatives (Not Detected)**

- Array access through spread operators
- Indirect access via variables

**Known False Positives (Incorrectly Flagged)**

- Arrays with guaranteed length
- Access after explicit length check

---

## Mitigation Strategies

1. **TypeScript Strict Mode**: Enable `strictNullChecks`
2. **Error Boundaries**: Implement global error handling
3. **Testing**: Add runtime tests for edge cases
