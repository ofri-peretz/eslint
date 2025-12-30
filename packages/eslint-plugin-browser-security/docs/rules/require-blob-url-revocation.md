# require-blob-url-revocation

Require revoking Blob URLs after use to prevent memory leaks.

## ⚠️ Security Issue

| Property     | Value                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| **CWE**      | [CWE-401: Memory Leak](https://cwe.mitre.org/data/definitions/401.html) |
| **OWASP**    | A04:2021 - Insecure Design                                              |
| **CVSS**     | 5.3 (Medium)                                                            |
| **Severity** | MEDIUM                                                                  |

## 📋 Description

Blob URLs created with `URL.createObjectURL()` consume memory until explicitly revoked with `URL.revokeObjectURL()`. Failing to revoke them causes memory leaks that can impact application performance and stability.

## ❌ Incorrect

```javascript
// Creating blob URL without revocation
const url = URL.createObjectURL(blob);
img.src = url;
// No revocation - memory leak!

// In a loop - major memory leak
files.forEach((file) => {
  const url = URL.createObjectURL(file);
  preview.src = url;
});
```

## ✅ Correct

```javascript
// Revoke after use
const url = URL.createObjectURL(blob);
img.src = url;
img.onload = () => URL.revokeObjectURL(url);

// Cleanup on component unmount (React example)
useEffect(() => {
  const url = URL.createObjectURL(file);
  setPreviewUrl(url);
  return () => URL.revokeObjectURL(url);
}, [file]);
```

## 🛠️ Options

```json
{
  "rules": {
    "@interlace/browser-security/require-blob-url-revocation": [
      "error",
      {
        "allowInTests": true
      }
    ]
  }
}
```

## 📚 Related Resources

- [MDN: URL.createObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL)
- [MDN: URL.revokeObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL)
