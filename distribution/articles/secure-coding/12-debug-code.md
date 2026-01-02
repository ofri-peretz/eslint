---
title: 'Debug Code That Made It to Production'
published: false
description: "console.log, debugger statements, and test endpoints have no place in production. Here's how to catch them."
tags: javascript, security, debugging, eslint
cover_image:
canonical_url:
---

"I'll remove it before merging."

Famous last words.

## The Problem

```javascript
// ❌ All of these ship to production
console.log('DEBUG:', user.password);
console.log('TODO: remove this', secretKey);
debugger; // Browser stops here for everyone
alert('test'); // User sees this
```

Debug code in production:

- Leaks sensitive data to browser console
- Exposes internal logic
- Degrades user experience
- Makes you look unprofessional

## The Dangerous Patterns

### 1. Console Logging Secrets

```javascript
console.log('Auth token:', token); // In browser dev tools for anyone
```

### 2. Debugger Statements

```javascript
debugger; // Freezes the browser for every user
```

### 3. Alert/Confirm Dialogs

```javascript
alert('Order processed'); // User sees unexpected popup
```

### 4. Test Endpoints

```javascript
// ❌ Left in production routes
app.get('/debug/users', (req, res) => {
  res.json(allUsers); // Full user dump
});

app.get('/test/reset-db', ...); // Nightmare
```

### 5. Verbose Error Messages

```javascript
// ❌ Stack traces in responses
catch (e) {
  res.status(500).json({
    error: e.message,
    stack: e.stack // Exposes file paths, line numbers
  });
}
```

## The Fix

```javascript
// ✅ Use proper logging library in production
import logger from './logger'; // Winston, Pino, etc.
logger.debug('Processing order', { orderId }); // Controlled by log level

// ✅ Conditional debug code
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// ✅ Generic error responses
catch (e) {
  logger.error('Order failed', { error: e, orderId });
  res.status(500).json({ error: 'Something went wrong' });
}
```

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Debug code is detected:

```bash
src/checkout.ts
  42:3  warning  🔒 CWE-489 OWASP:M7 CVSS:7.5 | Debug code detected
                 Fix: Remove console.log before production deployment

  67:5  error    🔒 CWE-489 | Debugger statement detected
                 Fix: Remove debugger statement before deployment
```

## What Gets Flagged

| Pattern                   | Detection  |
| ------------------------- | ---------- |
| `console.log()`           | ⚠️ Warning |
| `console.debug()`         | ⚠️ Warning |
| `debugger`                | ❌ Error   |
| `alert()`                 | ⚠️ Warning |
| `/debug/*` routes         | ⚠️ Warning |
| Stack traces in responses | ❌ Error   |

## CI Integration

```yaml
# .github/workflows/lint.yml
- name: Check for debug code
  run: npx eslint . --rule 'secure-coding/no-debug-code-in-production: error'
```

Block PRs with debug code. Automatically.

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Catch it before your users do.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: no-debug-code-in-production](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-debug-code-in-production.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)