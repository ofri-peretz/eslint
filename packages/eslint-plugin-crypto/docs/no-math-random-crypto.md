# no-math-random-crypto

Disallow Math.random() for cryptographic purposes.

## Rule Details

This rule detects `Math.random()` used in security-sensitive contexts like token generation, encryption keys, or salt creation.

**CWE:** [CWE-338](https://cwe.mitre.org/data/definitions/338.html) - Use of Cryptographically Weak PRNG

## ❌ Incorrect

```javascript
function generateToken() {
  return Math.random().toString(36).substring(2);
}

const sessionId = Math.random().toString(16);
const salt = Math.random();
```

## ✅ Correct

```javascript
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

const sessionId = crypto.randomUUID();
const salt = crypto.randomBytes(16);
```

## Why This Matters

`Math.random()` uses a Pseudo-Random Number Generator (PRNG) that:

- Is **not cryptographically secure**
- Can be **predicted** if the seed is known
- Has patterns that can be exploited

## Options

```json
{
  "crypto/no-math-random-crypto": [
    "error",
    {
      "allowInTests": false
    }
  ]
}
```

## Detection

The rule detects `Math.random()` when used in:

- Variables named: `token`, `key`, `secret`, `password`, `salt`, `iv`, `nonce`, `session`, `csrf`, `otp`
- Functions named: `generateToken`, `createSecret`, `randomString`
- Object properties with security-related names
