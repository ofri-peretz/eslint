# The Hidden Security Risks in Your File Upload Handler

_By Ofri Peretz_

---

File uploads are a goldmine for attackers. Every bug bounty hunter knows this. Every pen tester checks it first.

And yet, most file upload handlers are written in 20 minutes without a second thought.

## The Attack Surface

A typical file upload introduces at least four vulnerability classes:

### 1. Path Traversal (Zip Slip)

An attacker uploads a ZIP file containing `../../../etc/passwd`. Your extraction code happily writes outside the intended directory.

```javascript
// VULNERABLE
const extractPath = path.join(uploadDir, entry.fileName);
fs.writeFileSync(extractPath, content);
```

### 2. MIME Type Confusion

The frontend says it's an image. The header says `image/png`. But the actual content is a PHP shell.

```javascript
// VULNERABLE
if (file.mimetype.startsWith('image/')) {
  saveFile(file); // Trusting the mimetype header
}
```

### 3. Arbitrary File Access

The user requests `/api/files?name=../../../secrets.env`. Your code reads it.

```javascript
// VULNERABLE
const content = fs.readFileSync(path.join(baseDir, req.query.name));
```

### 4. Denial of Service

The user uploads a 50GB file. Your server runs out of disk space.

## The Detection: Three Rules

[eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding) includes specific rules for file upload security:

| Rule                                                                                                                                            | CWE     | Detects                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------- |
| [no-zip-slip](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-zip-slip.md)                                   | CWE-22  | Path traversal in zip extraction |
| [no-arbitrary-file-access](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-arbitrary-file-access.md)         | CWE-22  | Unvalidated file path access     |
| [require-mime-type-validation](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/require-mime-type-validation.md) | CWE-434 | Missing MIME verification        |

## The Fix: Patterns That Work

### Safe Zip Extraction

```javascript
const extractPath = path.join(uploadDir, path.basename(entry.fileName));
if (!extractPath.startsWith(uploadDir)) {
  throw new Error('Path traversal detected');
}
```

### Safe MIME Validation

```javascript
import fileType from 'file-type';

const detected = await fileType.fromBuffer(buffer);
if (!detected || !allowedTypes.includes(detected.mime)) {
  throw new Error('Invalid file type');
}
```

### Safe File Access

```javascript
const safeName = path.basename(req.query.name);
const fullPath = path.resolve(baseDir, safeName);

if (!fullPath.startsWith(path.resolve(baseDir))) {
  throw new Error('Path traversal detected');
}
```

## The Punch Line: Check Your Uploads

File uploads are high-risk, high-reward for attackers. They're often the easiest path into a system.

Run the linter. Check the output. Fix the issues before someone else finds them.

---

[Ofri Peretz](https://www.linkedin.com/in/ofri-peretz/) | [GitHub](https://github.com/ofri-peretz)

**Keywords**: File Upload, Path Traversal, Zip Slip, MIME Type, Security, Web Application Security
