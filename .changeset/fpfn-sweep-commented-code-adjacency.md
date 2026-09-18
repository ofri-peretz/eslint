---
'eslint-plugin-conventions': patch
'@interlace/eslint-devkit': patch
---

fix: `no-commented-code` grouped across live source and its suggestion deleted it

The `Program` visitor built groups of "consecutive" comments by walking `getAllComments()` and only breaking the group on a comment that does _not_ look like code. Intervening source was never a boundary, so two code-like comments with a hundred lines of live statements between them formed one group — and the group's suggestion removes `[first.range[0], last.range[1]]` as a single range, taking everything in between with it.

Minimized, the Quick Fix labelled "Delete the commented code block" reduces

```js
// const a = 1;
export function realCode() {
  return 42;
}
// const b = 2;
```

to a single newline: `realCode` is gone. On burgee's vendored `ora/test.js:1658` the range was 5,604 characters and swallowed the `});` closing the enclosing `test(...)` call, so the output did not parse. The in-source comment above that branch already described the intent as "Multiple consecutive comments"; the implementation grouped comments consecutive in the _filtered_ stream, which is not the same thing.

Groups now break when live source separates two comments, asked of the token stream rather than of line numbers so blank lines and interleaved prose comments still group as before. Each commented-out region becomes its own report with its own non-destructive fix, which also restores a suppression site for the second region — previously only the first comment carried a marker.

`createWithMockContext` gains a `getTokenAfter` stub. A real `SourceCode` has one and the rule now needs it; per the standing note in that file, the mock is completed rather than the rule made defensive about a shape ESLint always provides.
