# Known False Negatives and False Positives

This document catalogs known limitations in modernization rules.

## ESNext Migration Rules

### `prefer-optional-chaining`

**Known False Negatives (Not Detected)**

- Complex nested conditionals that could use optional chaining
- Ternary expressions that check for nullish values
- Patterns using helper functions like `_.get()`

**Known False Positives (Incorrectly Flagged)**

- Intentional null checks with side effects
- Cases where explicit undefined handling differs from optional chaining

---

### `prefer-nullish-coalescing`

**Known False Negatives (Not Detected)**

- Logical OR (`||`) with falsy value handling that differs from nullish
- Patterns inside ternary expressions

**Known False Positives (Incorrectly Flagged)**

- Intentional falsy value coalescing (empty string, 0, false)
- Legacy browser support requirements (pre-ES2020)

---

### `prefer-object-shorthand`

**Known False Negatives (Not Detected)**

- Method definitions using arrow functions instead of shorthand
- Computed property names that could use shorthand

**Known False Positives (Incorrectly Flagged)**

- Properties that intentionally differ from variable names for clarity
- Properties in configurations that need explicit values

---

## Mitigation Strategies

1. **Codemod Tools**: Use jscodeshift for bulk migrations
2. **Gradual Migration**: Enable as warnings first
3. **Browser Support**: Check caniuse.com before enabling
