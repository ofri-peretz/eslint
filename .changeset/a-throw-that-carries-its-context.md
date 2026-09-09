---
'eslint-plugin-maintainability': patch
'eslint-plugin-reliability': patch
---

fix: `no-missing-error-context` reads three more shapes of throw

- **`throw Error(msg)`** — the Error constructors work without `new` and build the same object; the spec says so and yargs writes it that way. The rule only looked at `NewExpression`, so the callable form read as a throw with no message. `hasErrorStack` had the same gap.
- **A message built with a fallback** — only a string literal or a template literal counted as a message, so `throw new Error(message ?? \`Expected values to be strictly equal\`)`read as empty. A reader can see that a nullish-coalescing, a logical-or, a ternary or a concatenation yields a string when a branch of it does, and`isProvablyString`now says so. A bare`new Error(someVar)`still reports: nothing at the throw site says what`someVar` holds.
- **`throw new ActionRequired(spec)`** — a custom error class carrying its context in the constructor was already accepted when its name ENDED in "Error". A class named for what happened rather than for its base got nothing. The name is no longer consulted; only the eight built-in Error constructors keep the stricter reading of their first argument.
