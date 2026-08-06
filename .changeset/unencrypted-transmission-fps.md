---
'eslint-plugin-browser-security': patch
---

`no-unencrypted-transmission` no longer flags protocol strings that are being
inspected, or XML namespace identifiers.

The rule reported **every** string literal containing `http://`, regardless of
what the code did with it. Two false-positive classes followed, both measured by
running the published ruleset over the Interlace monorepo:

**The security check reported as the vulnerability.** The rule's own finding
landed on this line:

```js
// Skip external links, anchors, and absolute paths
if (url.startsWith('http://') || url.startsWith('https://') || …)
```

A protocol string passed to `startsWith` / `includes` / `replace` / `match`, or
compared with `===`, is the thing being *looked for* — not an endpoint being
called.

**XML namespaces.** `xmlns="http://www.w3.org/2000/svg"` is the most common
`http://` string in any React codebase — every inline SVG carries one. It is
never fetched; namespaces are opaque identifiers and rewriting one to `https`
breaks the document. Also covers the XSD/XSL/RDF and Inkscape/Adobe namespaces.

Both are locked as `valid` cases, verified by reverting each guard and watching
the rule report again. True positives are unaffected: `fetch('http://api…')`,
`new WebSocket('ws://…')` and connection strings still report.
