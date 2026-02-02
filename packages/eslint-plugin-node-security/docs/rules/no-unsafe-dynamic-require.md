---
title: no-unsafe-dynamic-require
description: Disallows dynamic require() calls with non-literal arguments that could lead to security vulnerabilities
tags: ['security', 'node']
category: security
severity: medium
cwe: CWE-494
autofix: false
---

> **Keywords:** require, code injection, security, ESLint rule, dynamic require, path traversal, arbitrary code execution, module loading, auto-fix, LLM-optimized, code security

<!-- @rule-summary -->
Disallows dynamic require() calls with non-literal arguments that could lead to security vulnerabilities
<!-- @/rule-summary -->

**CWE:** [CWE-494](https://cwe.mitre.org/data/definitions/494.html)  
**OWASP Mobile:** [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)

Disallows dynamic `require()` calls with non-literal arguments that could lead to security vulnerabilities. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with fix suggestions.

⚠️ This rule **_warns_** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-706](https://cwe.mitre.org/data/definitions/706.html) (Incorrect Resolution) |
| **Severity**      | Warning (security best practice)                                                  |
| **Auto-Fix**      | ⚠️ Suggests fixes (manual application)                                            |
| **Category**   | Security |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                           |
| **Best For**      | Node.js applications, plugin systems, dynamic module loading                      |

## Vulnerability and Risk

**Vulnerability:** Dynamic `require()` (or "dynamic imports") allows an application to load modules based on variable input. If this input is controlled by a user, it can be manipulated.

**Risk:** Attackers can manipulate the input to load malicious code (Remote Code Execution) or read sensitive files from the server's filesystem that were not intended to be exposed (Information Disclosure).

## Rule Details

Dynamic `require()` calls with user-controlled input can lead to:

- **Arbitrary code execution**: Attackers loading malicious modules
- **Path traversal attacks**: Reading files outside intended directories
- **Data exfiltration**: Accessing sensitive configuration files

## Examples

### ❌ Incorrect

```typescript
// User input in require
const userModule = require(req.params.moduleName);

// String concatenation
const config = require('./configs/' + environment);

// Template literals with variables
const plugin = require(`./plugins/${pluginName}`);

// Variable paths
const modulePath = getUserInput();
const module = require(modulePath);
```

### ✅ Correct

```typescript
// Static require
const config = require('./config/production');

// Whitelist approach
const allowedModules = {
  config: './config',
  utils: './utils',
};
const modulePath = allowedModules[userInput];
if (modulePath) {
  const module = require(modulePath);
}

// Import maps (hardcoded)
const modules = {
  dev: require('./config/dev'),
  prod: require('./config/prod'),
};
const config = modules[environment];

// ES6 dynamic import with validation
async function loadModule(name: string) {
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error('Invalid module name');
  }
  return await import(`./plugins/${name}`);
}
```

## Configuration

```javascript
{
  rules: {
    'node-security/no-unsafe-dynamic-require': ['error', {
      allowDynamicImport: true  // Allow dynamic import() but warn on require()
    }]
  }
}
```

## Options

| Option               | Type      | Default | Description                                                     |
| -------------------- | --------- | ------- | --------------------------------------------------------------- |
| `allowDynamicImport` | `boolean` | `false` | Allow ES6 dynamic `import()` (generally safer than `require()`) |

### Allow Dynamic Import

```javascript
{
  rules: {
    'node-security/no-unsafe-dynamic-require': ['error', {
      allowDynamicImport: true
    }]
  }
}
```

```typescript
// ❌ Still flags require()
const module = require(modulePath);

// ✅ Allows dynamic import()
const module = await import(`./plugins/${pluginName}`);
```

## Error Message Format

This rule provides LLM-optimized error messages:

```
🚨 CWE-407 | Unsafe dynamic require detected | CRITICAL
   Fix: Use whitelist: const allowed = { 'plugin1': './plugins/plugin1' }; require(allowed[userInput]) | https://nodejs.org/en/docs/guides/security/
```

**Why this format?**

- **Structured** - AI assistants can parse and understand
- **Actionable** - Shows both problem and solution
- **Educational** - Includes security best practices
- **Auto-fixable** - AI can apply the fix automatically

## When Not To Use It

| Scenario              | Recommendation                                           |
| --------------------- | -------------------------------------------------------- |
| **Build Scripts**     | Disable for build scripts with trusted sources           |
| **Sandboxed Plugins** | Disable for properly sandboxed plugin systems            |
| **Validated Imports** | Disable for dynamic imports with validation/whitelisting |

## Comparison with Alternatives

| Feature                       | no-unsafe-dynamic-require | eslint-plugin-security | eslint-plugin-node |
| ----------------------------- | ------------------------- | ---------------------- | ------------------ |
| **Dynamic Require Detection** | ✅ Yes                    | ⚠️ Limited             | ⚠️ Limited         |
| **LLM-Optimized**             | ✅ Yes                    | ❌ No                  | ❌ No              |
| **ESLint MCP**                | ✅ Optimized              | ❌ No                  | ❌ No              |
| **Fix Suggestions**           | ✅ Detailed               | ⚠️ Basic               | ⚠️ Basic           |
| **Dynamic Import Support**    | ✅ Configurable           | ❌ No                  | ⚠️ Limited         |

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

- **[Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)** - Node.js security guidelines
- **[OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)** - Path traversal attack guide
- **[Arbitrary Code Execution Risks](https://snyk.io/blog/javascript-code-injection/)** - Code injection prevention
- **[ESLint MCP Setup](https://eslint.org/docs/latest/use/mcp)** - Enable AI assistant integration

## Related Rules

- [`no-sql-injection`](./no-sql-injection.md) - Prevents SQL injection vulnerabilities
- [`detect-eval-with-expression`](./detect-eval-with-expression.md) - Prevents code injection via eval()
- [`detect-non-literal-fs-filename`](./detect-non-literal-fs-filename.md) - Prevents path traversal

## Version

This rule is available in `eslint-plugin-node-security` v0.0.1+