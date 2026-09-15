---
'eslint-plugin-conventions': patch
---

fix: `no-console-spaces` now re-escapes the string it emits. The fixer spliced the cooked value between single quotes, so `console.log("it's here ")` was rewritten to `console.log('it's here')`, which does not parse; an interior newline produced an unterminated literal, and a backslash silently changed the string's runtime value. ESLint writes that output to disk rather than rolling it back.
