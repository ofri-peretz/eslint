---
'eslint-plugin-reliability': patch
'eslint-plugin-maintainability': patch
---

fix: `no-silent-errors`'s `allowWithComment` no longer disarms the rest of the file

The proximity check had no lower bound: for a comment _below_ the catch,
`catchStart.line - comment.loc.end.line` is negative, which satisfies `<= 2` at any
distance. One stray `// TODO` or `// legacy` anywhere later in the file silenced every
empty catch above it — two of them 988 lines up, in the case that surfaced this.

The window is now bounded at both ends, matching the sibling `no-unsafe-type-narrowing`
fix. Distance 0 is kept, so a comment trailing the catch's own line still counts. Both
copies of the rule carried the identical expression; both are fixed.
