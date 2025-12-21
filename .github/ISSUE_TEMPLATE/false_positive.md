---
name: False Positive Report
about: Report a rule triggering on safe code
title: '[FP] Rule Name Here'
labels: 'false-positive'
assignees: ''
---

## 🚨 False Positive Report

### Rule Name

<!-- e.g. secure-coding/no-sql-injection -->

### Code Snippet

<!-- Provide the exact code that triggered the error -->

```typescript
// Your code here
const safeQuery = db.select('users').where({ id });
```

### Why is this safe?

<!-- Explain why this code pattern is secure and should not be flagged -->

### Environment

- **Package Version**: <!-- e.g. 1.5.0 -->
- **ESLint Version**: <!-- e.g. 9.0.0 -->
