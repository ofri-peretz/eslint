---
title: 'Path Traversal Beyond ../'
published: false
description: "Directory traversal isn't just '../'. URL encoding, null bytes, and path normalization all bypass naive checks."
tags: nodejs, security, filesystem, eslint
cover_image:
canonical_url:
---

# Path Traversal Beyond ../

You filter for `../`. The attacker uses `%2e%2e%2f`. They're in.

## The Basic Attack

```javascript
// ❌ User controls file path
const file = req.query.file;
const content = fs.readFileSync(`/uploads/${file}`);

// Attack: file=../../../etc/passwd
```

## The Bypasses

Filtering for `../` is not enough:

| Bypass      | Decoded                 |
| ----------- | ----------------------- |
| `%2e%2e%2f` | `../`                   |
| `..%2f`     | `../`                   |
| `%2e%2e/`   | `../`                   |
| `....//`    | `../` (double encoding) |
| `..%00/`    | Null byte injection     |
| `..%5c`     | `..\\` (Windows)        |

## Why Blocklisting Fails

```javascript
// ❌ Easy to bypass
if (file.includes('..')) {
  throw new Error('Invalid path');
}
// Bypassed by: %2e%2e%2f, ....//
```

The problem: you're trying to enumerate bad patterns. Attackers enumerate bypasses.

## The Correct Pattern: Allowlisting

```javascript
import path from 'path';

// ✅ Validate resolved path is within allowed directory
function safeReadFile(userPath) {
  const baseDir = path.resolve('/uploads');
  const resolvedPath = path.resolve(baseDir, userPath);

  if (!resolvedPath.startsWith(baseDir + path.sep)) {
    throw new Error('Path traversal attempt');
  }

  return fs.readFileSync(resolvedPath);
}
```

Key insight: **resolve first, validate after**.

## More Secure Patterns

```javascript
// ✅ Use path.basename to strip directories
const filename = path.basename(userInput); // "../../etc/passwd" → "passwd"
const filepath = path.join('/uploads', filename);

// ✅ Allowlist specific files
const ALLOWED_FILES = ['report.pdf', 'invoice.pdf', 'receipt.pdf'];
if (!ALLOWED_FILES.includes(filename)) {
  throw new Error('File not found');
}
```

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Non-literal file paths are detected:

```bash
src/files.ts
  8:22  error  🔒 CWE-22 OWASP:A01 CVSS:7.5 | Non-literal file path
               Fix: Validate path is within allowed directory after path.resolve()
```

## Related Rules

| Rule                             | Catches                       |
| -------------------------------- | ----------------------------- |
| `detect-non-literal-fs-filename` | Dynamic fs paths              |
| `no-zip-slip`                    | Archive extraction traversal  |
| `no-toctou-vulnerability`        | Race condition in file checks |
| `no-arbitrary-file-access`       | Unrestricted file access      |

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Don't let URL encoding break your security.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: detect-non-literal-fs-filename](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-non-literal-fs-filename.md)

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
