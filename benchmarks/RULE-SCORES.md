# Rule scores — every measurement, with the command that produced it

**2026-08-18.** One row per measurement actually run, not per claim made. A number
with no command beside it is not in this file
([§0.1](../BENCHMARK-CRITERIA.md)).

Environment: Node 24 · ESLint 10.8.1 · `eslint-plugin-secure-coding@4.3.0` +
`eslint-plugin-browser-security@1.4.1` + `eslint-plugin-node-security@4.13.1` ·
competitors `eslint-plugin-security@4.0.1`, `eslint-plugin-regexp`.

Real-source corpus: **20 repositories · 21,146 files · 3,036,307 LOC**, test
directories and colocated `*.test.*` excluded, minified excluded by path and by
average line length.

---

## 1. Corpus duel — our fixtures, both sides

`npx tsx benchmarks/suites/ilb-rule-duel/run.mjs <plugin>/<rule>`

**Tier `INT`.** Both sides run on fixtures we wrote. A regression gate and a
statement about which shapes each implementation can see — *not* a precision
claim about real code.

| Rule | Fixtures | Ours F1 | Competitor | Theirs F1 |
| :--- | ---: | ---: | :--- | ---: |
| `secure-coding/detect-object-injection` | 14v/14s | **100.0%** | `security/detect-object-injection` | 60.0% |
| `secure-coding/no-redos-vulnerable-regex` | 14v/14s | **100.0%** | `security/detect-unsafe-regex` | 60.0% |
| " | " | " | `regexp/no-super-linear-backtracking` | **88.0%** |
| `secure-coding/detect-non-literal-regexp` | 15v/15s | **100.0%** | `security/detect-non-literal-regexp` | 70.6% |
| `secure-coding/no-unlimited-resource-allocation` | 10v/16s | **100.0%** | — | — |
| `node-security/detect-non-literal-fs-filename` | 10v/10s | **100.0%** | `security/detect-non-literal-fs-filename` | 71.4% |

`eslint-plugin-regexp` is the honest competitor for ReDoS: it ties us on
precision (0 FP) and loses only on patterns built at RUNTIME, which it does not
analyse. We share `scslre` with it.

## 2. Real-source precision — code we did not write

`node benchmarks/suites/ilb-real-source/run.mjs --allow-local --sample=N --sample-rules=<rule>`

**Tier `PUB`.** Every finding hand-labelled TP / FP / undecidable with a reason;
labels in [`suites/ilb-real-source/SAMPLED-FP-2026-08-17.md`](./suites/ilb-real-source/SAMPLED-FP-2026-08-17.md).

| Rule | Findings on corpus | Labelled | TP | FP | Criterion | Verdict |
| :--- | ---: | ---: | ---: | ---: | :--- | :--- |
| `node-security/detect-non-literal-fs-filename` | **1** | 1 (census) | 1 | 0 | census | **passes** |
| `secure-coding/no-unlimited-resource-allocation` | **3** | 3 (census) | 3 | 0 | census, `warn` ≥70% | **passes** (was 173 findings) |
| `node-security/no-toctou-vulnerability` | **59** | 59 (classified) | ~0 | ~59 | census, `error` ≥95% | **fails — fix written, NOT shipped** |
| `secure-coding/no-redos-vulnerable-regex` | 123 | 22 | 6 | 15 | ratio, was `error` ≥95% | **28.6% — removed from presets 2026-08-18** |
| `secure-coding/detect-non-literal-regexp` | 243 | 10 | 3 | 7 | opt-in, no floor | 30% |
| `secure-coding/detect-object-injection` | 14,696 | 13 | 0 | 13 | opt-in, no floor | 0% |

### `no-redos-vulnerable-regex` — classified by timing

`npx tsx scripts/redos-classify.mts --file <patterns.txt>`

The earlier sweep used six fixed attack strings and left 18 of 22 patterns
unclassified. The classifier draws its alphabet from the pattern itself and
pumps to n=20,000, and is **validated in both directions**: it reproduces all 7
corpus `vulnerable` patterns as exponential and leaves the genuinely linear
`safe` ones unreproduced.

| Verdict | Count | Meaning |
| :--- | ---: | :--- |
| exponential | **0** | 24 characters denies an endpoint |
| polynomial | 6 | 143–197 ms, needs a 20,000-character input |
| unreproduced | 15 | the generator found nothing — evidence toward FP, **not proof of safety** |
| uncompilable | 1 | extraction artifact, excluded |

~28.6% against a 95% bar. **Not one finding on real code was catastrophic.**
Removed from `recommended` and `flagship` on 2026-08-18, still exported and in
`strict`, locked by four tests.

