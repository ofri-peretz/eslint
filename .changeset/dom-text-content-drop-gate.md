---
'eslint-plugin-conventions': minor
---

fix: `prefer-dom-node-text-content` no longer gates on the variable's name

The rule matched a vocabulary — `^(element|el|div|span|node|ref|dom|elem)$`
plus an `(Element|Node|Ref)$` suffix — before reporting. **Six of seven genuine
DOM elements were missed** for having ordinary names:

```js
const heading = document.getElementById('x');
heading.innerText; // not reported
```

`innerText` is defined on `HTMLElement` and nowhere else in the language, so
anything you read it from is a DOM element — the property access is itself the
evidence, and a second "does this look like an element" test could only
subtract.

The gate is gone rather than replaced. A DOM element arriving as a function
parameter or an import resolves to nothing, so following the binding instead of
the name would have traded one set of misses for another.

`textContent` and every other property remain untouched.
