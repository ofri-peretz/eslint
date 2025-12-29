# no-self-signed-certs

Disallow rejectUnauthorized: false in TLS options.

## Rule Details

Detects disabled TLS certificate validation.

**CWE:** [CWE-295](https://cwe.mitre.org/data/definitions/295.html) - Improper Certificate Validation

## ❌ Incorrect

```javascript
https.request({ rejectUnauthorized: false }, callback);
tls.connect({ rejectUnauthorized: false });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
```

## ✅ Correct

```javascript
https.request({ ca: customCA }, callback); // Use custom CA
tls.connect({ rejectUnauthorized: true });
```

## Why This Matters

Disabling certificate validation enables man-in-the-middle attacks.
