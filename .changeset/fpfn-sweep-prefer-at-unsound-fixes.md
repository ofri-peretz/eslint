---
'eslint-plugin-modernization': patch
---

fix: `prefer-at` no longer autofixes the two rewrites that are not equivalent. `array[-1]` is a plain property read that always yields `undefined`, while `array.at(-1)` yields the last element, so `--fix` turned dead code into live code; and the rule never establishes that the object is an array, so on a `Record<number, string>` holding a `-1` key, or on `arguments`, the same rewrite replaced working code with a `TypeError`. `array[array.length - n]` with a variable `n` diverges too: at `n === 0` the source reads past the end while `.at(-0)` reads the FIRST element. Both cases still report; only the unattended edit is gone. The `array.length - <positive literal>` fix is unchanged.
