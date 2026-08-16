# Rule corpus - `secure-coding/no-xxe-injection` (CWE-611)

**The question this corpus exists to answer:** does this rule detect XXE, or
does it detect a vocabulary?

The rule was flagged in the ledger for `nominal-inference-report`, so every
fixture here is written from the LIBRARY IDIOM — libxmljs2, xml2js,
fast-xml-parser, @xmldom/xmldom, node-expat — and the `safe/` half deliberately
carries XXE's vocabulary on innocent code: a TypeORM `entityManager`, a
csv-parse binding called `parser`, a `dtd` that is a payments Data Transfer
Descriptor, and the sink names appearing only inside strings.

## Score

| | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| before (as found) | 4 | 0 | 5 | 100.0% | 44.4% | 61.5% |
| after adversarial wave | 4 | 3 | 8 | 57.1% | 33.3% | **42.1%** |
| after fixes | 12 | 0 | 0 | 100.0% | 100.0% | **100.0%** |

No competitor is registered for this sink in the duel harness: neither
`eslint-plugin-security` nor `sonarjs` ships an XXE rule, so the second and
third rows of the table would be empty. That is itself the finding about
positioning — this rule has no competition, which makes it worth being right.

## What the corpus proved

Two nominal-inference sites, both in the reporting path.

1. **The receiver.** A call was an XML parse when the receiver NAME matched
   `/xml|^dom$|domparser|jsdom|libxml|^sax$|^expat$|^parser$/i`. So a
   `csv-parse` binding called `parser` was a sink (`safe/04`), while an
   imported `XMLParser` instance called anything else was not.

2. **The input.** A value was untrusted when the argument was a bare identifier
   whose name CONTAINED one of `req body query params input xml data`.
   Measured consequences, all reproduced by probe:
   - `parser.parse(metadata)` on a module constant → **reported** (`data` ⊂
     `metadata`). `safe/09`.
   - `parser.parse(formData)` on a module constant → **reported**.
   - `parser.parse(feed)` on a request body → **silent**. The same value,
     honestly named.
   - `parser.parse(req.body.feed)` → **silent**, because a MemberExpression is
     not an Identifier. This is the most common written form of the bug.

Both are now resolved bindings: `resolveModuleBinding` for the sink,
`isStaticExpression` for the input. The question changed from "is this
untrusted?" — which has no evidence-based answer at a call site, which is why
the old code guessed — to "can this be proven constant?", which does.

Four further defects the corpus surfaced:

- **`parseXml` was not in the method list.** `parseXML` and `parseXmlString`
  were; `parseXml`, libxmljs2's real entry point and the API the rule's own fix
  text names, was not. `vulnerable/01`, `vulnerable/10`.
- **Bare-identifier callees were never classified.** `import { parseString }
  from 'xml2js'` and `const parseDocument = libxmljs.parseXml` were both
  invisible. `vulnerable/02`, `vulnerable/12`.
- **`new XMLHttpRequest()` was reported as an unsafe XML parser on sight.**
  XHR parses nothing; it has carried those letters since 1999 and is used to
  POST JSON with upload progress. Every browser application got a CRITICAL.
  `safe/10`.
- **`new DOMParser()` was reported on sight too.** Per the HTML standard a user
  agent does not fetch external entities, so the browser global cannot perform
  XXE at all. Only `@xmldom/xmldom`'s server-side namesake can, and only the
  parse call with non-static input is evidence of anything. `safe/11`.

Construction-site options are now read as well as call-site options, because
fast-xml-parser takes its entity policy on `new XMLParser({...})` and not on
`parse` — `safe/02` and `vulnerable/03` are the same call differing only there.

## Residual gaps, documented rather than papered over

- A parser reached through an unresolvable receiver (`getParser().parse(x)`,
  or a parser injected as a constructor argument) is not a sink. The old name
  heuristic covered some of these, at the cost of `safe/04`. Resolving it wants
  cross-file analysis, not a regex.
- `xpath` is in the module list but evaluating an XPath is not entity
  expansion; it is there because `xpath` re-exports parsed documents.
