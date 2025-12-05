# no-electron-security-issues

> **Keywords:** Electron, CWE-16, nodeIntegration, contextIsolation, desktop security

Detects Electron security vulnerabilities and insecure configurations. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-16 (Configuration) |
| **Severity** | High (CVSS 8.8) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Platform-Specific |

## Rule Details

Electron applications can be vulnerable when not properly configured. Insecure settings allow attackers to:
- Execute arbitrary Node.js code from renderer
- Bypass context isolation protections
- Perform privilege escalation
- Access sensitive system resources

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 💻 **RCE** | Full system compromise | Disable nodeIntegration |
| 🔓 **Privilege Escalation** | Admin access | Enable contextIsolation |
| 🌐 **XSS to RCE** | Remote code execution | Enable sandbox |

## Examples

### ❌ Incorrect

```typescript
// Node integration enabled (critical vulnerability)
new BrowserWindow({
  webPreferences: {
    nodeIntegration: true, // DANGEROUS!
  }
});

// Context isolation disabled
new BrowserWindow({
  webPreferences: {
    contextIsolation: false, // Allows prototype pollution
  }
});

// Web security disabled
new BrowserWindow({
  webPreferences: {
    webSecurity: false, // Allows loading insecure content
  }
});

// Sandbox disabled
new BrowserWindow({
  webPreferences: {
    sandbox: false,
  }
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
  }
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
  }
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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowInDev` | `boolean` | `false` | Allow insecure settings in development |
| `safePreloadPatterns` | `string[]` | `['preload.js']` | Safe preload script patterns |
| `allowedIpcChannels` | `string[]` | `[]` | Allowed IPC channels |

## Error Message Format

```
🔒 CWE-16 OWASP:A05-Misconfig CVSS:8.8 | Electron Security Issue | HIGH [SOC2,PCI-DSS]
   Fix: Set nodeIntegration: false and use secure preload scripts | https://electronjs.org/docs/tutorial/security
```

## Further Reading

- **[Electron Security](https://electronjs.org/docs/tutorial/security)** - Official security guide
- **[CWE-16](https://cwe.mitre.org/data/definitions/16.html)** - Configuration issues
- **[Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security#checklist-security-recommendations)** - Security recommendations

## Related Rules

- [`no-insufficient-postmessage-validation`](./no-insufficient-postmessage-validation.md) - postMessage validation
- [`detect-eval-with-expression`](./detect-eval-with-expression.md) - Code injection

