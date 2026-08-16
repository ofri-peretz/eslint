# Rule corpus — `secure-coding/no-unsafe-deserialization` (CWE-502)

**The question this corpus exists to answer:** does this rule identify the SINK,
or does it identify a *spelling*?

CWE-502 is unusual among the injection classes in that the dangerous thing is
almost always a named package export — `node-serialize`'s `unserialize`,
`js-yaml`'s `load`, `funcster`'s `deepDeserialize`. That makes it the easiest
class to detect correctly and the easiest to fake: a rule can match the receiver
identifier's *name* against a list of package names and pass every test written
by the person who wrote the list.

Every fixture here is built to separate those two. The vulnerable set contains
the same js-yaml sink under three different local bindings (`yaml`, `jsyaml`,
the named import `load`) — one interface, three spellings. The safe set contains
the `yaml` package (eemeli/yaml), a pure YAML 1.2 parser that shares a variable
name with js-yaml and shares nothing else; BSON and msgpack, whose method is
literally called `deserialize` and which cannot execute anything; and the WRITE
half of the same libraries, which creates no deserialization surface at all.

Fixtures 09–12 in each directory are the ADVERSARIAL wave, written after the
rule already scored 100% on 01–08.

## What it found

| # | Fixture | Defect | Resolution |
|---|---|---|---|
| 1 | `vulnerable/02`, `03` | The js-yaml sink was detected only when the local binding was spelled `yaml`. `import jsyaml from 'js-yaml'` (the UMD global the package itself ships) and `import { load } from 'js-yaml'` (the form js-yaml's v4 README uses) were both SILENT. | Fixed — module identity resolved through `resolveModuleBinding` |
| 2 | `safe/06` | `const YAML = require('yaml'); YAML.parse(readFileSync('./defaults.yaml'))` reported CWE-502 at CRITICAL. eemeli/yaml has no function tag and the file ships inside the bundle. | Fixed — `NON_EXECUTING_PACKAGES`, and the package is now told apart from js-yaml by its import |
| 3 | `vulnerable/01` | One call produced TWO findings at the same range — a second reporting path on `VariableDeclarator` re-reported what `checkCallExpression` had already reported, and did so without asking whether the input was untrusted. **The rule's own test suite asserted the duplicate as the expected result, twice.** | Fixed — the second path deleted |
| 4 | `vulnerable/01` | Taint was lost through a method call's RECEIVER: `unserialize(Buffer.from(req.cookies.session,'base64').toString())` — CVE-2017-5941 written the way it is actually written — was invisible, because the walker recursed into a call's arguments but never into the object it was called on. | Fixed — receiver propagation |
| 5 | `safe/11` | `yaml.load(x, { schema: yaml.JSON_SCHEMA })` — the remediation js-yaml's own v4 migration guide gives in place of `safeLoad` — was reported as the vulnerability it fixes. | Fixed — `pinsSafeYamlSchema` |
| 6 | `vulnerable/07` | `funcster.deepDeserialize` was not a sink under any name. | Fixed — `MODULE_SINKS` |

## Documented, not fixed

- **`const run = eval; run(req.body.script)`** — indirect eval through an alias.
  Missed. Not fixed: it is a deliberate-obfuscation shape rather than a shape
  real handlers are written in, and the fix costs a branch that would have to be
  covered by an equally contrived test.
- **`validatedVariables` is write-only.** The set is populated from the
  `validationFunctions` option and never read, so **the `validationFunctions`
  option changes nothing at all**. The suite's own test for it
  (`const safe = validateInput(input); JSON.parse(safe)`) passes because
  `JSON.parse` is not a sink either way — it would pass with the option removed.
- **`literalPathFileVars` is write-only.** Same shape; its stated purpose
  ("safe for JSON.parse on statically bundled files") was made moot when
  `JSON.parse` stopped being a sink.
- **The messageId is chosen by printed text.** `calleeText.includes('yaml')`
  decides between `unsafeYamlParsing` and the generic message, so
  `jsYaml.load(...)` gets the generic remediation. It affects only the advice
  text, never whether the finding is made.

## Verdict

Not vacuous, and after these fixes not name-driven at the sink. The one part
still reasoning from spelling is the *taint* side (`isUntrustedInput` treats
every function parameter as untrusted), which is conservative in the reporting
direction and out of scope for this corpus.
