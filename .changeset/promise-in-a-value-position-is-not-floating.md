---
'eslint-plugin-maintainability': patch
'eslint-plugin-reliability': patch
---

fix: `no-unhandled-promise` no longer reports a promise whose value is used

A promise floats when its value is discarded, not whenever it is unawaited. The rule reported every promise in a value position — assigned to a binding, passed as an argument, set as a property, returned — and none of those sites is where a `.catch` belongs. `Promise.race([work(), work()])` drew three findings for one expression: the race, and each promise the race consumes.

`isValueConsumed` walks from the promise to the first parent that either discards it (an expression statement, a non-final comma operand) or uses it. `void p` stays a discard: `ignoreVoidExpressions` is the option for that and it is off by default. An argument counts as consumed only when the receiving call settles what it is given — `Promise.all` and friends — so `console.log(fetch(url))` still reports the inner call, which was a deliberate decision and stays one.

Two smaller shapes with the same cause: `p.then(onFulfilled, onRejected)` carries its rejection handler in the second argument, and only `.catch` and `.finally` had counted; and the `maintainability` copy had no return-delegation guard at all, so `return work().then(…)` reported under that plugin and not under its twin.

Across burgee's ported commander and yargs façades this moves 82 findings to 4, and the 4 that remain are floating `.then()` calls with nothing to settle them.
