---
title: 'Path Traversal: When User Input Meets fs.readFile'
published: false
description: 'Using user input in file paths enables directory traversal. Here is the attack and how to prevent it.'
tags: nodejs, security, filesystem, eslint
cover_image:
series: Secure Coding
---

# Path Traversal: When User Input Meets fs.readFile

```javascript
app.get('/file/:name', (req, res) => {
  const content = fs.readFileSync(`./uploads/${req.params.name}`);
  res.send(content);
});
```

What if `name` is `../../../etc/passwd`?

## The Attack

```bash
# Attacker requests:
GET /file/..%2F..%2F..%2Fetc%2Fpasswd

# Server reads:
./uploads/../../../etc/passwd
# = /etc/passwd

# Result: Server password file leaked
```

## Vulnerable Patterns

```javascript
// ❌ User input in path
fs.readFile(`./data/${userInput}`, callback);

// ❌ User input in require
const module = require(`./plugins/${pluginName}`);

// ❌ Template with path
res.sendFile(`${uploadDir}/${filename}`);
```

## Safe Patterns

```javascript
// ✅ Validate: no path separators
function sanitizeFilename(name) {
  if (name.includes('/') || name.includes('..')) {
    throw new Error('Invalid filename');
  }
  return name;
}

// ✅ Use path.basename
const safe = path.basename(userInput);
fs.readFile(path.join('./uploads', safe));

// ✅ Verify resolved path is within allowed directory
const resolved = path.resolve('./uploads', userInput);
if (!resolved.startsWith(path.resolve('./uploads'))) {
  throw new Error('Path traversal attempt');
}
```

## ESLint Rules

```javascript
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  {
    rules: {
      'secure-coding/detect-non-literal-fs-filename': 'error',
    },
  },
];
```

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-secure-coding %}
📦 npm install eslint-plugin-secure-coding
{% endcta %}

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)

---

🚀 **Check every fs call with user input!**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
