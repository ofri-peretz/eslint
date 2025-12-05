# no-unchecked-loop-condition

> **Keywords:** unchecked loop, CWE-400, CWE-835, infinite loop, DoS, security

Detects unchecked loop conditions that could cause DoS. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-400 (Uncontrolled Resource Consumption), CWE-835 (Infinite Loop) |
| **Severity** | High (CVSS 7.5) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Buffer, Memory & DoS |

## Rule Details

Loops with unchecked conditions can cause denial of service by consuming excessive CPU time or memory. This includes:
- Infinite loops without termination
- Loops with user-controlled bounds
- Recursion without depth limits
- Missing timeout protections

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 🔄 **Infinite Loop** | Service unavailable | Add termination conditions |
| ⏱️ **CPU Exhaustion** | Performance degradation | Limit iterations |
| 💾 **Memory Exhaustion** | Application crash | Add timeout protection |

## Examples

### ❌ Incorrect

```typescript
// Infinite loop
while (true) {
  processItem();
}

// User-controlled loop bound
const iterations = parseInt(req.query.count);
for (let i = 0; i < iterations; i++) {
  doWork(); // Could run billions of times!
}

// No termination condition
let node = head;
while (node) {
  process(node);
  node = node.next; // Circular reference = infinite loop
}

// Unbounded recursion
function recurse(data) {
  return recurse(data.child);
}
```

### ✅ Correct

```typescript
// While loop with break condition
let attempts = 0;
const MAX_ATTEMPTS = 100;
while (true) {
  if (processItem() || attempts++ >= MAX_ATTEMPTS) {
    break;
  }
}

// Limit user-controlled iterations
const MAX_ITERATIONS = 1000;
const iterations = Math.min(
  parseInt(req.query.count) || 0,
  MAX_ITERATIONS
);
for (let i = 0; i < iterations; i++) {
  doWork();
}

// Cycle detection
const visited = new Set();
let node = head;
while (node && !visited.has(node)) {
  visited.add(node);
  process(node);
  node = node.next;
}

// Bounded recursion
function recurse(data, depth = 0, maxDepth = 100) {
  if (depth >= maxDepth) return null;
  return recurse(data.child, depth + 1, maxDepth);
}
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-unchecked-loop-condition': ['error', {
      maxStaticIterations: 10000,
      userInputVariables: ['req', 'request', 'input'],
      allowWhileTrueWithBreak: true,
      maxRecursionDepth: 100
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxStaticIterations` | `number` | `10000` | Maximum allowed static iterations |
| `userInputVariables` | `string[]` | `['req', 'request']` | User input variable patterns |
| `allowWhileTrueWithBreak` | `boolean` | `true` | Allow while(true) with break |
| `maxRecursionDepth` | `number` | `100` | Maximum recursion depth |

## Error Message Format

```
🔒 CWE-400 OWASP:A05-Misconfig CVSS:7.5 | Unchecked Loop Condition | HIGH [SOC2,PCI-DSS]
   Fix: Add termination condition or iteration limit | https://cwe.mitre.org/...
```

## Further Reading

- **[CWE-400](https://cwe.mitre.org/data/definitions/400.html)** - Uncontrolled resource consumption
- **[CWE-835](https://cwe.mitre.org/data/definitions/835.html)** - Loop with unreachable exit condition
- **[OWASP DoS](https://owasp.org/www-community/attacks/Denial_of_Service)** - DoS prevention

## Related Rules

- [`no-unlimited-resource-allocation`](./no-unlimited-resource-allocation.md) - Unbounded allocations
- [`no-redos-vulnerable-regex`](./no-redos-vulnerable-regex.md) - ReDoS patterns

