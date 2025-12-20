# OWASP Mobile Top 10 in Pure JavaScript

_By Ofri Peretz_

---

Mobile security rules are usually written for Swift and Kotlin. But what about React Native, Expo, Electron, Capacitor, or PWAs?

You write JavaScript. You deserve JavaScript security rules.

## The Gap

OWASP Mobile Top 10 2024 covers threats like insecure data storage, inadequate privacy controls, and insecure communication. But most static analysis tools for these issues target native code.

If you're building cross-platform apps in TypeScript, you're often flying blind.

## The Solution: 30 Framework-Agnostic Rules

[eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding) includes 30 mobile-focused rules that work in any JavaScript environment:

| OWASP Mobile | Category                  | Rules                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1**       | Improper Credential Usage | [no-credentials-in-storage-api](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-credentials-in-storage-api.md), [no-hardcoded-credentials](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-hardcoded-credentials.md)                                                                                                                                                |
| **M5**       | Insecure Communication    | [no-http-urls](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-http-urls.md), [require-https-only](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/require-https-only.md), [no-disabled-certificate-validation](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-disabled-certificate-validation.md)                                 |
| **M6**       | Inadequate Privacy        | [no-pii-in-logs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-pii-in-logs.md), [no-tracking-without-consent](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-tracking-without-consent.md), [no-sensitive-data-in-analytics](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-sensitive-data-in-analytics.md)                   |
| **M9**       | Insecure Data Storage     | [no-unencrypted-local-storage](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unencrypted-local-storage.md), [no-sensitive-data-in-cache](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-sensitive-data-in-cache.md), [require-storage-encryption](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/require-storage-encryption.md) |

## Real Examples

### M1: Credentials in localStorage

```javascript
// FLAGGED
localStorage.setItem('authToken', token);
```

Fix: Use secure storage like `expo-secure-store` or `@capacitor/preferences` with encryption.

### M5: HTTP URLs

```javascript
// FLAGGED
fetch('http://api.example.com/data');
```

Fix: Always use HTTPS.

### M6: PII in Logs

```javascript
// FLAGGED
console.log('User email:', user.email);
```

Fix: Redact or remove sensitive data from logs.

### M9: Unencrypted Storage

```javascript
// FLAGGED
AsyncStorage.setItem('creditCard', cardNumber);
```

Fix: Encrypt sensitive data before storage.

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

[Ofri Peretz](https://www.linkedin.com/in/ofri-peretz/) | [GitHub](https://github.com/ofri-peretz)

**Keywords**: Mobile Security, React Native, Expo, Electron, OWASP Mobile, Cross-Platform, PWA
