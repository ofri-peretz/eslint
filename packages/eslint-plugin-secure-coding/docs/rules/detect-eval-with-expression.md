# detect-eval-with-expression

> **Keywords:** eval, code injection, CWE-95, security, ESLint rule, remote code execution, RCE, arbitrary code execution, Function constructor, auto-fix, LLM-optimized, code security

Detects `eval(variable)` which can allow an attacker to run arbitrary code inside your process. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) and provides LLM-optimized error messages with fix suggestions.

**🚨 Security rule** | **💡 Provides LLM-optimized guidance** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-95 (Code Injection) |
| **Severity** | Critical (security vulnerability) |
| **Auto-Fix** | ⚠️ Suggests fixes (manual application) |
| **Category** | Security |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For** | All applications, especially those handling user input |

## Rule Details

This rule detects dangerous use of `eval()` and `Function()` constructor with dynamic expressions that can lead to remote code execution (RCE) vulnerabilities.

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f8fafc',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#334155',
    'lineColor': '#475569',
    'c0': '#f8fafc',
    'c1': '#f1f5f9',
    'c2': '#e2e8f0',
    'c3': '#cbd5e1'
  }
}}%%
flowchart TD
    A[📝 Detect eval() Call] --> B{Contains Dynamic Expression?}
    B -->|Yes| C[🔍 Analyze Pattern]
    B -->|No| D[✅ Safe - Skip]

    C --> E{Recognized Pattern?}
    E -->|JSON| F[💡 Suggest JSON.parse]
    E -->|Math| G[💡 Suggest Math functions]
    E -->|Template| H[💡 Suggest Template literals]
    E -->|Object| I[💡 Suggest Map/Object validation]
    E -->|Unknown| J[💡 Suggest removal]

    F --> K[🚨 Report with LLM guidance]
    G --> K
    H --> K
    I --> K
    J --> K
```

## Error Message Format

The rule provides **LLM-optimized error messages** with actionable security guidance:

```
🚨 Security: Arbitrary Code Execution Risk | eval(userInput) | src/api.ts:45
📊 Risk Level: CRITICAL (CWE-95: Code Injection)
🔍 Issue: eval() with dynamic expression allows arbitrary code execution
💡 Pattern Detected: object access
🔧 Recommended Fix: Direct property access or Map
📝 Refactoring Steps:
   1. Replace eval() with safe alternative
   2. Use direct property access: obj[key] or Map
   3. Validate property names against whitelist
   4. Add input sanitization
⏱️  Estimated effort: 8 minutes
🔗 Security Impact: Prevents Remote Code Execution (RCE)
```

### Message Components

| Component | Purpose | Example |
|-----------|---------|---------|
| **Risk Level** | Security severity | `CRITICAL` |
| **CWE Reference** | Vulnerability type | `CWE-95: Code Injection` |
| **Pattern Detection** | Recognized usage pattern | `object access`, `JSON parsing` |
| **Safe Alternative** | Recommended replacement | `JSON.parse()`, `Map`, etc. |
| **Refactoring Steps** | Concrete fix actions | Numbered step-by-step guide |
| **Time Estimate** | Effort assessment | `8 minutes` |

This format is optimized for:
- 🤖 **LLMs** - Can parse structured guidance and implement fixes
- 👨‍💻 **Developers** - Clear security context and actionable steps
- 📊 **Security Teams** - Proper risk assessment and prioritization

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowLiteralStrings` | `boolean` | `false` | Allow eval with literal strings |
| `additionalEvalFunctions` | `string[]` | `[]` | Additional functions to treat as eval-like |

## Examples

### ❌ Incorrect

```typescript
// Dynamic eval - CRITICAL risk
const result = eval(userInput);

// Function constructor - HIGH risk
const func = new Function('param', userCode);

// Template evaluation - HIGH risk
const output = eval(`Hello ${userName}!`);

// Object property access - MEDIUM risk
const value = eval(`obj.${property}`);

// Math operations - MEDIUM risk
const calc = eval(`${num1} ${operator} ${num2}`);
```

### ✅ Correct

