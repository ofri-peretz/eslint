---
title: no-electron-security-issues
description: Detects Electron security vulnerabilities and insecure configurations
tags: ['security', 'core']
category: security
severity: medium
cwe: CWE-16
autofix: false
---

> **Keywords:** Electron, CWE-16, nodeIntegration, contextIsolation, desktop security

<!-- @rule-summary -->
Detects Electron security vulnerabilities and insecure configurations
<!-- @/rule-summary -->

**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)  
**OWASP Mobile:** [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)

Detects Electron security vulnerabilities and insecure configurations. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                  |
| ----------------- | ------------------------------------------------------------------------ |
| **CWE Reference** | [CWE-16](https://cwe.mitre.org/data/definitions/16.html) (Configuration) |
| **Severity**      | High (CVSS 8.8)                                                          |
| **Auto-Fix**      | 💡 Suggestions available                                                 |
| **Category**   | Security |

## Vulnerability and Risk

**Vulnerability:** Insecure Electron configurations (like enabling `nodeIntegration` or disabling `contextIsolation`) expose the renderer process to Node.js APIs.

**Risk:** This is a critical vulnerability that typically leads to Remote Code Execution (RCE) via Cross-Site Scripting (XSS). If an attacker can execute JavaScript on a page with `nodeIntegration: true`, they can execute system commands, access the file system, and compromise the user's machine.

## Rule Details

Electron applications can be vulnerable when not properly configured. Insecure settings allow attackers to:

- Execute arbitrary Node.js code from renderer
- Bypass context isolation protections
- Perform privilege escalation
- Access sensitive system resources

### Why This Matters

| Issue                       | Impact                 | Solution                |
| --------------------------- | ---------------------- | ----------------------- |
| 💻 **RCE**                  | Full system compromise | Disable nodeIntegration |
| 🔓 **Privilege Escalation** | Admin access           | Enable contextIsolation |
| 🌐 **XSS to RCE**           | Remote code execution  | Enable sandbox          |

## Examples

### ❌ Incorrect

```typescript
// Node integration enabled (critical vulnerability)
new BrowserWindow({
  webPreferences: {
    nodeIntegration: true, // DANGEROUS!
  },
});

// Context isolation disabled
new BrowserWindow({
  webPreferences: {
    contextIsolation: false, // Allows prototype pollution
  },
});

// Web security disabled
new BrowserWindow({
  webPreferences: {
    webSecurity: false, // Allows loading insecure content
  },
});

// Sandbox disabled
new BrowserWindow({
  webPreferences: {
    sandbox: false,
  },
});
```

### ✅ Correct

```typescript
// Secure Electron configuration
new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    preload: path.join(__dirname, 'preload.js'),
  },
});

// Secure preload script
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  sendMessage: (channel, data) => {
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
});

// Validate IPC channels
ipcMain.handle('safe-channel', async (event, arg) => {
  // Validate and process
  return sanitizedResult;
});
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-electron-security-issues': ['error', {
      allowInDev: false,
      safePreloadPatterns: ['preload.js', 'preload.ts'],
      allowedIpcChannels: ['safe-channel', 'app:*']
    }]
  }
}
```

## Options

| Option                | Type       | Default          | Description                            |
| --------------------- | ---------- | ---------------- | -------------------------------------- |
| `allowInDev`          | `boolean`  | `false`          | Allow insecure settings in development |
| `safePreloadPatterns` | `string[]` | `['preload.js']` | Safe preload script patterns           |
| `allowedIpcChannels`  | `string[]` | `[]`             | Allowed IPC channels                   |

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
⚠️ CWE-16 OWASP:A02 CVSS:5.3 | Configuration detected | MEDIUM
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A02_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-16](https://cwe.mitre.org/data/definitions/16.html) [OWASP:A02](https://owasp.org/Top10/A02_2021-Injection/) CVSS Score |
| **Issue Description** | Specific vulnerability | `Configuration detected` |
| **Severity & Compliance** | Impact assessment | `MEDIUM` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A02_2021-Injection/) |

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Values stored in variables are not traced.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
```

**Mitigation**: Validate all user inputs.

### Wrapper Functions

**Why**: Custom wrappers not recognized.

```typescript
// ❌ NOT DETECTED - Wrapper
myWrapper(userInput); // Uses dangerous API internally
```

**Mitigation**: Apply rule to wrapper implementations.

### Dynamic Invocation

**Why**: Dynamic calls not analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic
obj[method](userInput);
```

**Mitigation**: Avoid dynamic method invocation.

## Further Reading

- **[Electron Security](https://electronjs.org/docs/tutorial/security)** - Official security guide
- **[CWE-16](https://cwe.mitre.org/data/definitions/16.html)** - Configuration issues
- **[OWASP Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)** - General misconfiguration info
- **[Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security#checklist-security-recommendations)** - Security recommendations

## Related Rules

- [`no-insufficient-postmessage-validation`](./no-insufficient-postmessage-validation.md) - postMessage validation
- [`detect-eval-with-expression`](./detect-eval-with-expression.md) - Code injection