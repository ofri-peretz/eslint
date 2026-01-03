# require-authenticated-encryption

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

### Credentials from Config

**Why**: Config values not traced.

```typescript
// ❌ NOT DETECTED - From config
const password = config.dbPassword;
```

**Mitigation**: Use proper secrets management.

### Environment Variables

**Why**: Env var content not analyzed.

```typescript
// ❌ NOT DETECTED - Env var
const secret = process.env.API_KEY;
```

**Mitigation**: Never hardcode or expose secrets.

### Dynamic Credential Access

**Why**: Dynamic property access not traced.

```typescript
// ❌ NOT DETECTED - Dynamic
const cred = credentials[type];
```

**Mitigation**: Audit all credential access patterns.

