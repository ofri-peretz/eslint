---
title: no-allow-arbitrary-loads
description: "Prevents disabling App Transport Security (ATS) by detecting NSAllowsArbitraryLoads: true in an Expo/React Native config."
tags: ['security', 'browser']
category: security
severity: medium
cwe: CWE-295
autofix: false
---

> **Keywords:** ATS, App Transport Security, iOS security, CWE-295, NSAppTransportSecurity, NSAllowsArbitraryLoads, Expo app.config.js, mobile security


<!-- @rule-summary -->
Prevents disabling App Transport Security (ATS) by detecting NSAllowsArbitraryLoads: true in an Expo/React Native config.
<!-- @/rule-summary -->

Prevents disabling App Transport Security (ATS) by detecting `NSAllowsArbitraryLoads: true` in an Expo / React Native JavaScript config.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-295](https://cwe.mitre.org/data/definitions/295.html) (Improper Certificate Validation) |
| **OWASP Mobile**  | [M5: Insecure Communication](https://owasp.org/www-project-mobile-top-10/)                   |
| **Severity**      | High                                                                                         |
| **Category**   | Security |

## Rule Details

App Transport Security (ATS) enforces secure connections for iOS/macOS applications. Setting `NSAllowsArbitraryLoads: true` disables this protection entirely, allowing insecure HTTP connections and weakening certificate validation.

The rule matches Apple's own key names, by exact membership:

`NSAllowsArbitraryLoads`, `NSAllowsArbitraryLoadsInWebContent`,
`NSAllowsArbitraryLoadsForMedia`, `NSAllowsLocalNetworking`,
`NSExceptionAllowsInsecureHTTPLoads`,
`NSThirdPartyExceptionAllowsInsecureHTTPLoads`.

It previously matched `allowArbitraryLoads` — lowercase, unprefixed — which is
a key in no Expo, React Native, Capacitor or Cordova schema. That made the rule
vacuous in both directions: it could not fire on any real ATS opt-out, and
anything it did fire on was somebody's own unrelated config key.

The JavaScript surface these keys really appear on is an Expo
`app.config.js` / `app.config.ts`. `Info.plist` itself is XML and ESLint never
sees it — see Known False Negatives.

## Examples

### ❌ Incorrect

```javascript
// app.config.js — disabling ATS entirely, DANGEROUS
export default {
  ios: {
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true, // Allows all insecure connections
      },
    },
  },
};

// The narrower opt-outs are opt-outs too
const plist = {
  NSAppTransportSecurity: {
    NSAllowsArbitraryLoadsInWebContent: true,
    NSAllowsLocalNetworking: true,
  },
};

// A per-domain exception that re-permits cleartext
const ats = {
  NSExceptionDomains: {
    'legacy.example.com': { NSExceptionAllowsInsecureHTTPLoads: true },
  },
};
```

### ✅ Correct

```javascript
// Keep ATS enabled (default)
const config = {
  NSAppTransportSecurity: {
    NSAllowsArbitraryLoads: false, // Or omit entirely
  },
};

// Allow exceptions only for specific domains
const config = {
  NSAppTransportSecurity: {
    NSExceptionDomains: {
      'legacy-api.example.com': {
        NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
      },
    },
  },
};
```

## Error Message Format

When triggered, this rule produces:

```
🔒 CWE-295 | App Transport Security is disabled: "NSAllowsArbitraryLoads: true" lets the app load cleartext HTTP, so any network attacker can read and rewrite its traffic. | HIGH
   Fix: Remove the opt-out and serve over HTTPS, or scope it to one host with NSExceptionDomains. | https://cwe.mitre.org/data/definitions/295.html
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Configuration

**Why**: Configuration values set dynamically at runtime cannot be traced.

```typescript
// ❌ NOT DETECTED - Dynamic value
const enableInsecure = process.env.ALLOW_INSECURE === 'true';
const config = { NSAllowsArbitraryLoads: enableInsecure };
```

**Mitigation**: Never use environment variables to control security settings.

### Configuration in External Files

**Why**: Rule only checks JavaScript/TypeScript, not Info.plist XML.

```xml
<!-- ❌ NOT DETECTED - XML plist -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

**Mitigation**: Use plist linting tools for native iOS configuration.

## When Not To Use It

- In development environments with local HTTP servers (use domain exceptions instead)
- When targeting iOS 8 or earlier (ATS was introduced in iOS 9)

## Further Reading

- [OWASP Mobile Top 10 - M5: Insecure Communication](https://owasp.org/www-project-mobile-top-10/)
- [Apple ATS Documentation](https://developer.apple.com/documentation/security/preventing_insecure_network_connections)
- [CWE-295: Improper Certificate Validation](https://cwe.mitre.org/data/definitions/295.html)

## Related Rules

- [no-disabled-certificate-validation](./no-disabled-certificate-validation.md)
- no-insecure-ssl (planned) (in eslint-plugin-postgresql-security)

---

**Category:** Mobile Security  
**Type:** Problem  
**Recommended:** Yes