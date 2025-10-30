# no-unsafe-dynamic-require

Disallows dynamic `require()` calls with non-literal arguments that could lead to security vulnerabilities.

⚠️ This rule **_warns_** by default in the `recommended` config.

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
  'config': './config',
  'utils': './utils'
};
const modulePath = allowedModules[userInput];
if (modulePath) {
  const module = require(modulePath);
}

// Import maps (hardcoded)
const modules = {
  dev: require('./config/dev'),
  prod: require('./config/prod')
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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
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

## When Not To Use It

- In build scripts where module paths are always from trusted sources
- When using a plugin system with proper sandboxing
- For dynamic imports that are already validated/whitelisted

## Further Reading

- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [Arbitrary Code Execution Risks](https://snyk.io/blog/javascript-code-injection/)

## Version

This rule is available in `@forge-js/eslint-plugin-llm-optimized` v0.0.1+

