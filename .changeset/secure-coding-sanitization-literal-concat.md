---
'eslint-plugin-secure-coding': patch
'oxlint-plugin-secure-coding': patch
---

fix(secure-coding): no-improper-sanitization stops reporting literal-only markup and `body`/`input` names

`el.innerHTML = '<a>' + '<b>'` was reported once per literal, because the exemption for developer-typed text covered a call argument but not the right side of an `innerHTML` / `outerHTML` assignment. Concatenations of literals, template literals whose substitutions are themselves literal-only, and `const` bindings that resolve through scope to such text are now treated as the static markup they are. On PrivateBin's `js/test` that removes 115 of 154 reports. A `let`, a parameter or a `const` bound to a call still counts as a runtime value.

The `innerHTML` / `outerHTML` assignment check also decided "user input" by whether the right-hand text contained `body`, `query`, `input` or `req.`, so `el.innerHTML = bodyTemplate` reported. It now reads provenance from the syntax: a member chain rooted at `req` / `request`, `location.hash|search|href`, or the `.value` of a DOM lookup (`getElementById`, `querySelector(All)`, `getElementsBy…`). Text inside string literals no longer counts, and a variable named `userInput` is still not reported, as before.
