# no-graphql-introspection-production

> Disallow GraphQL introspection in production environments

**Severity:** 🟡 Warning  
**CWE:** [CWE-200](https://cwe.mitre.org/data/definitions/200.html)

## Rule Details

This rule detects GraphQL servers with introspection enabled in production. Introspection allows anyone to query your entire schema, revealing:

- All available queries and mutations
- Data types and relationships
- Potential attack vectors

## Examples

### ❌ Incorrect

```javascript
import { ApolloServer } from 'apollo-server-express';

// Introspection enabled (default) - VULNERABLE in production
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
});
```

### ✅ Correct

```javascript
import { ApolloServer } from 'apollo-server-express';

// Disable introspection in production - SAFE
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
});

// Or explicitly disable
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: false,
});
```

## Options

| Option         | Type      | Default | Description                       |
| -------------- | --------- | ------- | --------------------------------- |
| `allowInTests` | `boolean` | `false` | Allow introspection in test files |

```json
{
  "rules": {
    "express-security/no-graphql-introspection-production": [
      "warn",
      {
        "allowInTests": true
      }
    ]
  }
}
```

## When Not To Use It

- Development environments where introspection aids debugging
- Internal APIs not exposed to the public

## Further Reading

- [Apollo Server Introspection](https://www.apollographql.com/docs/apollo-server/api/apollo-server/#introspection)
- [GraphQL Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)
