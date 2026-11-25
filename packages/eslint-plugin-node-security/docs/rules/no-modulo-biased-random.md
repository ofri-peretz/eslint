---
title: no-modulo-biased-random
description: Disallow reducing a random byte with % when the divisor does not divide its range
tags:
  ['security', 'cryptography', 'cwe-330', 'randomness', 'password-generation']
category: security
severity: medium
cwe: CWE-330
owasp: 'A02:2021'
autofix: false
---

> **Keywords:** modulo bias, randomBytes, getRandomValues, randomInt, password generator, token alphabet, rejection sampling, CWE-330, security, ESLint rule, LLM-optimized
> **CWE:** [CWE-330](https://cwe.mitre.org/data/definitions/330.html)  
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

<!-- @rule-summary -->

Disallow reducing a random byte with % when the divisor does not divide its range
<!-- @/rule-summary -->

Detects a byte from `crypto.randomBytes` or `crypto.getRandomValues` reduced with `%` to pick a character or element, when the divisor does not divide the byte's range. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages.

**🚨 Security rule** | **Not in `recommended`; on in `strict`**

## Quick Summary

| Aspect            | Details                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-330](https://cwe.mitre.org/data/definitions/330.html) (Insufficiently Random Values) |
| **Severity**      | Medium (a generated secret is easier to guess than its length suggests)                   |
| **Auto-Fix**      | None                                                                                      |
| **Category**      | Security                                                                                  |
| **Best For**      | Password, token, invite-code and OTP generators                                           |

## Vulnerability and Risk

**Vulnerability:** a random byte is uniform over 256 values. `byte % 70` folds those 256 values onto 70 slots: 256 = 3 × 70 + 46, so the first 46 characters of the alphabet come up 4 times in 256 and the other 24 only 3 times.

**Risk:** every character of the generated secret leans toward the start of the alphabet, which shrinks the effective search space an attacker has to cover. The same code looks correct in review because it uses a cryptographic source.

## Rule Details

A `%` is reported when its left side is an element of a random collection and its result picks a position or becomes text, and the divisor is not known to divide the element's range.

| Part       | Shapes                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source     | `randomBytes(n)` from `crypto` / `node:crypto` (range 256); `getRandomValues(array)` from `crypto.webcrypto` or the global `crypto`, ranged by the array: `Uint8Array` 256, `Uint16Array` 65536, `Uint32Array` 2^32 |
| Collection | the source call, a variable holding it, `Array.from(c)`, `[...c]`, `c.slice()`, `c.subarray()`, `await`, and a typed array that is passed to `getRandomValues`                                                      |
| Element    | `c[i]`, `c.readUInt8/16/32…(…)`, the variable of `for (const b of c)`, the first parameter of a callback to `c.map` (and the other element-wise methods) or `Array.from(c, cb)`                                     |
| Use        | a position: `chars[x]`, `chars.charAt(x)` / `.at(x)` / `.charCodeAt(x)`, `String.fromCharCode(base + x)`; or text: `` `${x}` ``, `String(x)`, `x.toString()`                                                        |
| Divisor    | a number literal, a `const` bound to one, or `.length` of a `const` string (or a concatenation of them) is evaluated; any other divisor is reported, and the message says the bias depends on it                    |

## Examples

### ❌ Incorrect

```typescript
import crypto from 'node:crypto';

const allChars = upper + lower + digits + symbols; // 70 characters
const body = Array.from(crypto.randomBytes(26)).map(
  (b) => allChars[b % allChars.length],
);

const buf = new Uint8Array(6);
crypto.getRandomValues(buf);
const otp = Array.from(buf, (b) => String(b % 10)).join(''); // 0–5 come up 26 times in 256, 6–9 only 25
```

### ✅ Correct

```typescript
import crypto from 'node:crypto';

const pick = (chars: string) => chars[crypto.randomInt(chars.length)];
const body = Array.from({ length: 26 }, () => pick(allChars));

// Rejection sampling: drop bytes at or above the largest multiple of the alphabet size.
const cutoff = 256 - (256 % alphabet.length);
for (const b of crypto.randomBytes(64)) {
  if (b < cutoff) out += alphabet[b % alphabet.length];
}

// 16 divides 256: every hex digit is equally likely.
const hex = '0123456789abcdef';
const id = Array.from(crypto.randomBytes(8), (b) => hex[b % hex.length]).join(
  '',
);
```

## Not a finding

- **A divisor that divides the range** (`% 16`, `% 64`, a 32-character alphabet), or one at least as large as the range.
- **Rejection sampling**: the same element compared with `<`, `<=`, `>` or `>=` in the same function.
- **A `%` whose result is neither a position nor text**: jitter, sharding, a sum.
- **`Math.random()`**, which [`no-math-random-crypto`](./no-math-random-crypto.md) reports as a source.

## Known False Negatives

### A random collection passed through a helper

```typescript
// NOT DETECTED: the bytes come back from a function the rule does not follow
const bytes = getBytes(16);
const s = Array.from(bytes, (b) => chars[b % 62]).join('');
```

**Mitigation:** use `crypto.randomInt`, which has no bias whatever the source.

## Known False Positives

### An unknown divisor that happens to divide the range

```typescript
// Reported: the rule cannot see that the caller always passes a 32-character alphabet
function encode(bytes = crypto.randomBytes(16), alphabet) {
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
```

**Mitigation:** bind the alphabet to a `const` string, so the rule can read its length.

## Further Reading

- **[crypto.randomInt](https://nodejs.org/api/crypto.html#cryptorandomintmin-max-callback)** — Node's unbiased integer in a range
- **[CWE-330: Use of Insufficiently Random Values](https://cwe.mitre.org/data/definitions/330.html)** — Official CWE entry
