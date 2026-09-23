# `detect-object-injection` — TP / FP / FN map

> ## 🔒 LOCKED 2026-08-16 · amended 2026-09-13 (N9: copy loop in the callback spelling)
>
> This rule met its contract and was scored head-to-head: **100.0% F1 on the
> 28-fixture corpus against `eslint-plugin-security`'s 60.0%**, and **13,075 vs
> 17,406** findings on 5 real repositories. Behaviour is pinned by three
> mutation-verified test files beside `src/rules/detect-object-injection/index.ts`.
>
> **It reopens for three reasons only:**
>
> 1. ECMAScript/TypeScript gains a new route to `Object.prototype` or a new
>    computed-access form (TC39 Stage 4 is the bar).
> 2. A new use case arrives **with a reproduction** — code that is genuinely
>    vulnerable and unreported, or genuinely safe and reported, demonstrated by
>    RUNNING it.
> 3. A shared helper it imports changes behaviour underneath it.
>
> "Simpler", "inconsistent", or "the volume looks high" are not reasons. The
> volume has been measured. The rule's own header lists the seven edits that look
> correct and are not, each with the measurement that killed it — read that
> before changing anything, and add to it rather than deleting from it.
>
> Changing this file means: write the case here first → prove the semantics with
> `node -e` → add the fixture → re-run the duel → re-measure real-source volume →
> add a lock test that fails when reverted → move this date and say what changed.

The behaviour contract, written BEFORE the fixtures, from the semantics of the
weakness rather than from what the rule currently does. Every claim below was
verified by running it in Node 24, not reasoned about.

---

## 0. The correction that reframes the rule

**Two different weaknesses are conflated under this rule's name, and the rule
currently reports a third thing that is neither.**

|       | weakness                                         | what an attacker gets                                                     |
| ----- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| **A** | Prototype pollution (**CWE-1321**)               | a property on `Object.prototype`, affecting _every object in the process_ |
| **B** | Object injection / mass assignment (**CWE-915**) | writes a field they should not control on _one_ object (`isAdmin`)        |
| **C** | Property read with an attacker key               | leaks a field they should not read (`config.dbPassword`)                  |

The rule declares **CWE-915** and `confidence: 'low'`, and its description is
_"Detects variable[key] as a left- or right-hand assignment operand"_ — i.e. it
reports **every computed member access**. That is why the equivalent rule in
`eslint-plugin-security` produced **10,359 findings** on 5 repos in our own
benchmark, the single loudest rule measured, and why this class has a reputation
for being disabled on sight.

### Measured: a single computed write does NOT pollute

Run in Node 24 — `Object.prototype.polluted` checked after each:

| code                                                                       | global pollution?                           |
| -------------------------------------------------------------------------- | ------------------------------------------- |
| `obj['__proto__'] = { polluted: 1 }`                                       | **no** — replaces _that object's_ prototype |
| `Object.assign(obj, JSON.parse('{"__proto__":{…}}'))`                      | **no**                                      |
| `{ ...JSON.parse('{"__proto__":{…}}') }`                                   | **no**                                      |
| `JSON.parse('{"__proto__":{…}}')` alone                                    | **no**                                      |
| `Object.defineProperty(obj, '__proto__', …)`                               | **no**                                      |
| `Reflect.set(obj, '__proto__', …)`                                         | **no**                                      |
| `new Map().set('__proto__', …)`                                            | **no**                                      |
| `Object.create(null)` as target                                            | **no**                                      |
| **`obj.constructor.prototype.x = 1`**                                      | **YES**                                     |
| **`obj[k]['prototype'].x = 1`** where `k = 'constructor'`                  | **YES**                                     |
| **recursive `merge({}, JSON.parse('{"__proto__":{…}}'))`**                 | **YES**                                     |
| **recursive `merge({}, JSON.parse('{"constructor":{"prototype":{…}}}'))`** | **YES**                                     |
| **`setPath(obj, '__proto__.polluted', 1)`**                                | **YES**                                     |
| **`setPath(obj, 'constructor.prototype.polluted', 1)`**                    | **YES**                                     |

