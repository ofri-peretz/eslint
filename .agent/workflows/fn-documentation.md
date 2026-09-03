---
description: Standards for adding Known False Negatives documentation to ESLint rule docs
---

# False Negatives (FN) Documentation Standard

This workflow defines the standard for documenting Known False Negatives in ESLint rule documentation. **All rules must include FN documentation** to ensure transparency with users about static analysis limitations.

## 🎯 Purpose

Static analysis cannot detect all vulnerability patterns. By documenting what the rule **cannot** detect, we:

1. Build trust through transparency
2. Help users understand limitations
3. Enable LLM agents to supplement with runtime checks
4. Reduce false confidence in tooling

## 📋 Required Section

Every rule doc in `packages/*/docs/rules/*.md` MUST include this section:

```markdown
## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### [Pattern Name]

**Why**: [Brief explanation of why static analysis cannot detect this]

\`\`\`typescript
// ❌ NOT DETECTED
[code example showing the vulnerable pattern that won't be caught]
\`\`\`

**Mitigation**: [How users can address this gap - e.g., runtime validation, code review]
```

## 📝 FN Categories

Common FN categories to check for each rule:

### 1. Dynamic Values

```typescript
// Variable interpolation from external sources
const query = queries[userInput]; // Dynamic lookup - not tracked
```

### 2. Indirect Calls

```typescript
// Wrapped/aliased function calls
const myQuery = db.query.bind(db);
myQuery(unsafeInput); // Alias not tracked
```

### 3. Destructured References

```typescript
// Destructured properties
const { query } = pool;
query(unsafeInput); // Destructured - not tracked
```

### 4. Cross-File Data Flow

```typescript
// Value from imported module
import { getQuery } from './queries';
db.query(getQuery()); // Cross-file - not tracked
```

### 5. Callback/Promise Chains

```typescript
// Deeply nested async patterns
fetchData().then((d) => processAndQuery(d)); // Complex flow - not tracked
```

### 6. Runtime Type Coercion

```typescript
// Type coercion that changes security properties
const id = Number(userInput); // Is this safe? Depends on usage
```

### 7. Conditional Execution

```typescript
// Runtime conditions
if (Math.random() > 0.5) {
  db.query(userInput); // Conditional - may or may not execute
}
```

## ✅ Process for Adding FN Docs

// turbo-all

1. **Analyze the rule source code**

   ```bash
   # View the rule implementation
   cat packages/<plugin>/src/rules/<rule-name>/index.ts
   ```

2. **Identify AST selectors used**
   - What node types does the rule check?
   - What patterns does it track?

3. **List detection gaps**
   - What node types are NOT checked?
   - What variable tracking is missing?
   - What cross-file analysis would be needed?

4. **Write FN documentation**
   - Create realistic code examples
   - Explain WHY each pattern is missed
   - Suggest mitigations

5. **Add to rule doc**

   ```bash
   # Edit the rule documentation
   vim packages/<plugin>/docs/rules/<rule-name>.md
   ```

6. **Verify with tests**
   ```bash
   # Ensure tests don't cover these FN patterns (they shouldn't!)
   pnpm nx test <plugin> --testPathPattern="<rule-name>"
   ```

## 📊 Template

Copy this template for new FN sections:

```markdown
## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Variable Resolution

**Why**: The rule tracks literal identifiers but cannot resolve values from dynamic property access, computed properties, or external sources.

\`\`\`typescript
// ❌ NOT DETECTED - Dynamic key access
const queries = { getUser: 'SELECT \* FROM users WHERE id = ' + userId };
db.query(queries[action]); // 'action' value unknown at lint time
\`\`\`

**Mitigation**: Use parameterized queries with explicit variable names. Consider runtime query validation.

### Cross-Module Data Flow

**Why**: ESLint rules analyze one file at a time. Values imported from other modules cannot be traced.

\`\`\`typescript
// ❌ NOT DETECTED - Imported value
import { buildQuery } from './query-builder';
db.query(buildQuery(userInput)); // buildQuery internals unknown
\`\`\`

**Mitigation**: Apply the same rule to the imported module. Use TypeScript branded types for validated inputs.

### Wrapped/Aliased Functions

**Why**: The rule matches specific method names. Aliases or wrapper functions are not tracked.

\`\`\`typescript
// ❌ NOT DETECTED - Function alias
const executeQuery = db.query.bind(db);
executeQuery(unsafeInput); // 'executeQuery' not recognized as db.query
\`\`\`

**Mitigation**: Avoid aliasing security-sensitive functions. Use direct method calls.
```

## 🔍 Audit Command

Check FN documentation coverage:

```bash
# Count rules with FN docs per plugin
for plugin in packages/eslint-plugin-*; do
  name=$(basename $plugin)
  total=$(find $plugin/docs/rules -name "*.md" 2>/dev/null | wc -l)
  has_fn=$(grep -l -rE "(False Negative|Known FN)" $plugin/docs/rules/*.md 2>/dev/null | wc -l)
  echo "$name: $has_fn/$total"
done
```

## 📈 Coverage Target

| Milestone | Target                                      | Deadline |
| --------- | ------------------------------------------- | -------- |
| Phase 1   | Security-critical plugins (pg, jwt, crypto) | Week 1   |
| Phase 2   | Framework plugins (express, nestjs, lambda) | Week 2   |
| Phase 3   | All remaining plugins                       | Week 3   |

**Goal: 100% of rules have FN documentation**
