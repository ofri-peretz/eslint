---
'@interlace/eslint-devkit': minor
---

**✨ Feature** — `spellings`: the five ways a rule reads a name, in one place

Every rule that looks at a string, a property or a member path was open-coding
that read, and each hand-rolled copy missed a different subset of the language.
A probe that asked all 397 rules the same question found 1,156 sites where a
rule saw `'foo'` but not `` `foo` ``, or `o.foo` but not `o['foo']`.

Five primitives, each replacing one open-coded read:

```ts
import {
  staticString, // 'foo' | `foo` | 'fo' + 'o'  →  "foo"
  isStaticString, // the predicate form
  propertyName, // o.foo | o['foo']            →  "foo"
  objectKeyName, // { foo: 1 } | { 'foo': 1 } | { ['foo']: 1 }
  memberPath, // a.b.c | a['b'].c            →  "a.b.c"
  readsRequestShape,
} from '@interlace/eslint-devkit';
```

`readsRequestShape` answers "does this expression read an HTTP request?" from
the SHAPE — a parameter whose `.query` / `.params` / `.headers` / `.cookies`
(or API Gateway's `queryStringParameters` / `pathParameters`) is read — rather
than from a binding happening to be spelled `req`.

Additive: nothing is removed, and no existing export changes signature.
