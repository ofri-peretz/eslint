# ESLint Rule Message Format - LLM Optimization Standard

## Overview

All ESLint rule messages in this package MUST follow the **4-line LLM-optimized format**. This ensures consistency, clarity, and enables LLMs (Large Language Models) to understand and fix violations accurately.

## Format Structure

Every error/warning message MUST have exactly 4 lines:

```
Line 1: [Icon] [Vulnerability Name] (CWE-XXX) | [Severity Level]
Line 2:    ❌ Current: [Bad practice example]
Line 3:    ✅ Fix: [Solution with pattern/code]
Line 4:    📚 [Documentation Link] or [Context]
```

## Line Breakdown

### Line 1: Icon + Vulnerability + CWE + Severity
- **Icon**: Use category-specific emoji (🔒 security, ⚠️ warning, 🔄 refactoring, ♿ accessibility, ⚡ performance, 📚 domain, 🚫 architecture)
- **Vulnerability**: Brief name of the vulnerability/issue
- **CWE Reference**: Include CWE number (CWE-XXX format)
- **Severity**: One of: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`

**Example:**
```
🔒 SQL Injection (CWE-89) | CRITICAL
```

### Line 2: Current Bad Practice
- Show the problematic code/pattern
- Use `❌ Current:` prefix
- Include minimal code snippet or description
- Indent with 3 spaces for alignment

**Example:**
```
   ❌ Current: `SELECT * FROM users WHERE id = ${userId}`
```

### Line 3: Fix with Solution
- Show how to fix the issue
- Use `✅ Fix:` prefix
- Include working pattern or code
- May span multiple lines if needed
- Indent with 3 spaces for alignment

**Example:**
```
   ✅ Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])
```

### Line 4: Documentation
- Provide relevant documentation link
- Include context about why this matters
- Use `📚` prefix
- Indent with 3 spaces for alignment

**Example:**
```
   📚 https://owasp.org/www-community/attacks/SQL_Injection
```

## CWE Reference Guide

Common CWE mappings for security/code quality issues:

| Category | CWE | Examples |
|----------|-----|----------|
| **Injection** | CWE-89 | SQL Injection |
| | CWE-78 | Command Injection |
| | CWE-95 | Code Injection (eval, require) |
| **Path Traversal** | CWE-22 | Path traversal attacks |
| **Regex** | CWE-400 | ReDoS (Regular Expression Denial of Service) |
| **Prototype Pollution** | CWE-915 | Object injection |
| **Module Issues** | CWE-407 | Circular dependencies |
| | CWE-431 | Insecure dependency |
| **Logging** | CWE-532 | Sensitive data logging |
| **API** | CWE-1078 | Deprecated/obsolete components |
| **Code Quality** | CWE-1104 | Code duplication |

## Severity Levels

- **CRITICAL**: Security vulnerability, will break functionality, immediate fix required
- **HIGH**: Important issue affecting security or core functionality
- **MEDIUM**: Best practice violation or performance concern
- **LOW**: Code style or minor optimization

## Implementation Example

### Bad Message (Old Style)
```typescript
messages: {
  sqlInjection: '⚠️ SQL Injection detected | {{filePath}}:{{line}}'
}
```

### Good Message (LLM-Optimized)
```typescript
messages: {
  sqlInjection:
    '🔒 SQL Injection (CWE-89) | CRITICAL\n' +
    '   ❌ Current: `SELECT * FROM users WHERE id = ${userId}`\n' +
    '   ✅ Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId])\n' +
    '   📚 https://owasp.org/www-community/attacks/SQL_Injection',
}
```

## Data Object Fields

When calling `context.report()`, include these fields in the `data` object:

```typescript
context.report({
  node,
  messageId: 'ruleName',
  data: {
    // Line 1 substitutions
    severity: 'CRITICAL',  // or HIGH, MEDIUM, LOW
    
    // Line 2 substitutions
    current: '...',        // Current bad pattern
    
    // Line 3 substitutions
    fix: '...',            // Suggested fix
    solution: '...',       // Alternative fix approach
    
    // Line 4 substitutions
    documentation: '...',  // Doc link
    reason: '...',         // Why this matters
    
    // Context for placeholders
    filePath: '...',
    line: '...',
  },
});
```

## Template Examples

### Security Rule Template

```typescript
messages: {
  vulnerabilityName:
    '[Icon] [Vulnerability Name] (CWE-XXX) | CRITICAL\n' +
    '   ❌ Current: {{currentBadExample}}\n' +
    '   ✅ Fix: {{solutionPattern}}\n' +
    '   📚 {{documentationLink}}',
}
```

### Architecture Rule Template

```typescript
messages: {
  architectureViolation:
    '[Icon] [Issue Name] (CWE-407) | {{severity}}\n' +
    '   ❌ Current: {{currentStructure}}\n' +
    '   ✅ Fix: {{recommendedStructure}}\n' +
    '   📚 {{guideline}}',
}
```

### Performance Rule Template

```typescript
messages: {
  performanceConcern:
    '⚡ [Performance Issue] (CWE-1104) | MEDIUM\n' +
    '   ❌ Current: {{currentImplementation}}\n' +
    '   ✅ Fix: Use {{optimizedApproach}}\n' +
    '   📚 {{performanceImpact}}',
}
```

## Guidelines

### DO ✅

- ✅ Always include CWE reference
- ✅ Use exactly 4 lines (with newlines)
- ✅ Include both current bad example AND fix
- ✅ Provide actionable solutions
- ✅ Include relevant documentation links
- ✅ Use appropriate severity levels
- ✅ Use 3-space indentation for lines 2-4
- ✅ Include emoji icons for visual scanning
- ✅ Test messages with actual violations

### DON'T ❌

- ❌ Skip CWE references
- ❌ Use vague or unclear examples
- ❌ Provide only problems without solutions
- ❌ Include multiple unrelated concepts in one message
- ❌ Use unclear abbreviations
- ❌ Forget to update data object fields
- ❌ Create biased rules that favor specific cases
- ❌ Add special logic for certain attributes/cases

## Testing Your Rule

1. **Syntax Check**: Verify newlines render correctly
2. **Coverage**: Test with both pass and fail cases
3. **Clarity**: Can a developer understand the fix?
4. **LLM Readiness**: Can an AI parse the structure?
5. **Consistency**: Does it match other rules?

Run: `nx lint` on playground to verify formatting

## Resources

- **ESLint Rule API**: https://eslint.org/docs/extend/custom-rules
- **CWE Database**: https://cwe.mitre.org/
- **OWASP Reference**: https://owasp.org/
- **See existing rules**: `src/rules/` directory for examples

---

**Last Updated**: 2025-11-02
**Version**: 1.0
**Status**: Active Standard