**The mechanism is a two-step traversal, not a one-step write.** `target[key]`
with `key = '__proto__'` _reads through the getter_ and returns
`Object.prototype`; the write on the NEXT step lands there. A single
`obj[k] = v` cannot reach it, because `[[Set]]` on `__proto__` invokes the
setter and only re-parents that one object.

**This is the highest-value thing on the page:** flagging every `obj[k] = v` as
prototype pollution is flagging the shape that _cannot_ cause it, while the
shapes that can — a recursive merge, a path-setter — are ordinary-looking loops
the rule does not model at all.

---

## 1. TRUE POSITIVES — must detect

### A. Prototype pollution (CWE-1321) — the two-step traversal

- **A1** user-written recursive merge/extend/deepAssign over untrusted data
  ```js
  function merge(t, s) {
    for (const k in s) {
      if (isObj(s[k])) merge(t[k], s[k]);
      else t[k] = s[k];
    }
  }
  merge({}, req.body);
  ```
- **A2** path setter splitting a string and walking it
  `set(obj, 'a.b.c', v)` / `setPath(obj, req.query.path, v)`
- **A3** `obj[k1][k2] = v` — two computed steps, either reaching `__proto__`/`constructor`
- **A4** `obj.constructor.prototype.x = v` and `obj['constructor']['prototype'].x = v`
- ~~**A5** `Object.setPrototypeOf(obj, attackerValue)`~~ — **NOT CWE-1321.**
  Measured: it re-parents that one object, `Object.prototype` untouched. What it
  does give an attacker is control of what `obj` INHERITS
  (`o.p === 'attacker'`), which is CWE-915 territory at ordinary severity, not a
  process-wide critical. Demoted; see the correction note below.
- ~~**A6** library sinks: `_.merge`, `_.set`, `_.defaultsDeep`, …~~ —
  **DO NOT DETECT BY NAME.** Measured against the installed lodash **4.18.1**:
  `_.merge({}, JSON.parse('{"__proto__":…}'))`, `_.set(o,'__proto__.p',1)`,
  `_.set(o,'constructor.prototype.p',1)` and `_.defaultsDeep` are **all safe**.
  Lodash patched these (4.17.5 / 4.17.11 / 4.17.21).

  **A rule that flagged `_.merge` would report a library that is already fixed**
  — a false positive on every lodash user, and one they _cannot satisfy_, because
  the code is correct. It is the `escape`/`sanitize` trap wearing a different
  hat: trusting a NAME (`_.merge` means dangerous) instead of evidence (which
  version is installed). A rule reading the AST cannot see `package.json`, so
  this is not knowable from the lint position at all.

  The mechanism has not gone away — it moved. A **hand-written** path setter
  still pollutes today (verified), and that is exactly what A1/A2 already cover,
  because it is visible in the file being linted.

- ~~**A7** `minimist`, `yargs-parser`, `qs.parse` …~~ — same reasoning. Version
  dependent, invisible to the linter, and long since patched upstream.
- **A8** `JSON.parse` reviver that writes into an accumulator by key
- **A9** a `for…in` over untrusted source copying into a target (no `hasOwn` filter)

### B. Object injection / mass assignment (CWE-915)

- **B1** `for (const k of Object.keys(req.body)) user[k] = req.body[k]`
- **B2** `Object.assign(user, req.body)` / `{ ...user, ...req.body }` persisted
- **B3** ORM mass update: `User.update(req.body)`, `new Model(req.body).save()`,
  `Object.assign(entity, req.body)` before `repo.save(entity)`
- **B4** `obj[req.body.field] = req.body.value` — single write, attacker picks the field
- **B5** `delete obj[k]` with untrusted `k` (removing a security flag)
- **B6** writing into `process.env[k]`, `req.session[k]`, a config object

### C. Attacker-keyed READ

- **C1** `return config[req.query.key]` — secret disclosure
- **C2** `res.json(store[req.params.id])` where store holds other users' data
- **C3** `handlers[req.body.action]()` — reaches inherited members
  (`constructor`, `toString`) and can invoke unintended functions
