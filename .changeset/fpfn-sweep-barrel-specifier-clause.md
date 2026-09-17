---
'eslint-plugin-import-next': patch
---

fix: `no-barrel-file` was blind to a barrel spelled as imports plus an export clause

`import { a } from './a'; … export { a, b, c, d };` is the same module graph as four `export … from` lines — the same requested-module edges, the same eager load, the same tree-shaking cost — but it was silent. A sourceless `export { … }` matched neither `isReexport` (which needs a `source`) nor `isLocalExport` (which needs a `declaration`), so it fell through both buckets and the file was classified as having no exports at all, bailing before any threshold was consulted. The rule's own comment above that line describes the intended behaviour as an OR and names `export { x }` explicitly; the code implemented an AND that excluded it.

Sourceless clauses are now split per specifier: a name bound by an import contributes that import's module to the re-export source set, and a locally declared name counts as a local export. Resolving per specifier rather than per clause is what keeps `const x = 1; export { x, y, z }` silent — the false positive a naive "count the clause" fix would introduce, now pinned by a test. Type-only specifiers are skipped on both sides, since they are erased before any bundler sees them. A mixed file that forwards imports and also exports a local binding now correctly reports `considerDirectExports` rather than being told it adds "no local logic".
