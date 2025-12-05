# no-graphql-injection

> **Keywords:** GraphQL injection, CWE-943, CWE-400, security, DoS, introspection, query complexity, LLM-optimized

Detects GraphQL injection vulnerabilities and DoS attacks. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) and provides LLM-optimized error messages.

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-943 (GraphQL Injection), CWE-400 (DoS) |
| **Severity** | Critical |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Injection Prevention |

## Rule Details

GraphQL injection occurs when user input is improperly inserted into GraphQL queries, allowing attackers to:
- Read or modify unauthorized data
- Perform DoS attacks with complex/nested queries
- Extract schema information via introspection

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 🔒 **Injection** | Unauthorized data access | Use GraphQL variables |
| 🔥 **DoS** | Service unavailability | Limit query depth/complexity |
| 🔍 **Info Leak** | Schema exposure | Disable introspection in production |

## Examples

### ❌ Incorrect

```typescript
// String interpolation in GraphQL query
const query = `
  query {
    user(id: "${userId}") {
      name
      email
    }
  }
`;

// Introspection query in production
const introspect = `{ __schema { types { name } } }`;

// String concatenation
const searchQuery = 'query { users(name: "' + userInput + '") { id } }';
```

### ✅ Correct

```typescript
// Use GraphQL variables
const query = gql`
  query GetUser($userId: ID!) {
    user(id: $userId) {
      name
      email
    }
  }
`;
await client.query({ query, variables: { userId } });

// Use query builders
import { buildQuery } from 'graphql-tools';
const safeQuery = buildQuery({ user: { id: userId } });
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-graphql-injection': ['error', {
      allowIntrospection: false,       // Disable introspection detection
      maxQueryDepth: 10,               // Maximum query nesting depth
      trustedGraphqlLibraries: ['graphql', 'apollo-server', 'graphql-tools'],
      validationFunctions: ['validate', 'sanitize']
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowIntrospection` | `boolean` | `false` | Allow introspection queries |
| `maxQueryDepth` | `number` | `10` | Maximum allowed query depth |
| `trustedGraphqlLibraries` | `string[]` | `['graphql', 'apollo-server']` | Safe GraphQL libraries |
| `validationFunctions` | `string[]` | `['validate', 'sanitize']` | Input validation functions |

## Error Message Format

```
🔒 CWE-943 OWASP:A03-Injection CVSS:8.6 | GraphQL Injection detected | CRITICAL [SOC2,PCI-DSS]
   Fix: Use GraphQL variables instead of string interpolation | https://owasp.org/...
```

## Further Reading

- **[GraphQL Security](https://graphql.org/learn/authorization/)** - Official security guide
- **[Apollo Security Checklist](https://www.apollographql.com/docs/apollo-server/security/)** - Production security
- **[CWE-943](https://cwe.mitre.org/data/definitions/943.html)** - GraphQL injection documentation

## Related Rules

- [`no-sql-injection`](./no-sql-injection.md) - SQL injection prevention
- [`detect-eval-with-expression`](./detect-eval-with-expression.md) - Code injection prevention

