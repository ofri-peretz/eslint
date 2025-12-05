# no-unsafe-deserialization

> **Keywords:** unsafe deserialization, CWE-502, RCE, code execution, YAML, pickle, security

Detects unsafe deserialization of untrusted data. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-502 (Unsafe Deserialization) |
| **Severity** | Critical (CVSS 9.8) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Object & Prototype |

## Rule Details

Unsafe deserialization occurs when untrusted data is deserialized in a way that allows attackers to execute arbitrary code or manipulate application logic. This includes:
- Using `eval()` or `Function()` on untrusted data
- YAML parsers that execute code
- JSON with prototype pollution
- Insecure serialization libraries

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 💻 **RCE** | Full system compromise | Use safe deserializers |
| 🎭 **Object Manipulation** | Logic bypass | Validate before deserializing |
| 🔓 **Auth Bypass** | Unauthorized access | Use JSON.parse() for JSON data |

## Examples

### ❌ Incorrect

```typescript
// eval() for deserialization
const data = eval('(' + userInput + ')');

// Function constructor with user input
const fn = new Function('return ' + userInput);
const data = fn();

// YAML.load() without safe mode
import yaml from 'js-yaml';
const config = yaml.load(userYaml); // Can execute code!

// Unsafe serialization libraries
const obj = serialize.unserialize(userInput);
```

### ✅ Correct

```typescript
// Use JSON.parse() for JSON data
const data = JSON.parse(userInput);

// YAML with safeLoad
import yaml from 'js-yaml';
const config = yaml.safeLoad(userYaml);
// Or with explicit safe schema
const config = yaml.load(userYaml, { schema: yaml.SAFE_SCHEMA });

// Validate before deserialization
if (isValidJson(userInput)) {
  const data = JSON.parse(userInput);
}

// Use safe serialization libraries
import { safeDeserialize } from 'safe-serialize';
const obj = safeDeserialize(userInput);
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-unsafe-deserialization': ['error', {
      dangerousFunctions: ['eval', 'Function', 'serialize.unserialize'],
      safeLibraries: ['safe-serialize', 'json5'],
      validationFunctions: ['isValidJson', 'validateInput']
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dangerousFunctions` | `string[]` | `['eval', 'Function', 'unserialize']` | Dangerous deserialization functions |
| `safeLibraries` | `string[]` | `['safe-serialize']` | Safe deserialization libraries |
| `validationFunctions` | `string[]` | `['isValidJson', 'validateInput']` | Input validation functions |

## Error Message Format

```
🔒 CWE-502 OWASP:A08-Integrity CVSS:9.8 | Unsafe Deserialization | CRITICAL [SOC2,PCI-DSS,HIPAA]
   Fix: Use JSON.parse() or safe deserialization libraries | https://cwe.mitre.org/...
```

## Further Reading

- **[OWASP Deserialization](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/16-Testing_for_Insecure_Deserialization)** - Testing guide
- **[CWE-502](https://cwe.mitre.org/data/definitions/502.html)** - Official CWE entry
- **[js-yaml Security](https://www.npmjs.com/package/js-yaml#security)** - YAML security

## Related Rules

- [`detect-eval-with-expression`](./detect-eval-with-expression.md) - eval() injection
- [`detect-object-injection`](./detect-object-injection.md) - Prototype pollution

