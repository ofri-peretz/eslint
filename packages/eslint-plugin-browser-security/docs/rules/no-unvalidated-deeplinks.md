---
title: no-unvalidated-deeplinks
description: This rule detects when deep link URLs are opened without validation in React Native or mobile web apps
tags: ['security', 'browser']
category: security
severity: medium
cwe: CWE-939
autofix: false
---

> Requires validation of deep link URLs before navigation


<!-- @rule-summary -->
This rule detects when deep link URLs are opened without validation in React Native or mobile web apps
<!-- @/rule-summary -->

**Severity:** 🟠 HIGH  
**CWE:** [CWE-939: Improper Authorization in Handler for Custom URL Scheme](https://cwe.mitre.org/data/definitions/939.html)  
**OWASP Mobile:** [M4: Insufficient Input/Output Validation](https://owasp.org/www-project-mobile-top-10/)

## Rule Details

This rule detects when deep link URLs are opened without validation in React Native or mobile web apps. Unvalidated deep links enable phishing attacks, unauthorized actions, and open redirect vulnerabilities. The rule flags `Linking.openURL()` and `navigation.navigate()` calls with variable/expression arguments instead of literal strings.

### Why This Matters

Deep links allow external apps/websites to trigger actions in your app:

- **Phishing**: Attacker crafts malicious deep link to trick users
- **Open redirects**: Users redirected to malicious sites
- **Unauthorized actions**: Deep links bypass normal auth flows
- **CSRF**: Cross-site request forgery via deep links

## ❌ Incorrect

```typescript
// React Native - opening URL from variable without validation
import { Linking } from 'react-native';

function handleDeepLink(url: string) {
  Linking.openURL(url); // ❌ Unvalidated URL from external source
}

// Navigation with user-controlled URL
function navigate(destination: string) {
  navigation.navigate(destination); // ❌ No whitelist check
}

// Deep link handler without validation
Linking.addEventListener('url', (event) => {
  const { url } = event;
  Linking.openURL(url); // ❌ Directly opening deep link
});

// Opening URL from props
function ExternalLink({ href }: { href: string }) {
  return (
    <TouchableOpacity onPress={() => Linking.openURL(href)}>
      {/* ❌ No validation of href prop */}
    </TouchableOpacity>
  );
}
```

## ✅ Correct

```typescript
const x = 42;
```

## ⚙️ Configuration

This rule has no configuration options.

## Known False Negatives

### Literal URL Strings

**Why**: We only flag variable/expression arguments. Literal strings are assumed safe (but still review manually).

```typescript
// ❌ NOT DETECTED - Literal string
Linking.openURL('https://evil.com'); // Literal, but still dangerous if hardcoded malicious URL
```

**Mitigation**: Code review all `openURL()` calls. Prefer whitelisted literals only.

### Indirect Deep Link Handling

**Why**: Validation in separate functions is not traced.

```typescript
// ❌ NOT DETECTED - Validation in separate function
function validate(url: string): boolean {
  return url.startsWith('myapp:');
}

function handleLink(url: string) {
  if (validate(url)) {
    // Validation exists, but not detected statically
    Linking.openURL(url);
  }
}
```

**Mitigation**: Keep validation inline with `openURL()` call for static analysis.

### Custom Link Opening Libraries

**Why**: We only detect `Linking.openURL()` and `navigation.navigate()`. Custom libraries not analyzed.

```typescript
// ❌ NOT DETECTED - Custom library
import { openExternalURL } from './customLinking';
openExternalURL(userProvidedUrl); // Not detected
```

**Mitigation**: Apply validation pattern to all URL opening mechanisms.

## 🔗 Related Rules

- [`require-url-validation`](./require-url-validation.md) - General URL validation
- [`no-insecure-redirects`](./no-insecure-redirects.md) - Server-side redirect validation

## 📚 References

- [CWE-939: Improper Authorization in Handler for Custom URL Scheme](https://cwe.mitre.org/data/definitions/939.html)
- [OWASP Mobile M4: Insufficient Input/Output Validation](https://owasp.org/www-project-mobile-top-10/)
- [React Native Linking API](https://reactnative.dev/docs/linking)
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)