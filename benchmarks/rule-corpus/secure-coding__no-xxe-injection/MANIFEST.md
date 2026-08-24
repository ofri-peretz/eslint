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
- **Bare-identifier callees were never classified.** `import { parseXml } from
  'libxmljs2'` and `const parseDocument = libxmljs.parseXml` were both
  invisible. `vulnerable/02`, `vulnerable/12`.
- **`new XMLHttpRequest()` was reported as an unsafe XML parser on sight.**
  XHR parses nothing; it has carried those letters since 1999 and is used to
  POST JSON with upload progress. Every browser application got a CRITICAL.
  `safe/10`.
- **`new DOMParser()` was reported on sight too.** Per the HTML standard a user
  agent does not fetch external entities, so the browser global cannot perform
  XXE at all. `safe/11`.

Construction-site options are now read as well as call-site options, because
fast-xml-parser takes its entity policy on `new XMLParser({...})` and not on
`parse` — `safe/02` and `vulnerable/03` are the same call differing only there.

## 2026-08-24 — three fixtures were mislabelled, and the rule agreed with them

XXE is a file read. A parser that cannot resolve an external entity cannot
perform one however it is called, so `vulnerable/` needs a parser that can.
Probed with a document declaring `<!ENTITY xxe SYSTEM "file:///…">` over a
canary file:

```
  @xmldom/xmldom   no leak; `&xxe;` left unresolved, "entity not found"
  fast-xml-parser  threw "External entities are not supported"
  xml2js           threw "Invalid character entity"
```

The corpus asserted the opposite in prose — `vulnerable/04` said outright that
@xmldom/xmldom "will honour a DTD" — and the rule's module list agreed, so the
two corroborated each other and neither was evidence. In the wild that cost 31
findings on nasa/earthdata-search, 9 on refactoringhq/tolaria and 5 on
aws/aws-toolkit-vscode: every one a parser handed a document it is
structurally unable to leak with. `xpath` was on the list too, and it parses
nothing at all.

What changed:

- `vulnerable/04-xmldom-upload.js` → `safe/12-xmldom-upload.js`. The premise
  was untested; the probe went the other way.
- `vulnerable/02` and `vulnerable/08` keep their SHAPES — a bare-import callee
  and a parameter as the tainted root — on libxmljs2, which binds libxml2 and
  does load external entities. Renamed `02-bare-import-callee.js`.
- `vulnerable/03` and `vulnerable/07` stay as they are. Both turn
  `processEntities` ON explicitly, and switching entity expansion on is a
  decision with consequences even where the consequence is expansion rather
  than exfiltration; the rule reports those through the option path, not the
  untrusted-input path.

The rule now exits the untrusted-input path only for a name that RESOLVES to
one of the four probed packages. An unresolvable receiver still reports —
silencing it would trade a measured false positive for an unmeasured false
negative.

## Residual gaps, documented rather than papered over

- A parser reached through an unresolvable receiver (`getParser().parse(x)`,
  or a parser injected as a constructor argument) is not a sink. The old name
  heuristic covered some of these, at the cost of `safe/04`. Resolving it wants
  cross-file analysis, not a regex.
- `xpath` is in the module list but evaluating an XPath is not entity
  expansion; it is there because `xpath` re-exports parsed documents.
