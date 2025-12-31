---
title: 'Empty Catch Blocks: The Silent Bug Factory'
published: false
description: 'Empty catch blocks hide errors, bugs, and security issues. Here is why they are dangerous and what to do instead.'
tags: javascript, debugging, errors, eslint
cover_image:
series: Error Handling
---

# Empty Catch Blocks: The Silent Bug Factory

```javascript
try {
  await processPayment(order);
} catch (e) {
  // TODO: handle error
}
```

This code has processed **zero payments**. You wouldn't know.

## The Problem

Empty catch blocks:

1. Hide bugs
2. Hide security vulnerabilities
3. Make debugging impossible
4. Create silent failures

## Real-World Disasters

### Silent Payment Failure

```javascript
async function checkout(cart) {
  try {
    await chargeCard(cart.total);
  } catch (e) {
    // Swallowed!
  }

  await sendConfirmationEmail();
  await updateInventory();

  // Customer thinks they paid
  // Card wasn't charged
  // Inventory is wrong
}
```

### Security Bypass

```javascript
function validateUser(token) {
  try {
    return jwt.verify(token, secret);
  } catch (e) {
    // Swallowed!
  }
  return null;
}

// Attacker sends malformed token
// No error logged
// No alert triggered
// Failure is invisible
```

### Data Corruption

```javascript
async function syncData() {
  for (const record of records) {
    try {
      await syncRecord(record);
    } catch (e) {
      // Swallowed!
    }
  }
  console.log('Sync complete!');
  // Actually: 50% of records failed silently
}
```

## What to Do Instead

### 1. Log and Re-throw

```javascript
try {
  await processPayment(order);
} catch (e) {
  console.error('Payment failed:', e);
  throw e; // Let caller handle it
}
```

### 2. Log and Return Error State

```javascript
try {
  await processPayment(order);
  return { success: true };
} catch (e) {
  console.error('Payment failed:', e);
  return { success: false, error: e.message };
}
```

### 3. Log and Fallback

```javascript
async function getConfig() {
  try {
    return await fetchRemoteConfig();
  } catch (e) {
    console.warn('Remote config failed, using defaults:', e);
    return defaultConfig;
  }
}
```

### 4. Alert on Critical Errors

```javascript
try {
  await processPayment(order);
} catch (e) {
  console.error('Payment failed:', e);
  await alertOncall({ type: 'payment_failure', error: e, order });
  throw e;
}
```

## Acceptable Empty Catches (Rare!)

```javascript
// ✅ Intentional ignore with comment
try {
  optionalCleanup();
} catch {
  // Intentionally ignored - cleanup is best-effort
}

// ✅ Expected error as control flow
let parsed;
try {
  parsed = JSON.parse(input);
} catch {
  parsed = null; // Invalid JSON treated as missing
}
```

## Minimum Viable Catch

At minimum, **always log**:

```javascript
try {
  doSomething();
} catch (e) {
  console.error(e); // At least this!
}
```

## ESLint Rules

```javascript
// eslint.config.js
import qualityPlugin from 'eslint-plugin-quality';

export default [
  {
    rules: {
      'quality/no-empty-catch': 'error',
    },
  },
];
```

### For Lambda-specific

```javascript
import lambdaSecurity from 'eslint-plugin-lambda-security';

export default [
  {
    rules: {
      'lambda-security/no-error-swallowing': 'error',
    },
  },
];
```

### Error Output

```bash
src/payments.ts
  45:3  error  🔒 CWE-390 CVSS:5.3 | Empty catch block
               Risk: Errors swallowed silently - bugs and failures invisible
               Fix: Log the error and either re-throw, return error state, or add
                    a comment explaining why ignore is intentional
```

## The Comment Exception

If you truly need to ignore:

```javascript
try {
  optionalOp();
} catch {
  // eslint-disable-next-line quality/no-empty-catch --
  // File may not exist; we create it below
}
```

The comment forces you to explain **why**.

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-quality %}
📦 npm install eslint-plugin-quality
{% endcta %}

```javascript
import qualityPlugin from 'eslint-plugin-quality';
export default [qualityPlugin.configs.recommended];
```

---

📦 [npm: eslint-plugin-quality](https://www.npmjs.com/package/eslint-plugin-quality)
📖 [Rule: no-empty-catch](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-quality/docs/rules/no-empty-catch.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Search your code for 'catch' + empty braces. How many?**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
