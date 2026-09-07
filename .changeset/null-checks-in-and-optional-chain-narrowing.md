---
'eslint-plugin-reliability': patch
---

fix(reliability): `no-missing-null-checks` reads `'k' in x` and optional-chain guards as narrowing

Two shapes TypeScript accepts as narrowing reported as a possible null dereference when the rule ran without type information:

```ts
const value = 'value' in token ? token.value : undefined; // reported token.value
if (found?.[1] !== undefined) return found[1]; // reported found[1]
```

`in` throws on `null` and `undefined`, so the consequent of an `in` test runs only with an object; an optional chain is non-nullish only when its root was. Both now count as a guard for the object they name, in an `if` test and in a ternary. Equality to `undefined` (`found?.[1] === undefined`), `x` on the left of `in`, a chain rooted at a different object, and the alternate arm of the ternary all still report.

Reported by a CLI parser that had turned the rule off over exactly these lines.
