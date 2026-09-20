---
'eslint-plugin-maintainability': patch
---

fix: `identical-functions` compared comment prose as code, hiding duplicates behind a one-line `/* */`

`normalizeBody` stashes regex literals before it strips comments, and its pattern was anchored to positions that include `{` and `;`. A single-line `/* text */` sitting after either one satisfied the regex-literal alternative — `*text*` contains no `/`, `\`, newline or `[` — so it was stashed as a pattern, skipped by the comment stripper that runs next, and restored verbatim into the string the similarity score is computed over. Comment text then decided the verdict: two byte-identical bodies carrying different remarks stopped being duplicates, while the same comments written as `//`, spread across two lines, or placed after `)` left the finding intact. Editing one character of comment prose moved the score off 100%, which is what proves the bytes were inside the comparison.

The rule's own documented ❌ Incorrect example stops reporting once each function gains one differing single-line block comment.

The fix narrows only the first character of the pattern to exclude `*`, per `RegularExpressionFirstChar` in ECMA-262: a regex literal can never open with `*`, which is exactly what makes `/*` a comment opener. Stripping comments earlier is not available as a fix — strings are stashed first precisely so that a `//` inside one survives, and a pattern such as `/https:\/\//` would lose its tail to the line-comment stripper.

Surfaced against the burgee corpus, where a group of three byte-identical no-op interface implementations reported only two members; the third was excluded because its comment read `/* nothing to initialise */` rather than `/* nothing to merge */`.
