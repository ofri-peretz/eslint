# Rule corpus — `browser-security/require-mime-type-validation` (CWE-434)

Written from CWE-434 semantics and real upload idiom, **not** from the rule's
own test file. The point is independent evidence: a corpus derived from the
tests can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. Every competitor is
scored on exactly the same files.

## What the rule claims

`meta.docs.description` — "Require MIME type validation for file uploads".

## What it actually did, before this corpus

Two detectors, and in a **browser** plugin neither one worked on browser code:

1. `multer().single('file')` — Express middleware, matched only in the
   fully-inlined spelling. The idiomatic `const upload = multer({ dest });
   upload.single('file')` was QUIET, which is how almost all real multer code is
   written (`vulnerable/07`). It also accepted a `limits` option as validation —
   `limits: { fileSize }` caps how big a file may be and says nothing about what
   it is — and a test asserted that silence as correct (`vulnerable/08`).

2. `upload(x)` — **any** call to a function spelled `upload` carrying a single
   identifier, reported at CWE-434 / CVSS 8.8 (`safe/11`). No file, no FileList,
   no media type: a pure name match, and the repo's forbidden defect class.

Net: zero coverage of any client-side upload shape, and the only firing path was
a spelling.

## The two browser shapes this corpus is built around

- **No check at all** (`01`, `04`, `05`, `06`, `10`). The `accept` attribute is a
  picker hint the browser does not enforce, and drag-and-drop ignores it
  entirely — `vulnerable/05` sets `accept="image/png"` and is still wide open.

- **A check that is not a check** (`02`, `03`, `09`). `image/svg+xml` satisfies
  `type.startsWith('image/')` and then executes script when the file is served
  back from the same origin. This is the highest-value shape in the corpus and
  the rule had no notion of it.

## Waves

`01`–`07` are the first wave. `08`–`10` are the **adversarial wave**: a `limits`
option masquerading as validation, the `indexOf(...) === 0` spelling of a prefix
test, and a background-sync worker replaying a queued upload.

`safe/05` and `safe/06` are the adversarial safe direction, and they are the
whole reason the media-type test is anchored to the IANA top-level registry
rather than to the presence of a `/`: `node.type.startsWith('TS')` is the most
common `.type.startsWith` in any TypeScript codebase, and a Redux slice's
`action.type.startsWith('user/')` looks exactly like a media-type prefix.
