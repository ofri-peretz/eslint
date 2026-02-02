---
title: no-arbitrary-file-access
description: Prevents file system access with unsanitized user input to protect against path traversal attacks.
tags: ['security', 'node']
category: security
severity: medium
cwe: CWE-22
owasp: "A01:2021"
autofix: false
---

> **Keywords:** path traversal, CWE-22, file access, LFI, directory traversal, fs, readFile, security


<!-- @rule-summary -->
Prevents file system access with unsanitized user input to protect against path traversal attacks.
<!-- @/rule-summary -->

Prevents file system access with unsanitized user input to protect against path traversal attacks.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------ |
| **CWE Reference** | [CWE-22](https://cwe.mitre.org/data/definitions/22.html) (Improper Limitation of Pathname) |
| **OWASP**         | [A01:2021 Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)  |
| **Severity**      | High                                                                                       |
| **Category**   | Security |

## Rule Details

Path traversal vulnerabilities allow attackers to access files outside the intended directory using sequences like `../`. This rule detects `fs.*` calls where the path comes from user input.

**Smart Detection:** This rule recognizes safe patterns including:

- `path.basename()` sanitization
- `path.join()` with validated base directories
- `startsWith()` validation guards

## Examples

### ❌ Incorrect

```typescript
// Direct user input to fs - DANGEROUS
app.get('/file', (req, res) => {
  const content = fs.readFileSync(req.query.filename); // Path traversal!
  res.send(content);
});

// User input from params
fs.readFile(req.params.path, callback);

// Unsanitized body input
fs.writeFileSync(req.body.filePath, data);
```

### ✅ Correct

```typescript
// Using path.basename() to strip directory components
const safeName = path.basename(req.query.filename);
const fullPath = path.join(UPLOAD_DIR, safeName);
fs.readFileSync(fullPath);

// Validation with startsWith() guard
const filePath = path.resolve(UPLOAD_DIR, req.query.filename);
if (!filePath.startsWith(UPLOAD_DIR)) {
  throw new Error('Invalid path');
}
fs.readFileSync(filePath);

// Literal paths are always safe
fs.readFileSync('./config/app.json');

// Using allowlisted filenames
const ALLOWED_FILES = ['readme.txt', 'license.txt'];
if (ALLOWED_FILES.includes(req.query.file)) {
  fs.readFileSync(path.join(PUBLIC_DIR, req.query.file));
}
```

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-22 OWASP:A01 CVSS:7.5 | Path Traversal detected | HIGH [SOC2,PCI-DSS,HIPAA,ISO27001]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A01_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-22](https://cwe.mitre.org/data/definitions/22.html) [OWASP:A01](https://owasp.org/Top10/A01_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Path Traversal detected` |
| **Severity & Compliance** | Impact assessment | `HIGH [SOC2,PCI-DSS,HIPAA,ISO27001]` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A01_2021-Injection/) |

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Indirect User Input

**Why**: Data flow through multiple variables not traced.

```typescript
// ❌ NOT DETECTED - Indirect flow
const userPath = getPathFromRequest(req);
fs.readFileSync(userPath);
```

**Mitigation**: Apply validation at the source.

### Custom File Wrappers

**Why**: Wrapper functions around fs not analyzed.

```typescript
// ❌ NOT DETECTED - Custom wrapper
function readUserFile(path) {
  return fs.readFileSync(path); // Called with user input elsewhere
}
```

**Mitigation**: Apply rule to wrapper implementations.

### Template Literals

**Why**: Complex template construction not fully traced.

```typescript
// ❌ NOT DETECTED - Template literal
fs.readFileSync(`./uploads/${userId}/${req.query.file}`);
```

**Mitigation**: Use path.join() with basename().

## When Not To Use It

- In CLI tools where file paths come from command-line arguments (trusted)
- In build scripts processing known file trees
- When using a file access abstraction layer with built-in validation

## Further Reading

- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)
- [Node.js fs Security](https://nodejs.org/api/fs.html#file-system-flags)

## Related Rules

- [detect-non-literal-fs-filename](./detect-non-literal-fs-filename.md)
- [no-unsafe-copy-from](../pg/no-unsafe-copy-from.md) (in eslint-plugin-pg)

---

**Category:** Security  
**Type:** Problem  
**Recommended:** Yes