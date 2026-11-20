---
'eslint-plugin-react-a11y': patch
---

fix(react-a11y): click-events-have-key-events no longer reports onClick on a custom component

`<Button onClick={go}>` was reported even though `Button` is a component, not a DOM element — it may already render a native `<button>` and be keyboard-operable, and there is no way to see that from the call site. The rule now only checks intrinsic (lower-case) elements, matching upstream `jsx-a11y/click-events-have-key-events`.
