# no-dynamic-service-worker-url

Prevent dynamic URLs in service worker registration.

## ⚠️ Security Issue

| Property     | Value                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| **CWE**      | [CWE-829: Inclusion of Functionality from Untrusted Control Sphere](https://cwe.mitre.org/data/definitions/829.html) |
| **OWASP**    | A08:2021 - Software and Data Integrity Failures                                                                      |
| **CVSS**     | 8.1 (High)                                                                                                           |
| **Severity** | HIGH                                                                                                                 |

## 📋 Description

Dynamically constructing service worker URLs can lead to loading malicious scripts that have full control over network requests for your site.

## ❌ Incorrect

```javascript
// Dynamic URL construction
navigator.serviceWorker.register(userInput);

// Template literal with expression
navigator.serviceWorker.register(`${basePath}/sw.js`);

// Concatenation
navigator.serviceWorker.register(path + '/worker.js');
```

## ✅ Correct

```javascript
// Static string URL
navigator.serviceWorker.register('/sw.js');

// Constant URL
navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
```

## 🛠️ Options

```json
{
  "rules": {
    "@interlace/browser-security/no-dynamic-service-worker-url": [
      "error",
      {
        "allowInTests": true
      }
    ]
  }
}
```

## 📚 Related Resources

- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Google: Service Worker Security](https://web.dev/service-worker-lifecycle/)
