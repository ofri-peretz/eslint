---
title: 'Prototype Pollution: Why obj[key] is Dangerous'
published: false
description: 'A simple bracket notation can lead to complete application compromise. Learn how prototype pollution works and how to prevent it.'
tags: javascript, security, nodejs, eslint
cover_image:
canonical_url:
---

# Prototype Pollution: Why obj[key] is Dangerous

```javascript
obj[key] = value;
```

This line of code exists in every JavaScript application. It's also one of the most dangerous patterns in the language.

## The Attack

```javascript
function merge(target, source) {
  for (const key in source) {
    target[key] = source[key];
  }
  return target;
}

// Normal usage
merge({}, { name: 'Alice' });

// Attack
merge({}, JSON.parse('{"__proto__": {"isAdmin": true}}'));

// Now EVERY object has isAdmin = true
console.log({}.isAdmin); // true
```

One request. Every object in your application is now compromised.

## Why It Matters

Prototype pollution enables:

| Attack                    | Impact                        |
| ------------------------- | ----------------------------- |
| **Property injection**    | Add properties to all objects |
| **Authentication bypass** | `user.isAdmin` becomes true   |
| **XSS**                   | Inject into template engines  |
| **RCE**                   | Exploit gadgets in libraries  |

## The Dangerous Patterns

```javascript
// ❌ Direct assignment with user-controlled key
obj[userInput] = value;

// ❌ Recursive merge without checks
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object') {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

// ❌ Path-based assignment
function setPath(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys.slice(0, -1)) {
    current = current[key] ??= {};
  }
  current[keys.at(-1)] = value;
}
```

## The Fix

```javascript
// ✅ Block dangerous keys
const FORBIDDEN = ['__proto__', 'constructor', 'prototype'];

function safeMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (FORBIDDEN.includes(key)) continue;
    target[key] = source[key];
  }
  return target;
}

// ✅ Use Map for dynamic keys
const userData = new Map();
userData.set(userInput, value);

// ✅ Use Object.create(null)
const safeObj = Object.create(null);
safeObj[userInput] = value; // No prototype to pollute
```

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

The `detect-object-injection` rule warns on:

```bash
src/merge.ts
  5:3  warning  🔒 CWE-915 OWASP:A03 CVSS:7.3 | Potential object injection
                Fix: Validate key is not '__proto__', 'constructor', or 'prototype'
```

## Real-World Vulnerabilities

- **lodash < 4.17.11**: Prototype pollution in `_.merge()`
- **jQuery < 3.4.0**: Pollution via `$.extend()`
- **Lodash < 4.17.5**: `_.defaultsDeep()` pollution
- **Handlebars**: RCE via prototype pollution

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Don't let `obj[key]` compromise your application.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: detect-object-injection](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-object-injection.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