- **C4** `new registry[userKey]()`

### D. Dangerous keys by name, reached any way

- **D1** literal `obj['__proto__']`, `obj['constructor']`, `obj['prototype']`
  in a **traversal** position (step, not final write)
- **D2** the same reached through a `const` (`const K = '__proto__'; o[K]…`)

---

## 2. FALSE POSITIVES — must NOT report

Each of these is a real shape from real code. Reporting them is what gets the
rule disabled, which costs every finding above.

### E. Not attacker-controlled

- **E1** `arr[i]` with a numeric index — a loop counter, `.length` arithmetic,
  `parseInt`/`Number()`/`+x`, `Math.floor`
- **E2** `obj[k]` where `k` is a literal or const-folded literal
- **E3** `obj[k]` where `k` came from `Object.keys()` of the **TARGET** — and
  only for pollution. Measured, and the answer splits by weakness:

  | key source                     | pollution (CWE-1321)                                                                       | mass assignment (CWE-915)                                                      |
  | ------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
  | `Object.keys(target)`          | **safe** — bounded by the target's own keys                                                | **NOT safe** — if the target already has `isAdmin`, the attacker still sets it |
  | `Object.keys(untrustedSource)` | **NOT safe** — `JSON.parse('{"__proto__":…}')` puts `__proto__` in `Object.keys`, verified | **NOT safe**                                                                   |

  So the _same_ guard is a valid FP suppressor for one weakness and a live TP for
  the other, and which object is iterated decides it. A rule that treats
  "iterates `Object.keys`" as safe without asking _keys of what_ is wrong half
  the time — and this spec said exactly that until it was measured.

- **E4** a key from a frozen/`as const` lookup table
- **E5** an enum/union-typed key in TS (`k: keyof T`, `k: 'a' | 'b'`)
- **E6** a module-scope constant (`const FIELD = process.env.FIELD` at boot)
- **E7** **an object literal built in this file** — `const req = { params: {…} }`
  is not an inbound request (measured FP in `no-sql-injection`; same trap here)
- **E8** **the INDEX argument of an Array iteration callback** — `xs.forEach((v,
i) => { dst[i] = v })`, and `.map` / `.filter` / `.find` / `.findLast` /
  `.some` / `.every` / `.flatMap` at the same position, plus `.reduce` /
  `.reduceRight` where the index is **third**. ECMA-262 supplies that argument as
  `𝔽(k)` — a Number no caller can influence — so it is E1 reached through a
  parameter instead of a loop counter. Added 2026-09-21; fixture
  `safe/15-array-callback-index-write.js`.

  **Gated on the receiver being provably an Array, and the gate is not
  ceremonial.** Measured in Node 24:

  | receiver                                                   | `forEach` 2nd callback arg                                                        |
  | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
  | `Array`                                                    | `number` — never `__proto__`                                                      |
  | `Map` / `Set` / `Headers` / `FormData` / `URLSearchParams` | **a string key** — `new URLSearchParams('__proto__=x')` binds `k === '__proto__'` |

  Exempting on the method name alone would silence a live pollution vector.
  Position matters equally: `.reduce`'s _second_ parameter is the ELEMENT, so
  exempting by position-2 membership would silence
  `entries.reduce((acc, k) => { acc[k] = 1; return acc; }, {})` — textbook mass
  assignment. Both directions are pinned as `invalid` controls in
  `write-path-branches.test.ts`.

  Provenance is decided syntactically, never from type services: this rule reads
  no type information anywhere, so a type-services gate would not fire for most
  consumers and would leave the false positive exactly where it is reported.
  Accepted evidence is an array literal, a `T[]` / `readonly T[]` / `[A, B]` /
  `Array<T>` annotation the file states, a `const` initialized to any of those,
  or `Array.from` / `Array.of` / `.split` / `.slice` / `.concat` / `.map` /
  `.filter` / `.flat` / `.flatMap` / `.toSorted` / `.toReversed`.

  **Residual, deliberately:** a receiver whose Array-ness the file never states,
  or states somewhere the resolver does not reach — a bare untyped parameter
  (`function f(xs) { xs.forEach((v, i) => …) }`), and a class property such as
  `this.registeredArguments` declared `Argument[] = []` — still reports. That is the
  conservative side of the same trade the rest of the rule sits on — it fails to
  clear a safe access rather than clearing an unsafe one. Recorded in `SEAL.json`
  as `array-provenance-requires-evidence`.

