---
title: 'Zip Slip: The Archive Extraction Vulnerability'
published: false
description: 'Extracting a zip file seems safe. Until a malicious path overwrites your /etc/passwd. Learn how Zip Slip works.'
tags: nodejs, security, filesystem, eslint
cover_image:
canonical_url:
---

# Zip Slip: The Archive Extraction Vulnerability

You receive a zip file. You extract it. Your system is compromised.

## The Attack

A malicious zip file contains entries with paths like:

```
../../../etc/passwd
../../../home/user/.ssh/authorized_keys
../../../var/www/html/backdoor.php
```

When extracted, these files escape the target directory and overwrite system files.

## Vulnerable Code

```javascript
// ❌ No path validation
const AdmZip = require('adm-zip');
const zip = new AdmZip('upload.zip');

zip.getEntries().forEach((entry) => {
  const target = path.join('./extracted', entry.entryName);
  fs.writeFileSync(target, entry.getData());
  // entry.entryName = '../../../etc/passwd'
  // target = './extracted/../../../etc/passwd' = '/etc/passwd'
});
```

## Why Path.join Doesn't Help

```javascript
path.join('./extracted', '../../../etc/passwd');
// Returns: '/etc/passwd'
// NOT: './extracted/../../../etc/passwd'
```

`path.join()` resolves the path. It doesn't validate it.

## The Correct Pattern

```javascript
// ✅ Validate the resolved path stays within target
const targetDir = path.resolve('./extracted');

zip.getEntries().forEach((entry) => {
  const entryPath = path.resolve(targetDir, entry.entryName);

  // Check path is within target directory
  if (!entryPath.startsWith(targetDir + path.sep)) {
    throw new Error('Zip Slip attempt detected');
  }

  // Safe to extract
  fs.mkdirSync(path.dirname(entryPath), { recursive: true });
  fs.writeFileSync(entryPath, entry.getData());
});
```

## Key Insight

```javascript
path
  .resolve('./extracted', '../../../etc/passwd')
  .startsWith(path.resolve('./extracted'));
// Returns: false
```

The resolved path `/etc/passwd` doesn't start with `/path/to/extracted`.

## Let ESLint Detect This

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Zip extraction without validation triggers:

```bash
src/upload.ts
  15:3  error  🔒 CWE-22 OWASP:A01 CVSS:8.1 | Potential Zip Slip vulnerability
               Fix: Validate extracted path stays within target directory
```

## Real-World Impact

Zip Slip affected:

- **AWS Toolkit for Eclipse**
- **HP Enterprise**
- **LinkedIn**
- **Apache/Oracle/Pivotal** products
- **1000s of npm packages**

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Don't let a zip file escape your control.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: no-zip-slip](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-zip-slip.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
