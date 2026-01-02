---
title: 'Prototype Pollution: The Hidden JavaScript Vulnerability'
published: false
description: 'Object property manipulation can crash apps or bypass security. Here is how it works and how to prevent it.'
tags: javascript, security, vulnerability, eslint
cover_image:
series: Secure Coding
---

```javascript
const userSettings = JSON.parse(userInput);
Object.assign(config, userSettings);
```

If `userSettings` contains `__proto__`, you're in trouble.

## The Attack

```javascript
// Attacker sends:
{
  "__proto__": {
    "isAdmin": true
  }
}

// After Object.assign:
const user = {};
console.log(user.isAdmin); // true! (inherited from Object.prototype)
```

## Real-World Impact

| Attack                   | Effect               |
| ------------------------ | -------------------- |
| `isAdmin: true`          | Privilege escalation |
| `constructor: malicious` | Code execution       |
| `toString: undefined`    | Application crash    |

## Vulnerable Patterns

```javascript
// ❌ Deep merge without protection
function merge(target, source) {
  for (const key in source) {
    target[key] = source[key];
  }
}

// ❌ Direct prototype access
obj[userKey] = userValue;

// ❌ Lodash merge (old versions)
_.merge(config, userInput);
```

## Safe Patterns

```javascript
// ✅ Block dangerous keys
const BANNED_KEYS = ['__proto__', 'constructor', 'prototype'];

function safeMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (BANNED_KEYS.includes(key)) continue;
    target[key] = source[key];
  }
}

// ✅ Use Object.create(null) for dictionaries
const config = Object.create(null);

// ✅ Validate keys before assignment
if (Object.hasOwn(obj, key)) {
  obj[key] = value;
}
```

## ESLint Rules

```javascript
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  {
    rules: {
      'secure-coding/detect-prototype-pollution': 'error',
      'secure-coding/detect-object-injection': 'error',
    },
  },
];
```

## Quick Install


---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)

---

🚀 **Check your Object.assign and merge calls!**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
