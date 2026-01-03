# no-predictable-salt

## Description

TODO: Add description for this rule.

## OWASP Mapping

- **OWASP Top 10**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-327 - Use of a Broken or Risky Cryptographic Algorithm

## Rule Details

TODO: Add rule details.

## Examples

### ❌ Incorrect

```javascript
// TODO: Add incorrect example
```

### ✅ Correct

```javascript
// TODO: Add correct example
```

## Options

This rule has no options.

## When Not To Use It

TODO: Add when not to use.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Values stored in variables are not traced.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
```

**Mitigation**: Validate all user inputs.

### Wrapper Functions

**Why**: Custom wrappers not recognized.

```typescript
// ❌ NOT DETECTED - Wrapper
myWrapper(userInput); // Uses dangerous API internally
```

**Mitigation**: Apply rule to wrapper implementations.

### Dynamic Invocation

**Why**: Dynamic calls not analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic
obj[method](userInput);
```

**Mitigation**: Avoid dynamic method invocation.