It also found a conflict worth naming: three of the rule's own `safe` fixtures
ARE polynomial at n=20,000 and read as clean at the n=30 they were timed at.
Neither measurement is wrong — exponential needs 24 characters to bite,
polynomial needs 20,000 — but the corpus does not currently distinguish them.

### `no-unlimited-resource-allocation` — 173 findings to 3, and 0 of 2 to 2 of 2

Measured 2026-08-18, before any change: **173 findings** on the 20-repo corpus,
and the rule detected **neither** of the two vulnerable fixtures in
`benchmarks/corpus/CWE-770/`. Both halves came from one predicate —
`isUserInputExpression` running `String.includes` over the printed source.

| Class | Findings | Verdict | Why |
| :--- | ---: | :--- | :--- |
| `new Set(x)` / `new Map(x)` inside a loop | 107 | FP | `Set` takes an ITERABLE, not a size. No input makes the copy larger. |
| other allocation-in-loop | 25 | FP | loop bound is a constant or an in-memory collection |
| `xml2js.parseString` as billion laughs | 24 | FP | measured: sax-js rejects custom entities outright |
| `fs.read/write` on a config path | 11 | FP | `dataDir`, `queryParams`, `inputFile`, `entryMetadataPath` — substrings |
| `new Buffer(data)` | 1 | FP | overloaded constructor; a conversion, not a size |
| decompression with no output bound | 5 | 3 TP / 2 FP | axios counts the decompressed bytes downstream |
| **after the fix** | **3** | **3 TP / 0 FP** | strapi, directus, nodemailer — each read at the cached source |

The xml2js premise had never been measured. It is false:

```
xml2js 0.6.2 / sax 1.6.1 — every payload answers `Invalid character entity`
  <!DOCTYPE d [<!ENTITY a "HELLO">]><d>&a;</d>                      ERR
  <!DOCTYPE d [<!ENTITY a "xx"><!ENTITY b "&a;&a;&a;">]><d>&b;</d>  ERR
  <!ENTITY xxe SYSTEM "file:///etc/passwd">                          ERR
  nine-level billion laughs                ERR in 1 ms, 0 chars expanded
```

`XML_PARSE_METHODS` was `parseString` / `parseStringPromise` — the xml2js API
and no other — so xml2js was the only library the path could ever fire on.

The rule now scores **2 of 2** on `benchmarks/corpus/CWE-770/` and **100% F1**
on a new 26-fixture corpus at
`benchmarks/rule-corpus/secure-coding__no-unlimited-resource-allocation/`,
written from the measured false positives rather than from the test file.

**What this does not say:** the two axios findings are recorded as FP because
axios counts the decompressed bytes against `maxContentLength` and aborts. That
limit is opt-in and axios's default is `-1`, so an axios user relying on
defaults is still unbounded. The rule stops reporting the *library* implementing
the mechanism; it says nothing about the *consumer* who leaves it off.

### `no-toctou-vulnerability` — 59 findings, and the fix is a contract change

`node benchmarks/suites/ilb-real-source/run.mjs --allow-local --sample=200 --sample-rules=node-security/no-toctou-vulnerability`

Ships at **`error` in `recommended`**, so every one of these fails a consumer's
build. 59 findings, under 73, so the census criterion applies: label all of
them, pass at zero false positives.

| Shape | Findings | Example |
| :--- | ---: | :--- |
| `mkdir` / `rm` carrying `recursive: true` or `force: true` | 22 | `if (!existsSync(dir)) mkdirSync(dir, { recursive: true })` — uptime-kuma `server/database.js:141` ×4, pm2 `lib/Client.js:133` |
| build / release tooling on its own directories | ~25 | `if (existsSync('./extra/healthcheck-armv7')) renameSync(…)` — uptime-kuma `extra/build-healthcheck.js:13` |
| `createReadStream` gated on existence | 3 | n8n event-bus log reader |
| truncating own log files | 3 | pm2 `lib/API/LogManagement.js:49` |
| in `os.tmpdir()` | **1** | n8n `.../node-parameter-schema/test-schema-setup.ts:73` |

**The rule's own corpus already says what the finding is.** All 16 `vulnerable/`
fixtures are rooted at `os.tmpdir()` or a literal `/tmp` path, and they say why
in their own headers — *"on a path in the shared /tmp namespace. Any local user
can replace the name"*, *"an attacker's symlink in /tmp hands them everything
written into it afterwards"*. A check/use window is only exploitable where a
second party can act inside it.

The implementation never checked that. It exempts paths that reach a **per-user**
root (`os.homedir()`, `$XDG_CACHE_HOME`) and reports everything else, including
every build script operating on its own checkout.

