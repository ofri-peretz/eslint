---
title: require-mime-type-validation
description: "CWE: [CWE-434](https://cwe.mitre.org/data/definitions/434.html)"
category: security
severity: medium
tags: ['security', 'browser']
autofix: false
---

> **Keywords:** require mime type validation, file upload, security, ESLint rule, [CWE-434](https://cwe.mitre.org/data/definitions/434.html), multer, unrestricted upload
> **CWE:** [CWE-434: Unrestricted Upload of File with Dangerous Type](https://cwe.mitre.org/data/definitions/434.html)  
> **OWASP Mobile:** [OWASP Mobile Top 10 M4: Insufficient Input/Output Validation](https://owasp.org/www-project-mobile-top-10/)

ESLint Rule: require-mime-type-validation. This rule is part of [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security).

## Quick Summary

| Aspect          | Details                                 |
| --------------- | --------------------------------------- |
| **Severity**    | High (RCE Risk)                         |
| **Auto-Fix**    | ❌ No (requires configuration logic)    |
| **Category**   | Security |
| **ESLint MCP**  | ✅ Optimized for ESLint MCP integration |
| **Best For**    | Node.js servers handling file uploads   |
| **Suggestions** | ✅ Advice on using fileFilter in Multer |

## Vulnerability and Risk

**Vulnerability:** Unrestricted file upload occurs when an application allows users to upload files without strictly validating the file type or size.

**Risk:** An attacker could upload a malicious script (e.g., `.php`, `.js`, `.py`) that could be executed on the server, leading to Remote Code Execution (RCE). They could also upload massive files to cause Denial of Service (DoS) through disk exhaustion.

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-434 OWASP:M4 | Missing MIME Validation detected | HIGH [RCE,UnrestrictedUpload]
   Fix: Add fileFilter option to validate MIME types | https://cwe.mitre.org/data/definitions/434.html
```

### Message Components

| Component                 | Purpose                | Example                                                                                                             |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **Risk Standards**        | Security benchmarks    | [CWE-434](https://cwe.mitre.org/data/definitions/434.html) [OWASP:M4](https://owasp.org/www-project-mobile-top-10/) |
| **Issue Description**     | Specific vulnerability | `Missing MIME Validation detected`                                                                                  |
| **Severity & Compliance** | Impact assessment      | `HIGH [RCE,UnrestrictedUpload]`                                                                                     |
| **Fix Instruction**       | Actionable remediation | `Add fileFilter option to validate MIME types`                                                                      |
| **Technical Truth**       | Official reference     | [Unrestricted Upload](https://cwe.mitre.org/data/definitions/434.html)                                              |

## Rule Details

This rule specifically targets common Node.js file upload middleware like `multer`, ensuring that a `fileFilter` or strict size `limits` are configured.

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f8fafc',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#334155',
    'lineColor': '#475569',
    'c0': '#f8fafc',
    'c1': '#f1f5f9',
    'c2': '#e2e8f0',
    'c3': '#cbd5e1'
  }
}}%%
flowchart TD
    A[Multer Configuration] --> B{Has fileFilter?}
    B -->|Yes| C[✅ Secure Configuration]
    B -->|No| D{Has limits?}
    D -->|Yes| E[🟡 Partial Validation (Size only)]
    D -->|No| F[🚨 Unrestricted Upload Vulnerability]
```

### Why This Matters

| Issue            | Impact                           | Solution                                                        |
| ---------------- | -------------------------------- | --------------------------------------------------------------- |
| 🚀 **RCE**       | Server compromised completely    | Strictly validate MIME types and magic bytes                    |
| 💥 **DoS**       | Disk space exhaustion            | Implement strict file size limits                               |
| 🕵️ **Detection** | Malicious payloads bypass checks | Use server-side validation, never rely on file extensions alone |

## Configuration

This rule has no configuration options in the current version.

## Examples

### ❌ Incorrect

```javascript
// Multer configured without any file filter or limits
const upload = multer({ dest: 'uploads/' });

app.post('/profile', upload.single('avatar'), (req, res) => {
  // ...
});

// Multer call with no configuration at all
const upload = multer();
```

### ✅ Correct

```javascript
// Multer with a strict file filter for image types
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // limit to 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
});
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Client-Side Only Validation

**Why**: This rule does not check for HTML `<input accept="...">` attributes. Client-side validation is easily bypassed.

**Mitigation**: Always implement server-side validation using the file's magic bytes or MIME type.

### Custom Upload Handlers

**Why**: If you use a custom file upload handler (e.g., `formidable`, `busboy`), missing validation will not be detected.

```javascript
// Custom busboy implementation - ❌ NOT DETECTED
req.pipe(busboy);
```

**Mitigation**: Manually audit all entry points where files are received from users.

## References

- [CWE-434: Unrestricted Upload of File with Dangerous Type](https://cwe.mitre.org/data/definitions/434.html)
- [OWASP File Upload Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Security_Cheat_Sheet.html)
- [Multer Documentation - fileFilter](https://github.com/expressjs/multer#filefilter)
