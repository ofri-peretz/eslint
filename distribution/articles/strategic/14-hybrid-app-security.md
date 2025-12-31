---
title: 'Your "Web" App has a Mobile Security Problem'
published: false
description: 'If you are building React Native, Electron, or PWA apps, you are likely treating them like standard web apps. But you are missing an entire attack surface.'
tags: security, reactnative, electron, mobile
cover_image:
series: Mobile Security
---

# Your "Web" App has a Mobile Security Problem

If you are building a React Native, Electron, or even a PWA-heavy application, you are likely treating it like a standard web app. You sanitize inputs, strict-type your props, and secure your headers.

But you are missing an entire attack surface.

## The "Hybrid" Blindspot

Modern JavaScript is universal. We run the same `npm` packages on the server, the browser, and the device. But the **threat models** are different.

- **Browser**: Sandboxed, ephemeral.
- **Mobile/Desktop**: Persistent storage, file system access, inter-process communication.

Most security linters are strictly web-focused. They look for XSS and Eval. They do _not_ look for:

- Insecure `AsyncStorage` usage (storing JWTs in plain text)
- Weak `postMessage` validation in Electron
- Unencrypted local database writes

## Enter OWASP Mobile Top 10

The **OWASP Mobile Top 10 (2024)** requires a different set of checks than the Web Top 10.

- **M1: Improper Credential Usage**: Are you hardcoding API keys in your bundle?
- **M5: Insecure Communication**: Are you allowing cleartext traffic?
- **M9: Insecure Data Storage**: Are you caching sensitive PII in the temp directory?

Your standard linter doesn't know these exist.

## The Comparison

| Rule Category     | Standard Linter | `eslint-plugin-secure-coding`                     |
| :---------------- | :-------------- | :------------------------------------------------ |
| **Local Storage** | Ignored         | `no-unencrypted-local-storage` (M9)               |
| **Deep Links**    | Ignored         | `no-unvalidated-deeplinks` (M4)                   |
| **Console Logs**  | Allowed         | `no-pii-in-logs` (M6 - Mobile logs are readable!) |

## The Punch Line: Full-Stack Security

If you are shipping JavaScript to a device (phone or desktop), you cannot rely on web-only security tools. You are leaving 50% of the door open.

Modern security linting brings mobile-grade security compliance to your standard `npm test` workflow. It's the difference between "hoping" your app is secure and "proving" it.

---

{% cta https://npmjs.com/package/eslint-plugin-secure-coding %}
📦 npm install eslint-plugin-secure-coding
{% endcta %}

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)

---

🚀 **Building hybrid apps? What mobile security issues have you encountered?**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
