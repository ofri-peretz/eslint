---
'eslint-plugin-reliability': patch
---

**🐛 Fix** — `no-missing-null-checks` understands `if (!x) return` and, given types, TypeScript's own narrowing

The shape of every `getOrNotFound` helper reported on its return:

```ts
const page = source.getPage(slug);
if (!page) notFound();
return page.data;
```

The guard analysis skipped `if (!obj)` entirely — inside that guard the object
IS null — and so never saw what makes the shape safe: the guard leaves. A
preceding sibling statement whose falsy test names the object (`!x`,
`x == null`, `undefined === x`, or an `||` of those) and whose consequent ends in
`return` / `throw` / `continue` / `break` cannot fall through, so nothing after
it in the same statement list runs with the object null. Only preceding
siblings count: a read before the guard is the bug the guard was written for,
a guard inside a nested block says nothing about the list around it, and a
consequent that does not leave (`if (!x) log()`) still proves nothing.

When `@typescript-eslint/parser` is configured with `projectService` or
`project`, the rule additionally asks the checker for the type of the object
being dereferenced. TypeScript's control-flow narrowing knows what syntax cannot
— that `notFound(): never` ends the request, that an `asserts` function narrows
its argument, that a declared `Page` return carries no `undefined` — and a
non-nullable type is a veto. Veto-only: a nullable type falls through to the
same evidence gate as before, and `any` / `unknown` say nothing, so types never
add a finding. Without a program the rule behaves exactly as it did.

Also fixed in passing: `declare const source: Loader; source.getPage()` reported
as "declared without an initializer". An ambient declaration has no initializer
by definition.
