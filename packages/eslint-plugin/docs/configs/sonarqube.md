# sonarqube Configuration

SonarQube-inspired code quality rules for advanced analysis.

## Overview

The `sonarqube` configuration provides rules inspired by SonarQube's code quality analysis, including cognitive complexity detection, duplicate function detection, and comprehensive injection prevention. It's ideal for teams familiar with SonarQube metrics or wanting similar analysis without a separate tool.

## Quick Start

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.sonarqube,
];
```

## Rules Included

| Rule | Severity | SonarQube Equivalent | Description |
|------|----------|---------------------|-------------|
| `complexity/cognitive-complexity` | warn | S3776 | Limit cognitive complexity |
| `complexity/nested-complexity-hotspots` | warn | S1066 | Detect nested complexity |
| `duplication/identical-functions` | warn | CPD | Detect duplicate functions |
| `security/database-injection` | error | S2077 | Prevent SQL/NoSQL injection |

## When to Use

**Use `sonarqube` when:**
- Migrating from SonarQube to ESLint
- Want SonarQube-like analysis without separate tool
- Focus on cognitive complexity metrics
- Detecting code duplication
- Teams familiar with SonarQube rules

**Combine with other configs:**

```javascript
export default [
  llmOptimized.configs.recommended,
  llmOptimized.configs.sonarqube,
];
```

## Rule Details

### complexity/cognitive-complexity

Measures cognitive complexity - how difficult code is to understand:

```javascript
// ❌ High cognitive complexity (15+)
function processOrder(order, user, config) {
  if (order.status === 'pending') {           // +1
    if (user.isVip) {                         // +2 (nested)
      if (config.enableVipDiscount) {         // +3 (nested)
        order.discount = 0.2;
      } else if (config.enableStandardDiscount) { // +1
        order.discount = 0.1;
      }
    }
    for (const item of order.items) {         // +1
      if (item.quantity > 10) {               // +2 (nested)
        item.bulkDiscount = true;
        if (item.category === 'electronics') { // +3 (nested)
          item.warrantyRequired = true;
        }
      }
    }
    return order.isValid && !order.isCancelled; // +1 (&&)
  }
  return false;
}

// ✅ Lower cognitive complexity (refactored)
function processOrder(order, user, config) {
  if (order.status !== 'pending') return false;
  
  applyUserDiscount(order, user, config);
  processOrderItems(order);
  
  return order.isValid && !order.isCancelled;
}

function applyUserDiscount(order, user, config) {
  if (!user.isVip) return;
  
  order.discount = config.enableVipDiscount ? 0.2 
    : config.enableStandardDiscount ? 0.1 
    : 0;
}

function processOrderItems(order) {
  for (const item of order.items) {
    applyBulkDiscount(item);
  }
}

function applyBulkDiscount(item) {
  if (item.quantity <= 10) return;
  
  item.bulkDiscount = true;
  if (item.category === 'electronics') {
    item.warrantyRequired = true;
  }
}
```

#### Cognitive Complexity Scoring

| Construct | Increment |
|-----------|-----------|
| `if`, `else if`, `else` | +1 |
| `switch` | +1 |
| `for`, `while`, `do while` | +1 |
| `catch` | +1 |
| `&&`, `\|\|` in conditions | +1 |
| Nesting | +1 per level |
| Recursion | +1 |
| `break`/`continue` with label | +1 |

### nested-complexity-hotspots

Detects deeply nested code structures:

```javascript
// ❌ Bad: Deep nesting (flagged)
function validate(data) {
  if (data) {
    if (data.user) {
      if (data.user.profile) {
        if (data.user.profile.email) {
          // 4 levels deep!
        }
      }
    }
  }
}

// ✅ Good: Early returns
function validate(data) {
  if (!data) return false;
  if (!data.user) return false;
  if (!data.user.profile) return false;
  if (!data.user.profile.email) return false;
  
  // Main logic at top level
  return validateEmail(data.user.profile.email);
}

// ✅ Good: Optional chaining
function validate(data) {
  const email = data?.user?.profile?.email;
  return email ? validateEmail(email) : false;
}
```

### duplication/identical-functions

Detects duplicate function implementations:

```javascript
// ❌ Bad: Duplicate logic in different files
// file: userService.ts
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// file: orderService.ts
function formatOrderDate(date) {
  return date.toISOString().split('T')[0];  // Same logic!
}

// ✅ Good: Shared utility
// file: utils/date.ts
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// file: userService.ts
import { formatDate } from '../utils/date';

// file: orderService.ts
import { formatDate } from '../utils/date';
```

## Configuration Examples

### Strict Complexity Limits

```javascript
export default [
  llmOptimized.configs.sonarqube,
  {
    rules: {
      '@forge-js/llm-optimized/complexity/cognitive-complexity': ['error', {
        maxComplexity: 10,  // Stricter than default 15
      }],
      '@forge-js/llm-optimized/complexity/nested-complexity-hotspots': ['error', {
        maxDepth: 3,  // Maximum nesting depth
      }],
    },
  },
];
```

### Duplication Detection Settings

```javascript
export default [
  llmOptimized.configs.sonarqube,
  {
    rules: {
      '@forge-js/llm-optimized/duplication/identical-functions': ['warn', {
        minLines: 5,           // Minimum lines to consider
        minStatements: 3,      // Minimum statements
        ignoreTestFiles: true, // Don't flag test duplicates
      }],
    },
  },
];
```

### Legacy Code Assessment

```javascript
// Use for initial codebase assessment
export default [
  llmOptimized.configs.sonarqube,
  {
    rules: {
      // Start with warnings to assess scope
      '@forge-js/llm-optimized/complexity/cognitive-complexity': ['warn', {
        maxComplexity: 25,  // More lenient for legacy
      }],
    },
  },
];
```

## SonarQube Rule Mapping

| SonarQube Rule | This Plugin Rule | Description |
|----------------|------------------|-------------|
| S3776 | `complexity/cognitive-complexity` | Cognitive Complexity |
| S1066 | `complexity/nested-complexity-hotspots` | Collapsible if statements |
| CPD | `duplication/identical-functions` | Copy-paste detection |
| S2077 | `security/database-injection` | SQL Injection |

## Metrics and Reporting

Track complexity metrics over time:

```bash
# Generate complexity report
npx eslint . --config sonarqube.config.js --format json > complexity-report.json

# Extract high-complexity files
cat complexity-report.json | jq '[.[] | select(.messages[].ruleId == "@forge-js/llm-optimized/complexity/cognitive-complexity")]'
```

## Migration from SonarQube

If migrating from SonarQube to ESLint:

1. **Start with sonarqube config** for familiar rules
2. **Add recommended config** for additional coverage
3. **Tune thresholds** to match your SonarQube settings
4. **Gradually adopt** additional ESLint-specific rules

```javascript
// Phase 1: Match SonarQube baseline
export default [
  llmOptimized.configs.sonarqube,
];

// Phase 2: Add general rules
export default [
  llmOptimized.configs.recommended,
  llmOptimized.configs.sonarqube,
];

// Phase 3: Full coverage
export default [
  llmOptimized.configs.strict,
];
```

## Resources

- [SonarQube Cognitive Complexity](https://www.sonarsource.com/docs/CognitiveComplexity.pdf)
- [Clean Code by Robert Martin](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Refactoring by Martin Fowler](https://refactoring.com/)

