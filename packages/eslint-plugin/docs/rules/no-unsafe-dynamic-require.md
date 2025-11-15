# no-unsafe-dynamic-require

> **Keywords:** require, code injection, security, ESLint rule, dynamic require, path traversal, arbitrary code execution, module loading, auto-fix, LLM-optimized, code security

Disallows dynamic `require()` calls with non-literal arguments that could lead to security vulnerabilities. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) and provides LLM-optimized error messages with fix suggestions.

⚠️ This rule **_warns_** by default in the `recommended` config.

## Quick Summary

| Aspect         | Details                                                      |
| -------------- | ------------------------------------------------------------ |
| **Severity**   | Warning (security best practice)                             |
| **Auto-Fix**   | ⚠️ Suggests fixes (manual application)                       |
| **Category**   | Security                                                     |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                      |
| **Best For**   | Node.js applications, plugin systems, dynamic module loading |

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
    '@forge-js/llm-optimized/no-unsafe-dynamic-require': ['error', {
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
    '@forge-js/llm-optimized/no-unsafe-dynamic-require': ['error', {
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
🚨 Security: Unsafe Dynamic Require | require(userInput) | src/plugins.ts:42
   ❌ Current: const module = require(userProvidedPath)
   ✅ Fix: Use whitelist: const allowed = { 'plugin1': './plugins/plugin1' }; require(allowed[userInput])
   📚 https://nodejs.org/en/docs/guides/security/
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

This rule is available in `@forge-js/eslint-plugin-llm-optimized` v0.0.1+
