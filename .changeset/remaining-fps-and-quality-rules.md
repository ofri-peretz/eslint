---
"eslint-plugin-secure-coding": patch
"eslint-plugin-node-security": patch
"eslint-plugin-modernization": minor
"eslint-plugin-modularity": minor
---

feat+fix: ILB-Wild FP reduction + two new quality rules

**`no-unsafe-deserialization` FP reduction (~112 FPs)**
- Track `fs.readFileSync('literal')` calls in `literalPathFileVars` — a file read with a
  hardcoded path (bundled config) is not user-controlled input for safe deserializers
  (`JSON.parse`, schema-validating parsers). `eval()` still fires even on literal-path reads.

**`no-buffer-overread` FP reduction (~129 FPs)**
- Remove `b` (single-char, too broad) and `chunk` (too common for array chunks) from the
  Buffer alias heuristic — `isBufferType` now only matches `buf` and `bytes` by name,
  reducing false matches on non-Buffer variables.

**New rule: `modernization/prefer-template-literal`**
- Flags `"string " + variable` concatenation and suggests the equivalent template literal.
- Auto-fix produces the correct `` `string ${variable}` `` replacement.
- Pure string literal chains (`"a" + "b"`) and numeric addition are not flagged.
- Closes P2 quality FN `prob_string_concat` in the ILB-Arena-Quality bench.

**New rule: `modularity/no-mutable-exports`**
- Flags `export let` and `export var` — module exports should be immutable `const`
  bindings so all importers share a stable reference.
- Auto-fix replaces `let`/`var` with `const`.
- Closes P2 quality FN `prob_mutable_export` in the ILB-Arena-Quality bench.
