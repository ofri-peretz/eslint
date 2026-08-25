---
'eslint-plugin-secure-coding': patch
---

fix: `no-xxe-injection` reported `parseFromString(text, 'text/html')`.

HTML has no DOCTYPE entity subset, so `text/html` cannot carry an external
entity at any configuration. The same method parses XML and HTML, and the MIME
type is the whole question.

passbolt/passbolt_styleguide — an open-source password manager — uses exactly
this to strip markup out of a progress message:

```js
const doc = new DOMParser().parseFromString(text, 'text/html');
return doc.documentElement.textContent;
```

A sanitisation idiom, reported as CWE-611. A non-literal second argument
decides nothing and still reports.
