# Known False Negatives and False Positives

This document catalogs known limitations in maintainability rules.

## Complexity Rules

### `cognitive-complexity`

**Known False Negatives (Not Detected)**

- Complexity hidden in helper functions
- Callback-based complexity (callback hell)
- Complexity through method chaining
- Implicit complexity in template engines

**Known False Positives (Incorrectly Flagged)**

- State machines with many cases (inherently complex)
- Parsers and interpreters with necessary branching
- Well-structured switch statements with simple cases

---

### `max-parameters`

**Known False Negatives (Not Detected)**

- Parameters spread from options objects
- React props destructured in function body

**Known False Positives (Incorrectly Flagged)**

- Event handlers with standard signatures
- Callback functions with fixed parameter counts
- API functions that mirror external interfaces

---

### `nested-complexity-hotspots`

**Known False Negatives (Not Detected)**

- Nesting through callback functions
- Promise chains that create implicit nesting
- JSX nesting in React components

**Known False Positives (Incorrectly Flagged)**

- Validation logic that must check many conditions
- Error handling with specific recovery paths

---

### `no-nested-ternary`

**Known False Negatives (Not Detected)**

- Ternaries split across multiple lines
- Ternaries inside function expressions

**Known False Positives (Incorrectly Flagged)**

- Simple, readable nested ternaries for null coalescing
- Ternaries wrapped in parentheses for clarity

---

### `no-lonely-if`

**Known False Negatives (Not Detected)**

- `if` statements separated by comments
- `if` with empty lines before closing brace

**Known False Positives (Incorrectly Flagged)**

- Intentional separation for readability
- `if` blocks with TODO comments for future else

---

## Function Scoping Rules

### `consistent-function-scoping`

**Known False Negatives (Not Detected)**

- Functions that capture via closure indirectly
- Functions moved to module scope that should stay local
- Arrow functions used as callbacks

**Known False Positives (Incorrectly Flagged)**

- Functions intentionally local for encapsulation
- Test helper functions that should stay in test
- Functions that will capture variables after refactoring

---

### `no-unreadable-iife`

**Known False Negatives (Not Detected)**

- Complex IIFEs using `void` operator
- IIFEs in template literals
- Async IIFEs with complex error handling

**Known False Positives (Incorrectly Flagged)**

- Simple IIFEs for module patterns
- IIFEs for immediate configuration
- Test setup IIFEs

---

### `identical-functions`

**Known False Negatives (Not Detected)**

- Functions with different names but same logic
- Functions with minor formatting differences
- Functions duplicated across files

**Known False Positives (Incorrectly Flagged)**

- Intentional duplicates for tree-shaking
- Similar functions that will diverge

---

## Error Handling Rules

### `error-message`

**Known False Negatives (Not Detected)**

- Error messages from variables
- Error messages from internationalization
- Template literal error messages with complex expressions

**Known False Positives (Incorrectly Flagged)**

- Error with intentionally technical message
- Error that will be caught and re-wrapped

---

### `no-silent-errors`

**Known False Negatives (Not Detected)**

- Errors logged but not properly handled
- Errors stored for later processing
- Errors in finally blocks

**Known False Positives (Incorrectly Flagged)**

- Intentional error suppression with logging
- Optional feature fallback patterns
- Cleanup code that must not throw

---

### `no-unhandled-promise`

**Known False Negatives (Not Detected)**

- Promises created in callbacks
- Promises handled by global error boundary
- Async generators without error handling

**Known False Positives (Incorrectly Flagged)**

- Fire-and-forget patterns (intentional)
- Promises with `.catch()` at a higher level
- Test utilities that handle errors internally

---

### `no-missing-error-context`

**Known False Negatives (Not Detected)**

- Context added through Error subclasses
- Context in error metadata properties

**Known False Positives (Incorrectly Flagged)**

- Errors with sufficient message context
- Low-level errors that shouldn't expose details

---

## Mitigation Strategies

1. **Complexity Budgets**: Set team-agreed thresholds
2. **Refactoring Patterns**: Use extract method and compose patterns
3. **Code Reviews**: Focus on complexity during review
4. **IDE Integration**: Use inline complexity indicators
