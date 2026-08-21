---
'eslint-plugin-conventions': patch
---

`no-commented-code` no longer reports English prose.

On the pinned 8-repository corpus this rule produced **2,441 findings**, and
the overwhelming majority were sentences. Three mechanics did it:

```js
// Copyright (c) 2018-Present, Okta, Inc.      <- the call pattern allowed a
//                                                gap before the paren
// https://developer.mozilla.org/…/fetch       <- `https:` matched `ident:`
// for widget / idx-js backward compatibility  <- opens with a keyword
```

The discriminator is punctuation: commented-out code is **copied** out of a
file and keeps its semicolons and braces, while a sentence ends in a word.

**2,441 → 143**, and what remains is real — `const target =
actionDefinition.href;`, `err = wwwAuthErr ?? err;`.

Known trade: a terminator-less fragment such as `// x = 1` is no longer
reported.
