---
'@interlace/eslint-devkit': patch
---

refactor: cross-file value following parses with ESLint's own espree when the linting parser has no `parseForESLint`, instead of whichever `@typescript-eslint/parser` happens to be installed. Results no longer depend on what else is in `node_modules`; a TypeScript sibling is still read by the configured parser.