### F. Guarded

- **F1** `Object.hasOwn(obj, k)` / `Object.prototype.hasOwnProperty.call(obj, k)`
- **F2** allowlist: `if (!ALLOWED.includes(k)) continue` / `.has(k)` / `k in schema`
- **F3** explicit denylist of `__proto__`/`constructor`/`prototype`
- **F4** a validator ran first: `zod.parse`, `joi.validate`, `ajv`, `yup`
- **F5** `typeof k === 'number'` or an index-range check

### G. Structurally immune

- **G1** target is `Object.create(null)` or `{ __proto__: null }` — of the TARGET,
  whatever spelling reaches it: inline, bound to a name, held as a property of a
  holder object, or returned by `Object.assign(<prototypeless>, …)`, which returns
  its first argument and never invokes `SetPrototypeOf` (`safe/16`)
- **G2** target is a `Map`/`Set`/`WeakMap` — `.set()` cannot pollute
- **G3** target is frozen (`Object.freeze`)
- **G4** `structuredClone` instead of a hand merge
- **G5** the read is on a `class` instance field with a fixed shape
- **G6** single-step `obj[k] = v` where the target is a **local** object that
  never escapes — worst case is one object's own prototype, not the process's

### H. The rule's own remediation

- **H1** the `Object.freeze` lookup-table + `Object.hasOwn` guard pattern the
  message recommends. **Already a measured defect elsewhere in this ecosystem** —
  `static-expression.ts` returns false for computed members, so the ecosystem
  reported its own recommended fix. Must be a fixture.

---

## 3. FALSE NEGATIVES — currently missed, must be added

- **N1** every A1/A2 shape — the rule models no traversal, so the classic CVE is
  invisible while `obj[k] = v` floods
- **N2** `dangerousProperties` reaches only ONE of four report paths — and not
  the noisy one. Measured across four shapes:

  | shape                                          | default | `[]`       | `['__proto__']` |
  | ---------------------------------------------- | ------- | ---------- | --------------- |
  | `o['__proto__'] = x` (literal name)            | reports | **silent** | reports         |
  | `function f(o,k){ o[k]=1 }` (generic computed) | reports | reports    | reports         |
  | `return cfg[req.query.k]` (read)               | reports | reports    | reports         |
  | `for (k in src) dst[k]=src[k]`                 | silent  | silent     | silent          |

  So the knob works on the path that is already precise and cannot touch the two
  that produce the volume. A user who sets `dangerousProperties: []` to quiet the
  rule still gets every `obj[k]` finding. The docs say "Properties to consider
  dangerous", and the rule's own header claims the table "does NOT decide whether
  to report — that decision is the `dangerousProperties` option", which is not
  what the code does.

  **My first measurement of this was wrong** and the error is instructive: I
  probed a single shape, saw no change, and reported the option as dead. An
  option is a function of (shape × setting) — one row of that matrix proves
  nothing about the others. Recorded in the test-plan rules below.

