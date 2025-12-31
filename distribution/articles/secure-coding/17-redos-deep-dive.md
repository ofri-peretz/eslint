---
title: 'ReDoS: The Regex That Crashes Your Server'
published: false
description: 'Some regex patterns take exponential time to match. Here is how attackers exploit them and how ESLint catches them.'
tags: security, regex, nodejs, eslint
cover_image:
series: Secure Coding
---

# ReDoS: The Regex That Crashes Your Server

```javascript
const emailRegex = /^([a-zA-Z0-9]+)+@/;
```

This regex can **hang your server**.

## The Attack

```javascript
const input = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!';
emailRegex.test(input); // 💀 Takes forever
```

Why? The regex engine tries every possible way to match `([a-zA-Z0-9]+)+`:

- `a` + `aaaaa...`
- `aa` + `aaaa...`
- `aaa` + `aaa...`
- `aaaa` + `aa...`
- ... exponential combinations

## Evil Regex Patterns

### The Nested Quantifier

```javascript
// ❌ Evil: (a+)+ or (a*)* or (a+)*
/^([a-zA-Z0-9]+)+$/
/^(.*)*$/
/^(\w+)+$/
```

### The Alternation Trap

```javascript
// ❌ Evil: (a|aa)+
/^(foo|fooo)+$/;
```

### The Overlapping Groups

```javascript
// ❌ Evil: overlapping character classes
/^([\s\S]*)$/   // \s and \S overlap
/^([a-z]+[a-z]+)+$/  // Groups can share chars
```

## Real-World Impact

| CVE            | Package     | Pattern         | Impact |
| -------------- | ----------- | --------------- | ------ |
| CVE-2020-28469 | glob-parent | `/(\/{2,})/`    | DoS    |
| CVE-2021-27290 | ssri        | `/(.*)/`        | DoS    |
| CVE-2021-3777  | tmpl        | `/\$\{(.+?)\}/` | DoS    |

## Safe Patterns

### Replace Nested Quantifiers

```javascript
// ❌ Evil
/^([a-zA-Z0-9]+)+$/

// ✅ Safe
/^[a-zA-Z0-9]+$/  // Remove outer capture + quantifier
```

### Limit Input Length

```javascript
// ✅ Limit before regex
function validateEmail(email) {
  if (email.length > 254) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}
```

### Use Possessive Quantifiers (When Supported)

```javascript
// Note: JavaScript doesn't support possessive quantifiers yet
// In other languages: /^([a-zA-Z0-9]++)+$/
```

### Set Timeout

```javascript
// ✅ Use vm module with timeout
import { Script } from 'vm';

function safeRegexTest(pattern, input, timeoutMs = 1000) {
  const script = new Script(`pattern.test(input)`);
  try {
    return script.runInNewContext(
      { pattern: new RegExp(pattern), input },
      { timeout: timeoutMs },
    );
  } catch (e) {
    if (e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
      throw new Error('Regex timeout - possible ReDoS');
    }
    throw e;
  }
}
```

## ESLint Detection

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  {
    rules: {
      'secure-coding/no-unsafe-regex': 'error',
    },
  },
];
```

For Express routes:

```javascript
import expressSecurity from 'eslint-plugin-express-security';

export default [
  {
    rules: {
      'express-security/no-express-unsafe-regex-route': 'error',
    },
  },
];
```

### Error Output

```bash
src/validation.ts
  15:22 error  🔒 CWE-1333 CVSS:7.5 | Potentially unsafe regex (ReDoS)
               Pattern: /^([a-zA-Z0-9]+)+$/
               Risk: Exponential backtracking on crafted input
               Fix: Remove nested quantifiers or limit input length
```

## Testing for ReDoS

```javascript
// Simple test: Does it hang on repeated chars + invalid end?
const testInput = 'a'.repeat(30) + '!';
console.time('regex');
pattern.test(testInput);
console.timeEnd('regex');

// If > 100ms, you have a problem
```

## Online Checkers

- [recheck](https://makenowjust-labs.github.io/recheck/)
- [regex101](https://regex101.com/) (shows steps)

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-secure-coding %}
📦 npm install eslint-plugin-secure-coding
{% endcta %}

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule: no-unsafe-regex](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-secure-coding/docs/rules/no-unsafe-regex.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Test your regexes with 30 repeated chars. Do they hang?**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
