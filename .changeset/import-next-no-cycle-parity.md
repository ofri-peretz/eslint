---
'eslint-plugin-import-next': patch
---

fix(import-next): `no-cycle` skips unlisted extensions, ignored paths and commented imports

A file whose extension is not in `import/extensions` (or an `import/parsers` list), or whose path matches `import/ignore`, is no module and no longer closes a cycle: workadventure's `.svelte` components made 10 of its 32 extra findings. An `import "x"` inside a comment is no longer an edge (Babylon.js: its 1 extra, a doc comment; big-AGI: 1 of its 7). With neither setting every extension is still read.

Two differences stay and are documented: every import that closes a cycle is reported, where upstream reports the first through a shared module; and a plain `import { Interface }` is not an edge, where upstream reports it (`no_cycle.qnt` encodes this).
