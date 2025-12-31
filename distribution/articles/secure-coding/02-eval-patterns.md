---
title: '3 eval() Patterns That Still Ship to Production'
published: false
description: 'Dynamic code execution is dangerous. Here are three eval patterns that bypass code review and how ESLint catches them.'
tags: javascript, security, eslint, nodejs
cover_image:
canonical_url:
---

# 3 eval() Patterns That Still Ship to Production

Everyone knows `eval()` is dangerous. Yet it keeps appearing in production code.

Why? Because it doesn't always look like `eval()`.

## Pattern 1: The Obvious One

```javascript
// ❌ Everyone catches this
const result = eval(userInput);
```

Easy to spot. Easy to block. But attackers don't use this.

## Pattern 2: The Disguised eval()

```javascript
// ❌ Same vulnerability, different name
const execute = new Function('return ' + userInput);
const result = execute();
```

`new Function()` is eval with extra steps. Same code execution. Same vulnerability. Lower detection rate.

## Pattern 3: The setTimeout Trap

```javascript
// ❌ Did you know setTimeout accepts strings?
setTimeout(userInput, 1000);

// ❌ So does setInterval
setInterval('checkStatus("' + userId + '")', 5000);
```

When `setTimeout` or `setInterval` receive a string, they evaluate it as code. This is a code injection vector hiding in plain sight.

## Why This Matters: CWE-95

All three patterns enable **CWE-95: Eval Injection**.

An attacker can:

- Execute arbitrary JavaScript
- Access Node.js APIs (`require('child_process')`)
- Exfiltrate data, spawn shells, pivot to other systems

## The ESLint Solution

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Now all three patterns trigger:

```bash
src/handler.ts
  12:5  error  🔒 CWE-95 OWASP:A03 CVSS:9.8 | Dynamic code execution detected
               Fix: Avoid eval/Function with user input. Use a safe parser or allowlist.

  18:3  error  🔒 CWE-95 OWASP:A03 CVSS:9.8 | setTimeout with string argument
               Fix: Pass a function reference instead of a string.
```

## The Fixed Code

```javascript
// ✅ Pattern 1: Use a safe alternative
const result = JSON.parse(userInput); // If expecting JSON
const result = safeParser.parse(userInput); // Use a parser library

// ✅ Pattern 2: Use direct function calls
const execute = () => processUserData(sanitizedInput);

// ✅ Pattern 3: Pass function references
setTimeout(() => checkStatus(userId), 1000);
setInterval(() => pollServer(), 5000);
```

## One Config, All Patterns Covered

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

The `detect-eval-with-expression` rule catches:

- Direct `eval()` calls
- `new Function()` with dynamic input
- `setTimeout`/`setInterval` with string arguments
- Indirect eval via `window.eval` or `global.eval`

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: detect-eval-with-expression](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-eval-with-expression.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
