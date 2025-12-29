---
title: 'Command Injection in Node.js: Beyond child_process'
published: false
description: "exec() isn't the only way to get command injection. Learn the patterns that bypass code review and how ESLint catches them."
tags: nodejs, security, shelljs, eslint
cover_image:
canonical_url:
---

# Command Injection in Node.js: Beyond child_process

Everyone knows `exec()` is dangerous. So attackers find other ways in.

## The Obvious One

```javascript
// ❌ Everyone catches this
const { exec } = require('child_process');
exec(`ls ${userInput}`); // CWE-78: OS Command Injection
```

## The Hidden Ones

### 1. execSync (Synchronous = Still Dangerous)

```javascript
// ❌ Same vulnerability, different function
const { execSync } = require('child_process');
execSync(`git clone ${repoUrl}`);
```

### 2. spawn with shell: true

```javascript
// ❌ Shell interpretation enables injection
const { spawn } = require('child_process');
spawn('grep', [userInput, 'file.txt'], { shell: true });
```

### 3. ShellJS

```javascript
// ❌ Popular library, same risk
const shell = require('shelljs');
shell.exec(`npm install ${packageName}`);
```

### 4. execa

```javascript
// ❌ Modern async shell, still vulnerable
import { execa } from 'execa';
await execa(`curl ${url}`, { shell: true });
```

## The Attack

```javascript
// User input:
const filename = 'file.txt; rm -rf /';

// Generated command:
exec(`cat ${filename}`);
// Executes: cat file.txt; rm -rf /
```

Goodbye filesystem.

## The Correct Patterns

```javascript
// ✅ Use spawn with argument array (no shell)
const { spawn } = require('child_process');
spawn('ls', ['-la', userInput]); // userInput is ONE argument

// ✅ execFile instead of exec
const { execFile } = require('child_process');
execFile('ls', ['-la', userInput]); // No shell interpretation

// ✅ Allowlist commands
const ALLOWED_COMMANDS = ['list', 'status', 'info'];
if (!ALLOWED_COMMANDS.includes(command)) {
  throw new Error('Invalid command');
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

All injection vectors are caught:

```bash
src/deploy.ts
  8:3   error  🔒 CWE-78 OWASP:A03 CVSS:9.8 | Command injection risk
               Fix: Use spawn() with argument array, avoid shell interpolation

  15:3  error  🔒 CWE-78 OWASP:A03 CVSS:9.8 | Command injection risk: shell.exec
               Fix: Avoid shell.exec with user input, use shelljs methods
```

## What Gets Detected

| Pattern                       | Caught |
| ----------------------------- | ------ |
| `exec(userInput)`             | ✅     |
| `execSync(userInput)`         | ✅     |
| `spawn(..., { shell: true })` | ✅     |
| `shell.exec(userInput)`       | ✅     |
| `execa(..., { shell: true })` | ✅     |
| Template strings in commands  | ✅     |

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Don't let command injection hide behind library abstractions.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: detect-child-process](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-child-process.md)

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
