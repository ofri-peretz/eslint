---
'eslint-plugin-import-next': patch
---

`export` no longer reports a type and a value that share a name.

TypeScript has two declaration spaces, and one name may occupy both:

```ts
export type Twilio = ITwilio
export const Twilio = ITwilio    // legal, and the point of the pattern
```

The rule kept a single map keyed by name, so every such pair was reported as
`Multiple exports of name "Twilio"`. On the pinned corpus, twilio-node's
`src/index.ts` alone produced **758** of them — **778 → 3** across all eight
repositories.

Still reported, because these really are conflicts:

- `type X` twice
- `type X` beside `interface X`, in either order
- an `enum X` against either a value or a type — an enum occupies both spaces

`interface X` twice is declaration **merging** and is now correctly silent.
