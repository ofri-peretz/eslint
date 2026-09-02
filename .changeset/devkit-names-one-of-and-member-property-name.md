---
'@interlace/eslint-devkit': minor
---

feat: `namesOneOf` and `memberPropertyName` keep an unresolved name visible

`propertyName` returns `string | null` so that `o[k]` — a property the AST
cannot name — stays distinguishable from a property it can name and rejects.
Callers were erasing that with `SET.has(propertyName(node) as string)`, which
works only because `Set.prototype.has(null)` is false.

```ts
namesOneOf(propertyName(callee), HTTP_METHODS); // Set or array, null-safe

const method = memberPropertyName(callee); // any node, not just a member
if (callee.type !== 'MemberExpression' || method === null) return;
method.toLowerCase(); // string
```

`memberPropertyName` exists for the common case where the type test already
sits in a boolean chain the caller cannot split: resolving before the chain
gives the chain a binding to test and the body a narrowed `string`, without
promoting a logical operand to a statement.
