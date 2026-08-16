---
'eslint-plugin-react-features': minor
'eslint-plugin-react-a11y': minor
---

Two React rules now judge evidence rather than names.

**`display-name`** reported every component. `hasDisplayNameInScope()` returned a
hardcoded `false` under a comment reading "For now, always require explicit
displayName", so `function Profile() {}` and `const Profile = () => {}` were both
findings — in a codebase where every component is named, that is every component.
React reads the display name off `Function.name` / `Class.name`, so those are
already named and there was nothing to fix.

It now reports the three shapes React genuinely cannot name: an anonymous
`export default`, an anonymous class component, and `memo`/`forwardRef` with no
binding to take a name from. Wrapper calls are walked through, so
`const Row = memo(forwardRef(fn))` stays quiet. Measured at 4 of 67 files on the
benchmark's safe corpus before the fix, all four this defect.

If you were suppressing this rule because of the noise, it is worth re-enabling.

**`alt-text`** now resolves `next/image` from its **import** rather than requiring
`{ img: ['Image'] }` — a default nobody sets, on the framework most likely to need
it. A renamed default import (`import Pic from 'next/image'`) is caught;
`next/legacy/image` and `next/future/image` too. A same-named `<Image>` from an
unrelated package is not, and neither is `getImageProps` aliased to `Image`, which
returns props rather than rendering.

This is new detection: expect findings on Next.js images that were previously
invisible.
