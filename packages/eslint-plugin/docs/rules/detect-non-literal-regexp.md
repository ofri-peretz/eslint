# detect-non-literal-regexp

Detects `RegExp(variable)`, which might allow an attacker to DOS your server with a long-running regular expression.

**🚨 Security rule** | **💡 Provides LLM-optimized guidance** | **⚠️ Set to error in `recommended`**

## Rule Details

This rule detects dangerous use of RegExp constructor with dynamic patterns that can lead to Regular Expression Denial of Service (ReDoS) attacks.

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
    A[🔍 Detect RegExp Call] --> B{Dynamic Pattern?}
    B -->|Yes| C[🚨 ReDoS Risk]
    B -->|No| D[✅ Literal Pattern - Safe]

    C --> E{Contains ReDoS Patterns?}
    E -->|Nested Quantifiers| F[⚠️ Exponential Backtracking]
    E -->|Complex Groups| G[⚠️ Potential ReDoS]
    E -->|Simple Dynamic| H[⚠️ General Risk]

    F --> I[💡 Suggest restructure]
    G --> I
    H --> J[💡 Suggest static patterns]

    I --> K[📝 LLM-Optimized Guidance]
    J --> K
```

## Error Message Format

```
🚨 Security: ReDoS Vulnerability | new RegExp(userPattern) | src/validation.ts:67
📊 Risk Level: HIGH (CWE-400: Uncontrolled Resource Consumption)
🔍 Issue: ReDoS allows server resource exhaustion
💡 Safe Alternative: Pre-defined RegExp constants
🔧 Refactoring Steps:
   1. Create a whitelist of allowed regex patterns
   2. Use object lookup: PATTERNS[userChoice]
   3. If dynamic needed: escape input with regex escaping function
   4. Add pattern length validation
   5. Consider using a safe regex library
⏱️  Estimated effort: 15-20 minutes
🔗 Security Impact: Prevents server DoS attacks
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowLiterals` | `boolean` | `false` | Allow literal string regex patterns |
| `additionalPatterns` | `string[]` | `[]` | Additional RegExp creation patterns |
| `maxPatternLength` | `number` | `100` | Maximum allowed pattern length |

## Examples

### ❌ Incorrect

```typescript
// ReDoS - CRITICAL risk
new RegExp(userInput); // Attacker can cause exponential backtracking

// Complex dynamic patterns - HIGH risk
RegExp(`^${userPattern}$`); // Unvalidated pattern construction

// ReDoS in literal regex - MEDIUM risk
/(a+)+b/.test(input); // Nested quantifiers cause backtracking
```

### ✅ Correct

```typescript
// Pre-defined patterns
const PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  url: /^https?:\/\/[^\s/$.?#].[^\s]*$/i
};

// Safe usage
if (PATTERNS[userChoice]) {
  const result = PATTERNS[userChoice].test(input);
}

// Dynamic with escaping
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const safePattern = new RegExp(`^${escapeRegex(userInput)}$`);

// Length validation
if (userPattern.length > 100) {
  throw new Error('Pattern too long');
}
```

## ReDoS Prevention

### Understanding ReDoS

```javascript
// ❌ Vulnerable: Nested quantifiers
/(a+)+b/.test('aaaaaaaaaaaaaab'); // Exponential backtracking

// ✅ Safe: Restructure
/a+b/.test('aaaaaaaaaaaaaab'); // Linear time
```

### Safe Alternatives

1. **Pre-defined Patterns**
   ```typescript
   const SAFE_PATTERNS = {
     email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
     uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
   };
   ```

2. **Input Escaping**
   ```typescript
   function escapeRegex(string: string): string {
     return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
   }
   ```

3. **Safe Libraries**
   ```typescript
   import safeRegex from 'safe-regex';
   if (safeRegex(userPattern)) {
     new RegExp(userPattern);
   }
   ```

## Common ReDoS Patterns

| Pattern | Risk | Example | Safe Alternative |
|---------|------|---------|------------------|
| `(a+)+` | Critical | `/(a+)+b/` | `/a+b/` |
| `(a*)*` | Critical | `/(a*)*b/` | `/a*b/` |
| `(a\|b)*` | High | Complex alternations | Simplify |
| `.*` | Medium | Greedy matching | Be specific |

## Migration Guide

### Phase 1: Discovery
```javascript
{
  rules: {
    '@forge-js/detect-non-literal-regexp': 'warn'
  }
}
```

### Phase 2: Replace Dynamic Construction
```typescript
// Replace dynamic RegExp
new RegExp(userInput) → PATTERNS[userChoice]

// Add escaping for necessary dynamic patterns
new RegExp(escapeRegex(userInput))
```

### Phase 3: Test Performance
```typescript
// Test with potentially malicious inputs
const maliciousInputs = [
  'a'.repeat(10000) + 'b',  // Triggers backtracking
  '(a+)+b'.repeat(1000),    // Complex patterns
  '[a-z]*'.repeat(100)      // Nested quantifiers
];
```

## Related Rules

- `detect-eval-with-expression` - Code injection prevention
- `detect-child-process` - Command injection prevention
- `detect-non-literal-fs-filename` - Path traversal prevention
- `detect-object-injection` - Prototype pollution prevention

## Further Reading

- [OWASP ReDoS Attacks](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [Safe Regex Library](https://github.com/substack/safe-regex)
- [CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)
