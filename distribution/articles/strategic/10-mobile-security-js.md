---
title: 'OWASP Mobile Top 10 in Pure JavaScript'
published: false
description: 'Mobile security rules are usually written for Swift and Kotlin. But what about React Native, Expo, Electron, or PWAs? You write JavaScript—you deserve JavaScript security rules.'
tags: security, reactnative, mobile, javascript
cover_image:
series: Mobile Security
---

# OWASP Mobile Top 10 in Pure JavaScript

Mobile security rules are usually written for Swift and Kotlin. But what about React Native, Expo, Electron, Capacitor, or PWAs?

You write JavaScript. You deserve JavaScript security rules.

## The Gap

OWASP Mobile Top 10 2024 covers threats like insecure data storage, inadequate privacy controls, and insecure communication. But most static analysis tools for these issues target native code.

If you're building cross-platform apps in TypeScript, you're often flying blind.

## The Solution: 30 Framework-Agnostic Rules

| OWASP Mobile | Category                  | Rules                                                                                      |
| ------------ | ------------------------- | ------------------------------------------------------------------------------------------ |
| **M1**       | Improper Credential Usage | `no-credentials-in-storage-api`, `no-hardcoded-credentials`                                |
| **M5**       | Insecure Communication    | `no-http-urls`, `require-https-only`, `no-disabled-certificate-validation`                 |
| **M6**       | Inadequate Privacy        | `no-pii-in-logs`, `no-tracking-without-consent`, `no-sensitive-data-in-analytics`          |
| **M9**       | Insecure Data Storage     | `no-unencrypted-local-storage`, `no-sensitive-data-in-cache`, `require-storage-encryption` |

## Real Examples

### M1: Credentials in localStorage

```javascript
// ❌ FLAGGED
localStorage.setItem('authToken', token);
```

**Fix**: Use secure storage like `expo-secure-store` or `@capacitor/preferences` with encryption.

### M5: HTTP URLs

```javascript
// ❌ FLAGGED
fetch('http://api.example.com/data');
```

**Fix**: Always use HTTPS.

### M6: PII in Logs

```javascript
// ❌ FLAGGED
console.log('User email:', user.email);
```

**Fix**: Redact or remove sensitive data from logs.

### M9: Unencrypted Storage

```javascript
// ❌ FLAGGED
AsyncStorage.setItem('creditCard', cardNumber);
```

**Fix**: Encrypt sensitive data before storage.

## Quick Setup

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [secureCoding.configs['owasp-mobile-top-10']];
```

This enables all 30 mobile-focused rules.

## The Punch Line: Cross-Platform Security

You chose JavaScript for its portability. Your security shouldn't be platform-specific.

Whether you're shipping to iOS, Android, web, or desktop—the same rules apply. The same linter catches them all.

---

{% cta https://npmjs.com/package/eslint-plugin-secure-coding %}
📦 npm install eslint-plugin-secure-coding
{% endcta %}

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [OWASP Mobile Preset](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-secure-coding#mobile-preset)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Building cross-platform apps? What security challenges have you faced?**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
