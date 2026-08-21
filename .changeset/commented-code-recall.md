---
'eslint-plugin-conventions': patch
---

`no-commented-code` reports commented-out statements again, whatever they end
with.

The prose fix traded away recall, and the trade was documented as costing
`// x = 1`. It cost far more — an adversarial wave found **11 of 14** genuinely
commented-out lines going silent:

```js
// const timeout = 5000
// import fs from "fs"
// throw new Error("x")
// promise.then(x => x).catch(noop)
```

The terminator test is a proxy for "is this a sentence". That is right for a
line that merely *opens* with a keyword, and far too blunt for a line that is
unmistakably a statement. A declaration with an initializer, a module
specifier, a constructed throw, a call on a member chain, an arrow, a strict
comparison, a decorator or JSX now count as code regardless of punctuation.

`throw` and `await` require a call shape after them, because a bare `await`
matched *"await for the retry window to elapse"* — the same trap as the keyword
patterns, one keyword further along.

All 14 adversarial shapes now report, with **zero** prose false positives
across a 9-case prose set, and **zero** new findings on the pinned corpus.
