---
'eslint-plugin-react-features': patch
---

**🐛 Fix** — `void-dom-elements-no-children` no longer reports `<Link>`, `<Img>`, `<Input>` and other capitalized components

`<Link href="/docs">Read the floor</Link>` from `next/link` was reported as
"`<link>` is a void element and cannot have children". The tag-name check
lower-cased the JSX name before looking it up, so any component whose name
differed from a void element only by case was treated as that element.

JSX resolves a capitalized name to a binding, never to a DOM tag. Only a
lowercase `JSXIdentifier` (`link`, `img`, `br`, …) can be a void DOM element,
and that is now the only thing the rule matches.