Requiring the shared root to be **provable** was implemented and measured:

| | findings on 20 repos | corpus F1 |
| :--- | ---: | ---: |
| as shipped | 59 | 100% |
| requiring a shared root | **1** (a true positive) | 100% |

**Not shipped.** It is a contract change on a rule at `error` — it flips the
default from *report unless proven per-user* to *report only where a shared
namespace is proven* — and roughly 15 unit cases exist specifically to assert
the current direction (`const p = notAFunction(); if (existsSync(p)) unlinkSync(p)`
is invalid today precisely because the path does not resolve). The rule's tests
and the rule's corpus disagree with each other, and the measurement says the
corpus is right; but reversing a security rule's default against its own
documented tests is Ofri's call, not an overnight patch. See
`RULE-TO-BAR-PLAYBOOK.md` for the design.

Shipped from this session: the §C2.4 message now names what a false positive
looks like, which was the rule's one failing seal probe.

### `detect-non-literal-fs-filename` — the fix trail

Each step re-measured on the full corpus, recall re-checked on the duel:

| Step | Findings | Duel |
| :--- | ---: | :--- |
| Start of 2026-08-17 | 37 | 10/10, F1 100% |
| Literal branch narrowed to sensitive targets; `process.pid` no longer taint | 15 | unchanged |
| `ctx`/`context` require request evidence; taint-as-base; destructured `path` import | **1** | unchanged |

The one finding is `fs.readFileSync('/etc/passwd')` in `pm2/lib/tools/passwd.js`
— a TRUE POSITIVE the old rule **missed**, because it had no `../` to match.

## 3. Ecosystem volume — the census

`node benchmarks/suites/ilb-real-source/run.mjs --allow-local --all-rules`

121 rules enabled, 82 fired, **39 silent on 3.04M lines** — the silent ones are
listed by name in the output, because an absent row reads as "fine" and a named
zero reads as "unverified".

| Findings | per 1k LOC | Rule |
| ---: | ---: | :--- |
| 14,696 | 4.84 | `secure-coding/detect-object-injection` |
| 2,392 | 0.79 | `secure-coding/no-improper-type-validation` |
| 1,830 | 0.60 | `secure-coding/no-insecure-comparison` |
| 435 | 0.14 | `secure-coding/no-unchecked-loop-condition` |
| 366 | 0.12 | `secure-coding/no-missing-authentication` |
| 243 | 0.08 | `secure-coding/detect-non-literal-regexp` |

Three rules are 87% of the ecosystem's entire output.

`recommended` vs `recommended`: **us 1,059 findings, them 22,530** — 0.3 vs 7.4
per 1k LOC, at **28.6% vs 13.0%** sampled precision (n=24/side). With every rule
enabled: us 21,951, them 22,530.

## 4. Behavioural probes — §B and §C

`npx tsx scripts/rule-seal-probe.mts <plugin>/<rule>`

Nine checks that only appear when a rule RUNS, and that `rule-audit.ts` cannot
see because it reads source. Positive control first: each probe drives itself
from the rule's own `vulnerable/` fixtures, so a "quiet" verdict is never
reported without first proving the rule reports on that code.

| Rule | Probes | Tokens/finding (budget 120) | CVSS |
| :--- | :--- | ---: | :--- |
| `secure-coding/detect-object-injection` | **9/9** | 96 mean, 119 worst | 9.8 |
| `node-security/detect-non-literal-fs-filename` | **9/9** | 88 mean, 91 worst | 7.5 |
| `secure-coding/no-redos-vulnerable-regex` | **9/9** | 109 mean | 7.5 |
| `secure-coding/detect-non-literal-regexp` | **9/9** | 77 mean, 77 worst | 7.5 |

Covers: test-file self-skip (filename and path), deduplication, determinism,
stdout/stderr silence, schema-vs-`defaultOptions` drift, token budget, CVSS
spread, and §C2.4 false-positive guidance.

## 5. Test and coverage state

| Package | Tests | Coverage |
| :--- | ---: | :--- |
| `eslint-plugin-secure-coding` | 3,200 | 100% |
| `eslint-plugin-node-security` | 2,688 | 100% |
| `@interlace/eslint-devkit` | 1,721 | 100% |

---

## What this table does not say

- **Three of the four rules are not sealed.** `no-redos-vulnerable-regex` ships
  at `error`, where the bar is ≥95%, and is unscored. The two opt-in rules have
  no floor to clear, which is not the same as being good.
- **117 of 121 rules have never been measured per-rule on real code.** They are
  unscored, not passing.
- **We label our own findings.** Every label carries its file, line and reason so
  a reader can disagree and recompute. It is not independent review.
