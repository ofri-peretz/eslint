---
title: 'ReDoS: The Regex Attack Nobody Talks About'
published: false
description: 'A single malicious input can freeze your server for minutes. Learn how Regular Expression Denial of Service works and how to prevent it.'
tags: javascript, security, regex, performance
cover_image:
canonical_url:
---

# ReDoS: The Regex Attack Nobody Talks About

Your regex looks fine. It passes all tests. It handles edge cases.

Then one input brings your server to its knees.

## The Attack

```javascript
// A simple email validation regex
const emailRegex = /^([a-zA-Z0-9]+)+@example\.com$/;

// Normal input: 0.1ms
emailRegex.test('user@example.com');

// Malicious input: 30+ seconds (or forever)
emailRegex.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaa!');
```

This is **ReDoS** - Regular Expression Denial of Service.

## Why It Happens

The regex engine uses **backtracking**. When a match fails, it tries alternative paths.

With `([a-zA-Z0-9]+)+`, the nested quantifiers create exponential possibilities:

| Input Length | Backtracking Steps |
| ------------ | ------------------ |
| 10 chars     | 1,024              |
| 20 chars     | 1,048,576          |
| 30 chars     | 1,073,741,824      |
| 40 chars     | 1,099,511,627,776  |

One request. One regex. Complete denial of service.

## Real-World Vulnerabilities

- **Cloudflare outage (2019)**: ReDoS in WAF rules
- **Stack Overflow (2016)**: 34 minutes of downtime
- **npm packages**: Regularly found vulnerable

## The Dangerous Patterns

```javascript
// ❌ Nested quantifiers
/^(a+)+$/

// ❌ Overlapping alternatives
/^(a|a)+$/

// ❌ Repetition of groups with repetition
/^([a-z]+)*$/

// ❌ User input in regex
new RegExp(userInput + '+');
```

## The Fix: Atomic Patterns

```javascript
// ✅ Possessive quantifier (not in JS, but concept applies)
// ✅ Avoid nesting quantifiers
/^[a-zA-Z0-9]+@example\.com$/; // Single quantifier, no nesting

// ✅ Use a library for email validation
import { isEmail } from 'validator';

// ✅ Add timeout for user-provided patterns
import { RE2 } from 're2'; // Linear time guarantee
```

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

The plugin includes THREE ReDoS rules:

### 1. `detect-non-literal-regexp`

```javascript
// Catches user input in regex
new RegExp(userInput); // ⚠️ Warning
```

### 2. `no-redos-vulnerable-regex`

```javascript
// Catches dangerous patterns
const re = /^(a+)+$/; // ❌ Error: ReDoS-vulnerable pattern
```

### 3. `no-unsafe-regex-construction`

```javascript
// Catches unescaped user input
new RegExp(userInput + '*'); // ❌ Error: Unsafe regex construction
```

## Example Output

```bash
src/validate.ts
  12:15  error  🔒 CWE-1333 OWASP:A03 CVSS:7.5 | ReDoS-vulnerable regex pattern
                Fix: Remove nested quantifiers or use RE2 library for safe matching
```

## Performance Testing Your Regex

```javascript
// Test with exponential input
const input = 'a'.repeat(30) + '!';
const start = Date.now();
regex.test(input);
console.log(`Time: ${Date.now() - start}ms`);
// If > 100ms, you have a problem
```

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Don't let a regex take down your production.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: no-redos-vulnerable-regex](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-redos-vulnerable-regex.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