- **N3** library sinks (A6) — no lodash/dot-prop/object-path modelling
- **N4** `Object.setPrototypeOf`
- **N5** `delete obj[k]`
- **N6** ORM mass assignment (B3)
- **N7** `new obj[k]()` / `obj[k]()` invocation reads
- **N9** ~~the copy loop in its CALLBACK spelling~~ — **FIXED 2026-09-13.**
  `checkMassAssignmentLoop` was registered on `ForOfStatement` only, so the two
  loop spellings reported and the callback spelling did not:

  | spelling                                           | before     | after   |
  | -------------------------------------------------- | ---------- | ------- |
  | `for (const k in src) dst[k]=src[k]`               | reports    | reports |
  | `for (const k of Object.keys(src)) dst[k]=src[k]`  | reports    | reports |
  | `Object.keys(src).forEach(k => { dst[k]=src[k] })` | **silent** | reports |
  | `Object.entries(src).map(([k,v]) => { dst[k]=v })` | **silent** | reports |

  This was not a cosmetic gap. Measured in Node 24 on the recursive form, which
  was also silent:

  ```
  mergeOptions({}, JSON.parse('{"__proto__":{"polluted":"yes"}}'))
  ({}).polluted === 'yes'      // GLOBAL pollution, not one re-parented object
  ```

  So the unguarded recursive deep merge — the canonical CWE-1321 primitive, and
  the shape this file's header cites when it declines to model `_.merge` by name
  ("the mechanism still lives in hand-written traversal, which the copy-loop and
  path-setter paths already detect") — went unreported in the spelling most
  application code uses.

  The per-access exemption `isObjectKeysCallbackKey` is NOT the bug and was left
  alone: it is correct for a READ back out of the object being iterated (`k` is
  an own enumerable key of that object — fixture `safe/07-object-keys-foreach.js`),
  and it proves nothing about a WRITE onto a DIFFERENT object. Only the write
  onto another object is reported.

  Fixture: `vulnerable/04-merge-helper-callback-copy.js`. Corpus stays 14/14
  vulnerable reporting and 14/14 safe silent. Locked by three `invalid` and two
  `valid` cases in `mass-assignment.test.ts`, mutation-verified: reverting the
  `checkMassAssignmentCallback` arm fails 4 tests.

  One pre-existing `valid` fixture moved to `invalid` —
  `write-path-branches.test.ts`, "an element bound by an array pattern in map"
  (`Object.entries(src).map(([key,val]) => { dst[key]=val })`). It was a coverage
  fixture for the ArrayPattern `bindsName` branch and locked this FN while doing
  so; the comment fifteen lines above it already recorded the opposite security
  judgement ("If `keys` is `Object.keys(req.body)` then the element IS
  attacker-chosen, and this is mass assignment"). Its branch coverage is
  preserved by a read-shaped replacement.

  Surfaced by the burgee corpus: `packages/burgee/src/yargs/utils.ts:98-101`.

- **N8** `OBJECT_INJECTION_PATTERNS` is matched with
  `new RegExp(p.pattern,'i').test(property)` over **printed source**, so
  `obj[myPrototypeVar]` substring-matches `prototype` — for the risk LABEL, not
  the report gate. Wrong severity on a correct finding is still wrong output.

---

## 4. Test-plan rules

1. **Every TP fixture needs its FP twin** — the same shape, guarded. A detector
   that fires on both has learned nothing.
2. **Every option gets a test that the option CHANGES the report count.** N2
   existed because no test asserted an option _does_ something.
3. **Assert the CWE too.** A pollution finding labelled CWE-915 and a mass
   assignment labelled CWE-1321 are both wrong, and no F1 number notices.
4. **Fixtures must include the binding real code has.** Two zero-signal fixtures
   in this repo passed only while rules matched names, because they omitted the
   import. Snippets with free variables test the matcher, not the analysis.
5. **Verify semantics in `node -e` before writing the fixture.** Six of the
   thirteen pollution claims in section 0 came back the opposite of the intuition
   that would otherwise have been encoded as a fixture.
6. **A version-dependent vulnerability is not detectable from the AST.** A6/A7
   were written into this spec as true positives from CVE memory, and measuring
   killed both: the libraries are patched, and the linter cannot see which
   version is installed. Anything whose answer is "depends what's in
   `node_modules`" belongs to `npm audit` / OSV, not to a rule. Detect the
   MECHANISM where it is visible — hand-written traversal in the linted file.
7. **A rule the user cannot satisfy will be disabled**, and a disabled rule has
   zero recall on everything else it detects. Two shapes in this rule's history
   failed that test: reporting patched `_.merge` (no edit fixes it), and
   `require-url-validation` accepting only string literals (no edit short of
   hardcoding the URL). Before shipping a finding, name the edit that clears it.
