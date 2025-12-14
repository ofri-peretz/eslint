# RuleTester Coverage Limitations

This document explains the patterns of unreachable code in ESLint rules when testing with `@typescript-eslint/rule-tester`. Understanding these limitations helps distinguish between:

- **Redundant code** that should be removed
- **Valid but untestable code** that should be marked with `/* c8 ignore */`

## When to Use `c8 ignore` Comments

Use `/* c8 ignore start */` / `/* c8 ignore stop */` for code that:

1. ✅ Is valid and serves a purpose in real-world usage
2. ✅ Cannot be exercised through RuleTester due to structural limitations
3. ✅ Would require complex runtime conditions not reproducible in tests

**Do NOT use `c8 ignore` for:**

- ❌ Redundant/dead code that can be removed
- ❌ Code that can be tested with more comprehensive test cases
- ❌ Error handling that can be triggered with edge case inputs

---

## Pattern 1: Safety Checker Early Returns

### Description

Many rules use `createSafetyChecker()` from `@interlace/eslint-devkit` for false positive reduction. The `safetyChecker.isSafe()` call returns `true` when JSDoc annotations like `@safe` or `@validated` are present, or when the code is wrapped in trusted sanitization functions.

### Why Untestable

RuleTester provides code as plain strings, so adding JSDoc comments or context that triggers the safety checker requires specific AST structures that are hard to reproduce:

```typescript
// This safety check is hard to trigger in tests because RuleTester
// doesn't easily support the context needed for isSafe() to return true
if (safetyChecker.isSafe(node, context)) {
  return; // ← This line often goes uncovered
}
```

### Example - `no-buffer-overread`

```typescript
/* c8 ignore start -- safetyChecker.isSafe requires JSDoc annotations not easily testable */
if (safetyChecker.isSafe(node, context)) {
  return;
}
/* c8 ignore stop */
```

---

## Pattern 2: AST Traversal Edge Cases

### Description

When traversing up/down the AST tree, some code paths handle edge cases that rarely occur in isolation:

- Parent node doesn't exist
- Specific node type combinations
- Scope traversal hitting the root

### Why Untestable

RuleTester tests individual code snippets where these edge cases don't naturally arise.

### Example - `no-unsanitized-html` (removed in cleanup)

The `isInsideSanitizationCall` function's while loop traversing parents was redundant because direct sanitization checks already covered all practical cases.

---

## Pattern 3: Redundant Type Narrowing After Text Matching

### Description

A common anti-pattern is checking a text representation first, then doing the same check with AST type narrowing:

```typescript
// Text-based check catches ALL cases
if (roleCheckPatterns.some((p) => conditionText.includes(p))) {
  return true;
}

// This AST-based check is REDUNDANT - never reached
if (ifStmt.test.type === 'CallExpression') {
  const calleeName = callee.name.toLowerCase();
  if (roleCheckPatterns.some((p) => calleeName.includes(p))) {
    return true; // ← Never reached because text check above caught it
  }
}
```

### Resolution

**Remove the redundant code** - don't use `c8 ignore`. The text-based check is sufficient.

---

## Pattern 4: File System / Runtime Operations

### Description

Code that interacts with the file system or requires runtime context:

- `fs.existsSync()` checks
- `process.cwd()` operations
- Dynamic module loading

### Why Untestable

RuleTester operates on code strings, not on a real file system.

### Example - `require-package-lock`

```typescript
/* c8 ignore start -- requires actual file system access */
while (currentDir !== path.dirname(currentDir) && depth < maxDepth) {
  const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
  for (const lockFile of lockFiles) {
    if (fs.existsSync(path.join(currentDir, lockFile))) {
      return; // Lock file found, safe
    }
  }
  currentDir = path.dirname(currentDir);
  depth++;
}
/* c8 ignore stop */
```

---

## Pattern 5: Scope Variable Tracing

### Description

Code that traces variable definitions through scope chains:

```typescript
let currentScope = sourceCode.getScope(indexNode);
let variable = null;
while (currentScope) {
  variable = currentScope.variables.find((v) => v.name === indexNode.name);
  if (variable) break;
  currentScope = currentScope.upper; // ← Traversing scope chain
}
```

### Why Sometimes Untestable

The scope chain in simple test snippets is often shallow, so deep traversal doesn't occur.

### Resolution

Usually **add more comprehensive tests** with nested scopes rather than `c8 ignore`.

---

## How to Apply c8 Ignore

### Single Line

```typescript
/* c8 ignore next */
if (safetyChecker.isSafe(node, context)) return;
```

### Multiple Lines

```typescript
/* c8 ignore start -- [reason] */
if (safetyChecker.isSafe(node, context)) {
  return;
}
/* c8 ignore stop */
```

### Inline (single statement)

```typescript
return /* c8 ignore next */ safetyChecker.isSafe(node, context);
```

---

## Rules with Known Untestable Patterns

| Rule                               | Pattern        | Lines               | Reason                                |
| ---------------------------------- | -------------- | ------------------- | ------------------------------------- |
| `no-buffer-overread`               | Safety checker | 596, 615, 659, 687  | `isSafe()` requires JSDoc annotations |
| `no-unchecked-loop-condition`      | Safety checker | 539, 582, 604, etc. | `isSafe()` requires JSDoc annotations |
| `no-unlimited-resource-allocation` | Safety checker | Multiple            | `isSafe()` requires JSDoc annotations |

---

## Summary

1. **Remove** redundant code (Pattern 3)
2. **Add tests** for edge cases that CAN be tested (Pattern 5)
3. **Use `c8 ignore`** for legitimate untestable code (Patterns 1, 4)
4. **Document** any new patterns discovered
