---
'eslint-plugin-maintainability': patch
'eslint-plugin-reliability': patch
---

fix: `no-unhandled-promise` no longer treats a function-typed parameter as its enclosing async function

Inside an `async` function, every call to a parameter reported as an unhandled promise:

```ts
async function main(argv: string[], write: (s: string) => void) {
  write('hello'); // reported — write returns void
}
```

The binding resolver returned the definition's node for every kind of definition, and for a parameter that node is the function that declares it — so `write` resolved to `main`, inherited its `async`, and was "evidence" of a promise. A parameter is now evidence only through what the file shows about it: a `() => Promise<…>` annotation or an `async` default still report; a `void`-typed or unannotated parameter does not. Both plugins that ship this rule carry the same fix and the same cases.
