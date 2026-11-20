---
'eslint-plugin-import-next': patch
'eslint-plugin-modernization': patch
'eslint-plugin-operability': patch
---

Three autofixes no longer write broken code into a file.

`import-next/no-default-export` stripped `export default` from every declaration it did not otherwise handle, so `export default function () {}`, `export default class {}`, ``export default `x` `` and `export default { a: 1 } satisfies T` became unparseable `export ...` forms. An anonymous function or class is now given a name where it stands, every expression is bound to a name and exported by it, and a declaration with no safe rewrite (an overload signature, a decorated anonymous class) is reported without a fix. The generated name (`defaultExport`, `defaultFunction`, `DefaultClass`) is checked against the module's bindings, the globals it reads and the names it already exports, and gets a numeric suffix on a clash instead of a second declaration.

`modernization/prefer-at` rewrote `xs[xs.length - 1]` to `xs.at(-1)` on any receiver, including `NodeList` and `HTMLCollection`, which have no `.at()`. It now fixes only a receiver known to support it: with type information, one whose type declares `at` on every union member; without it, a binding the source shows to be an array or a string (a literal, `Array.from`, a `T[]`, `readonly T[]`, `Array<T>` or `string` annotation). Everything else is still reported, without a fix.

`operability/no-console-log` with the `remove` (and `comment`) strategy deleted side effects in the arguments (`console.log(i++)` lost the `i++`) and, in semicolon-free code, removed the `;` guarding the next line, joining `console.info(0)` to `[1].forEach(...)`. The fix is now withheld when an argument may have side effects (`remove` offers the deletion as a suggestion), and a `;` on a later line than the call is kept.
