# Your 'Web' App has a Mobile Security Problem.

_By Ofri Peretz_

---

If you are building a React Native, Electron, or even a PWA-heavy application, you are likely treating it like a standard web app. You sanitize inputs, strict-type your props, and secure your headers.

But you are missing an entire attack surface.

## The "Hybrid" Blindspot

Modern JavaScript is universal. We run the same `npm` packages on the server, the browser, and the device. But the **threat models** are different.

- **Browser**: Sandboxed, ephemeral.
- **Mobile/Desktop**: Persistent storage, file system access, inter-process communication.

Most security linters (`eslint-plugin-security`, `eslint-plugin-xss`) are strictly web-focused. They look for XSS and Eval. They do _not_ look for:

- Insecure `AsyncStorage` usage (storing JWTs in plain text).
- Weak `postMessage` validation in Electron.
- Unencrypted local database writes.

## Enter OWASP Mobile Top 10

The **OWASP Mobile Top 10 (2024)** requires a different set of checks than the Web Top 10.

- **M1: Improper Credential Usage**: Are you hardcoding API keys in your bundle?
- **M5: Insecure Communication**: Are you allowing cleartext traffic?
- **M9: Insecure Data Storage**: Are you caching sensitive PII in the temp directory?

Your standard linter doesn't know these exist.

## The Benchmark: `eslint-plugin-secure-coding`

This is where my plugin diverges from the pack. It is currently the **only standard ESLint plugin** that explicitly implements rules for the OWASP Mobile Top 10.

| Rule Category     | Standard Linter | [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) |
| :---------------- | :-------------- | :----------------------------------------------------------------------------------------- |
| **Local Storage** | Ignored         | `no-unencrypted-local-storage` (M9)                                                        |
| **Deep Links**    | Ignored         | `no-unvalidated-deeplinks` (M4)                                                            |
| **Console Logs**  | Allowed         | `no-pii-in-logs` (M6 - Mobile logs are readable!)                                          |

## The Punch Line: Full-Stack Security

If you are shipping JavaScript to a device (phone or desktop), you cannot rely on web-only security tools. You are leaving 50% of the door open.

`eslint-plugin-secure-coding` brings mobile-grade security compliance to your standard `npm test` workflow. It’s the difference between "hoping" your app is secure and "proving" it.

---

[Ofri Peretz](https://www.linkedin.com/in/ofri-peretz/) | [GitHub](https://github.com/ofri-peretz)

**Keywords**: Mobile Security, React Native, Electron, OWASP Mobile Top 10, Hybrid Apps, DevSecOps, JavaScript Security