```typescript
// JSON parsing
const data = JSON.parse(userInput);

// Template literals (safe)
const greeting = `Hello ${userName}!`;

// Whitelisted object access
const ALLOWED_PROPS = ['name', 'age', 'email'];
if (ALLOWED_PROPS.includes(property)) {
  const value = obj[property];
}

// Math with validation
const result = calculate(num1, operator, num2);

// Map for dynamic storage
const config = new Map();
config.set(userKey, value);
```

## Pattern Recognition

The rule automatically detects common eval patterns and provides targeted fixes:

### JSON Parsing Pattern
```
❌ eval('{"key": "' + value + '"}')
✅ JSON.parse('{"key": "' + value + '"}')
```

### Object Access Pattern
```
❌ eval('obj.' + property)
✅ const ALLOWED = ['name', 'age']; if (ALLOWED.includes(property)) obj[property]
```

### Template Pattern
```
❌ eval('Hello ' + name + '!')
✅ `Hello ${name}!`
```

### Math Operations Pattern
```
❌ eval(num1 + ' + ' + num2)
✅ const mathOps = { '+': (a, b) => a + b }; mathOps[op](num1, num2)
```

## Security Impact

| Vulnerability | CWE | OWASP | CVSS | Impact |
|---------------|-----|-------|------|--------|
| Code Injection | 95 | A03:2021 | 9.8 Critical | Complete server compromise |
| Command Injection | 78 | A03:2021 | 9.8 Critical | System command execution |
| Prototype Pollution | 915 | A01:2021 | 8.1 High | Object manipulation |

## Why This Matters

### Real-World Exploits

```javascript
// Attacker can execute arbitrary code
const userInput = "process.exit()"; // Server shutdown
eval(userInput); // 💥 Server dies

// Prototype pollution via eval
const userInput = "__proto__.toString = () => 'HACKED'";
eval(userInput); // 💥 All objects polluted
```

### Prevention Strategy

1. **Complete Removal** - Remove eval usage entirely
2. **Safe Alternatives** - Use JSON.parse, Map, template literals
3. **Input Validation** - Whitelist allowed patterns
4. **Sandboxing** - Use vm module if absolutely necessary
5. **Static Analysis** - Prefer compile-time evaluation

## Migration Guide

### Phase 1: Discovery
```javascript
// Enable rule with warnings first
{
  rules: {
    '@forge-js/detect-eval-with-expression': 'warn'
  }
}
```

### Phase 2: Pattern Replacement
```javascript
// Replace common patterns
eval(`obj.${prop}`) → obj[prop] with validation
eval(jsonString) → JSON.parse(jsonString)
eval(mathExpr) → Safe math functions
```

### Phase 3: Enforcement
```javascript
// Strict enforcement
{
  rules: {
    '@forge-js/detect-eval-with-expression': 'error'
  }
}
```

## Comparison with Alternatives

| Feature | detect-eval-with-expression | eslint-plugin-security | eslint-plugin-sonarjs |
|---------|---------------------------|------------------------|----------------------|
| **Code Injection Detection** | ✅ Yes | ⚠️ Limited | ⚠️ Limited |
| **CWE Reference** | ✅ CWE-95 included | ⚠️ Limited | ⚠️ Limited |
| **LLM-Optimized** | ✅ Yes | ❌ No | ❌ No |
| **ESLint MCP** | ✅ Optimized | ❌ No | ❌ No |
| **Fix Suggestions** | ✅ Detailed | ⚠️ Basic | ⚠️ Basic |

## Related Rules

- [`detect-child-process`](./detect-child-process.md) - Prevents command injection
- [`detect-non-literal-fs-filename`](./detect-non-literal-fs-filename.md) - Prevents path traversal
- [`detect-object-injection`](./detect-object-injection.md) - Prevents prototype pollution
- [`detect-non-literal-regexp`](./detect-non-literal-regexp.md) - Prevents ReDoS attacks

## Further Reading

- **[OWASP Code Injection Prevention](https://owasp.org/www-community/attacks/Code_Injection)** - Code injection attack guide
- **[Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)** - Node.js security guidelines
- **[CWE-95: Code Injection](https://cwe.mitre.org/data/definitions/95.html)** - Official CWE entry
- **[ESLint MCP Setup](https://eslint.org/docs/latest/use/mcp)** - Enable AI assistant integration
