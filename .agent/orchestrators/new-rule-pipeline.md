---
type: orchestrator
name: New Rule Pipeline
agents:
  - security
  - eslint
---

# New Rule Pipeline Orchestrator

Multi-step orchestration for creating new ESLint security rules.

## Usage

```
/pipeline new-rule: Create rule for detecting insecure JWT verification
```

## Pipeline Steps

### Step 1: Security Research (Security Agent)

1. Research the vulnerability pattern
2. Find OWASP/CVE references
3. Document attack vectors
4. Identify detection patterns

**Output**: Security brief with:

- Vulnerability description
- Code patterns to detect
- Safe alternatives

### Step 2: Rule Implementation (ESLint Agent)

1. Create rule file structure
2. Implement AST detection logic
3. Add proper meta information
4. Write comprehensive tests

**Directory**:

```
packages/<plugin>/src/rules/<rule-name>/
├── index.ts
├── index.test.ts
└── README.md
```

### Step 3: Documentation

1. Generate rule README with examples
2. Update plugin README rule table
3. Add to CHANGELOG

### Step 4: Verification

// turbo

```bash
nx run <package>:test
```

// turbo

```bash
nx run <package>:lint
```

### Step 5: Benchmark Update

Add vulnerable pattern to `benchmark/vulnerable.js`
Run benchmark to verify detection

## Example Flow

**Request**: Create rule for detecting hardcoded JWT secrets

**Step 1 Output**:

> JWT secrets should never be hardcoded. Look for `jwt.sign()` or `jwt.verify()`
> calls where the secret is a string literal.

**Step 2 Output**:

```typescript
// Detect jwt.sign(payload, "hardcoded-secret")
'CallExpression[callee.property.name="sign"]'(node) {
  if (node.arguments[1]?.type === 'Literal') {
    context.report({ node, messageId: 'hardcodedJwtSecret' });
  }
}
```
