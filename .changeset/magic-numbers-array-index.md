---
'eslint-plugin-conventions': patch
---

`no-magic-numbers`: `ignoreArrayIndexes` exempts an index, not a position.

The exemption tested only that the literal sat in the index slot of a computed
member access. It never checked the value, so all of these were silently
exempt:

```js
arr[3.5]          // not an integer
arr[1e21]         // past any array's length
arr[4294967296]   // one past the largest addressable index
```

None of them indexes anything. A non-integer or out-of-range key is an ordinary
string-keyed property lookup, and the number in it is exactly as magic as one
anywhere else. This now matches ESLint core, which has always required a
non-negative integer below the array-length limit.

`arr[42]` stays exempt — the fix costs no recall on the case the option exists
for.

Also fixes the extracted-constant name. `String(1e21)` is `"1e+21"`, and the
generator replaced only `.`, so the suggestion produced
`const MAGIC_1e+21 = 1e+21` — not an identifier. Applying it left the file
unable to parse. Every non-alphanumeric character is now a separator.

Both were found by an adversarial wave rather than by the corpus: the pinned
8 repositories contain no such code, so the count there is unchanged at 1,421.
