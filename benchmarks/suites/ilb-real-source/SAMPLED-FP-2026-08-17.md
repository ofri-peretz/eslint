# §A2 sampled false positives — 2026-08-17

The honest precision number. Everything else in the real-source suite measures
**volume**, and §A3 forbids publishing a volume ratio without this beside it.

```
node benchmarks/suites/ilb-real-source/run.mjs --allow-local --sample=24
```

`eslint-plugin-secure-coding@4.3.0` + `eslint-plugin-browser-security@1.4.1` +
`eslint-plugin-node-security@4.13.1` vs `eslint-plugin-security@4.0.1` ·
20 repos · 21,146 files · 3,036,307 LOC · Node 24.

**Sampling:** 24 per side, round-robin across (top-5-rule × repo) buckets. Not a
head-of-list slice — the repo list is in star order, so the first 24 findings are
n8n's loudest rule and nothing else, which is the shape of "sample" this protocol
replaced.

**Every ReDoS verdict here was TIMED**, at n = 200 / 2,000 / 20,000, not judged by
reading the pattern. A "polynomial backtracking" message is a claim about runtime.

---

## Result

| | TP | FP | undecidable | precision (TP / TP+FP) |
|---|---:|---:|---:|---:|
| **Interlace** | 6 | 15 | 3 | **28.6%** |
| `eslint-plugin-security` | 3 | 20 | 1 | **13.0%** |

Volume, from the same run: **them 22,530 findings, us 1,059** — 7.4 vs 0.3 per
1,000 LOC, louder on 0 of 20 repos.

So the §D2-shaped claim is:

> **21× fewer findings across 20 projects (3.0M LOC), at 2.2× the precision on a
> 24-finding stratified hand-labelled sample (28.6% vs 13.0%) — both sides on
> `recommended`, both sampled from their own top-5 rules by volume.**

**Neither number is good, and ours is not good.** 28.6% means roughly two in three
of our findings on real code are wrong. What follows is which rules own that.

---

## The finding that matters: locked rules behave differently

Broken down by rule, our side:

| rule | locked? | TP | FP | undec | precision |
|---|---|---:|---:|---:|---:|
| `secure-coding/no-redos-vulnerable-regex` | **yes, 2026-08-17** | 3 | 1 | 0 | **75%** |
| `secure-coding/no-hardcoded-credentials` | no | 2 | 2 | 0 | 50% |
| `browser-security/no-http-urls` | no | 1 | 3 | 1 | 25% |
| `node-security/no-toctou-vulnerability` | no | 0 | 4 | 1 | **0%** |
| `secure-coding/no-unlimited-resource-allocation` | no | 0 | 5 | 1 | **0%** |

The one rule in this sample that has been through the lock protocol is the most
precise rule in it, by 25 points. The two rules that have never been through it
scored zero. That is one sample and one locked rule — not proof the protocol
works — but it does say the ecosystem number is not evenly distributed, and it
names the next three rules to lock.

**`no-unlimited-resource-allocation` is our loudest rule (173 findings) at 0/5.**
It reported `new Set(...)` inside a loop five times. That is not a weakness; it is
collection construction. It should be considered for removal from `recommended`
before it is fixed — it is currently the single largest contributor to our noise.

---

## Interlace — 24 labelled

| # | rule | repo · site | verdict | reason |
|---|---|---|---|---|
| 1 | no-redos-vulnerable-regex | n8n `observation-log-observer.ts:29` | **TP** | **Timed 0.3 / 2.2 / 167 ms** at n=200/2k/20k on a failing match — quadratic, confirmed. Parses agent log lines |
| 2 | no-toctou-vulnerability | n8n `copy-tokenizer-json.js:10` | FP | `fs.mkdirSync(dir, { recursive: true })` — `recursive: true` **is** the atomic remediation for this TOCTOU; it does not throw when the directory exists |
| 3 | no-unlimited-resource-allocation | n8n `operations-processor.ts:183` | FP | `new Set(...)` inside a loop. Ordinary collection construction, no attacker-bounded size |
| 4 | no-hardcoded-credentials | n8n `constants/src/index.ts:21` | FP | `EXTERNAL_SECRETS: 'feat:externalSecrets'` — a feature-flag key. Decided by the constant's **name**, which is the defect class CLAUDE.md opens with |
| 5 | no-http-urls | n8n `verifier.ts:220` | FP | `$schema: 'http://json-schema.org/draft-07/schema#'` — a schema **identifier**, never dereferenced |
| 6 | no-unlimited-resource-allocation | axios `http.js:1193` | *undecidable* | Message says "File operations without size limits"; the site is `zlib.createUnzip`, a decompression stream. axios bounds it via `maxContentLength` elsewhere in the same file. The message names the wrong operation, so it cannot be judged from the message |
| 7 | no-http-urls | axios `shouldBypassProxy.js:362` | FP | `new URL(\`http://[${base}]/\`)` — the bracket form is an IPv6 **parsing trick**; no request is made |
| 8 | no-toctou-vulnerability | uptime-kuma `build-healthcheck.js:13` | FP | `fs.renameSync` — `rename(2)` is atomic on POSIX. Build script |
| 9 | no-http-urls | uptime-kuma `download-apprise.mjs:10` | **TP** | Downloads an installable `.deb` over plaintext HTTP. CWE-319 proper |
| 10 | no-hardcoded-credentials | uptime-kuma `simple-mqtt-server.js:4` | **TP** | `const mqttPassword = "!@#$LLam"` — a literal credential, used as one |
| 11 | no-unlimited-resource-allocation | uptime-kuma `database.js:208` | FP | Reads the server's own `db-config.json` from its own data dir |
| 12 | no-hardcoded-credentials | nest `integration/typeorm/app.module.ts:13` | **TP** | `password: 'root'` is a hardcoded DB credential. See the hygiene note — `integration/` should arguably be excluded |
| 13 | no-hardcoded-credentials | strapi `Auth.tsx:103` | FP | `TOKEN: 'jwtToken'` — a **storage key name**, not a token. Name inference again |
| 14 | no-unlimited-resource-allocation | strapi `queries.ts:153` | FP | `new Set([...a, ...b].map(...))` |
| 15 | no-http-urls | strapi `urls.ts:92` | *undecidable* | Builds the URL of the server **this process is itself running**. `host` is configurable, so the loopback exemption §B1 requires cannot be proven from the message |
| 16 | no-redos-vulnerable-regex | strapi `email-address-parser.ts:233` | **TP** | **Timed 0.1 / 2.3 / 202 ms** — quadratic. Input is a *decoded email header*, i.e. genuinely attacker-supplied |
| 17 | no-toctou-vulnerability | strapi `upload-local/index.ts:146` | *undecidable* | The message names the **use** (`fs.unlink`) and never the **check** it races. TOCTOU is a relationship between two operations; a message naming one of them cannot be verified. §C2 defect |
| 18 | no-unlimited-resource-allocation | webpack `Chunk.js:883` | FP | `new Set(childGroup.chunks)` |
| 19 | no-redos-vulnerable-regex | webpack `DotenvPlugin.js:30` | FP | **Unreproduced.** Two adversarial inputs aimed at the flagged `\\'` / `[^']` ambiguity stayed flat (0.1 ms) through n=20,000 |
| 20 | no-toctou-vulnerability | webpack `generate-css-data.js:4225` | FP | `fs.writeFileSync` in a code-generation build tool |
| 21 | no-http-urls | serverless `config-schema-handler/index.js:142` | FP | `'http://slss.io/configuration-validation'` — a JSON-Schema namespace identifier |
| 22 | no-redos-vulnerable-regex | serverless `utils.js:71` | **TP** | **Timed 0.3 / 8.5 / 956 ms** — quadratic. ARN parser |
| 23 | no-unlimited-resource-allocation | serverless `orchestrator.js:145` | FP | `new Set(Object.keys(template.Resources))` |
| 24 | no-toctou-vulnerability | serverless `esbuild/index.js:1526` | FP | `copyFile` in build tooling |

---

## eslint-plugin-security — 24 labelled

| # | rule | repo · site | verdict | reason |
|---|---|---|---|---|
| 1 | detect-object-injection | n8n `langsmith.ts:121` | FP | `span.attributes[AI_OPERATION_ID]` — key is a module constant |
| 2 | detect-unsafe-regex | n8n `observation-log-observer.ts:29` | **TP** | Same pattern as our #1, and timed the same. Both plugins found it |
| 3 | detect-non-literal-regexp | n8n `observation-log-observer.ts:39` | FP | Read the source: the pattern is a template over `SECRET_KEYS`, a module constant. Build-time determined. ~~Our rule does not report this~~ — **see the correction below: it does** |
| 4 | detect-non-literal-require | n8n `model-factory.ts:390` | FP | `require(entry.pkg)` where `entry = EMBEDDING_PROVIDERS[provider]` with an explicit `if (!entry) throw`. A closed-set lookup. We ship no rule for this sink, so we are silent by absence, not by judgement |
| 5 | detect-non-literal-fs-filename | n8n `registry.ts:115` | FP | Guarded **twice**: `normalizeLinkedFilePath()` then `findLinkedFile(skill.linkedFiles, …)`, which returns null on non-membership. An allowlist — `safe/04-allowlisted-filename`. Our rule did not report this line in the run above |

> ### Correction, same day
>
> The original rows 3, 4 and 5 each claimed "our rule does not report this". For
> row 3 that was **false**, and the mistake is instructive: the rule had not been
> *run*. `detect-non-literal-regexp` is deliberately not in `recommended`, so the
> preset-based run never enabled it — and I read its absence from the output as a
> judgement it had made. Forced on (`--sample-rules`), it reports the same file
> and line the competitor did.
>
> **Silence is not precision, and a rule that was never enabled is not silent —
> it is absent.** §0.4 says a zero is a finding about the harness until shown
> otherwise; I had the rule's own corpus fixture in mind (`safe/02-module-constant`)
> and let it stand in for a measurement.
| 6 | detect-object-injection | axios `adapters.js:75` | FP | `adapters[i]`, `i` a loop index |
| 7 | detect-unsafe-regex | axios `AxiosHeaders.js:23` | FP | **Timed flat** (0.0 ms through n=20,000). `[^\s,;=]+` and `\s*` are disjoint |
| 8 | detect-non-literal-fs-filename | axios `sandbox/server.js:21` | **TP** | `createReadStream(join(resolve(), 'sandbox', file))` with a request-derived `file` — traversal |
| 9 | detect-object-injection | uptime-kuma `2026-01-02-gamedig…js:154` | FP | Lookup in a const migration map |
| 10 | detect-non-literal-fs-filename | uptime-kuma `check-lang-json.js:16` | FP | Path built locally from a directory listing, in a dev script |
| 11 | detect-non-literal-regexp | uptime-kuma `globalping.js:357` | **TP** | `new RegExp(keyword, 'i')` where `keyword` is stored monitor configuration — a caller-supplied pattern reaching the constructor |
| 12 | detect-unsafe-regex | uptime-kuma `aliyun-sms.js:159` | FP | **Timed flat.** `(?:\d{1,3}\.){3}` is fully bounded |
| 13 | detect-object-injection | nest `integration/…/app.module.ts:24` | FP | `this.config[key]` in integration scaffolding |
| 14 | detect-non-literal-fs-filename | nest `tcp-tls/app.controller.ts:36` | *undecidable* | The reported line is the bare token `fs` — the finding does not point at the call. Cannot be judged: their **localisation** failed |
| 15 | detect-non-literal-require | nest `load-package.util.ts:14` | FP | Nest's documented optional-peer-dependency loader; `packageName` is passed as a literal by Nest's own callers |
| 16 | detect-non-literal-regexp | nest `middleware/builder.ts:121` | FP | Route regex built from the application's own route table |
| 17 | detect-object-injection | strapi `lint-staged.shared.mjs:27` | FP | `ignored[index]` from `filter((_f, index) => …)` — a loop index |
| 18 | detect-non-literal-fs-filename | strapi `cloud/config/local.ts:17` | FP | `lstat` on the CLI's own config directory |
| 19 | detect-non-literal-require | strapi `helpers.ts:18` | FP | ``require(`${process.cwd()}/package.json`)`` — its own manifest |
| 20 | detect-non-literal-regexp | strapi `parse-to-chalk.ts:19` | FP | `color` ranges over a closed set of chalk colour names |
| 21 | detect-unsafe-regex | strapi `template.ts:188` | FP | **Timed flat** (0.2 ms at n=20,000). `/` forces the split point between the two quantifiers |
| 22 | detect-object-injection | express `application.js:111` | FP | Key is `trustProxyDefaultSymbol`, a module Symbol |
| 23 | detect-non-literal-require | express `view.js:81` | FP | `require(mod)` where `mod` is the view-engine name from the file extension — Express's documented engine resolution |
| 24 | detect-non-literal-fs-filename | express `statSync(path):201` | FP | Express's own view-lookup primitive. The traversal risk belongs to an application that passes user input to `res.render`, not to the framework's resolver |

---

---

## Per-rule sample — the four locked rules

The volume-stratified sample above answers the ECOSYSTEM question. It cannot
seal a rule: of the four locked rules only `no-redos-vulnerable-regex` reaches
the top 5 by volume, so the other three had **no real-source precision number at
all** and "sealed" meant "sealed on fixtures we wrote".

```
node benchmarks/suites/ilb-real-source/run.mjs --allow-local --sample=27 \
  --sample-rules=secure-coding/detect-object-injection,node-security/detect-non-literal-fs-filename,secure-coding/detect-non-literal-regexp
```

This deliberately over-weights rules the volume sample would barely see. **It is
a different claim from the ecosystem precision and must never be quoted as it.**

| rule | locked | TP | FP | precision |
|---|---|---:|---:|---:|
| `no-redos-vulnerable-regex` | 2026-08-17 | 3 | 1 | **75%** |
| `detect-non-literal-regexp` | 2026-08-17 | 3 | 7 | **30%** |
| `detect-non-literal-fs-filename` | 2026-08-17 | 0 | 4 | **0%** |
| `detect-object-injection` | 2026-08-16 | 0 | 13 | **0%** |

**All four score 100.0% F1 on their own corpora.** Three of them are at or below
30% on code we did not write. That is the gap this protocol exists to find, and
until now the protocol had not looked.

### `detect-object-injection` is our loudest rule by an order of magnitude

Forced on, it reports **15,306** findings over 3.0M LOC — against the entire
incumbent plugin's 22,530. It is absent from the ecosystem table above only
because it is not in `recommended`, which is also the only thing keeping it out
of consumers' inboxes.

Its 13 sampled findings are all the same shape: an index into a structure the
program itself owns — an OpenTelemetry span map, an axios adapter registry, a
knex migration lookup table, express's `this.engines[extension]`, a webpack
`pkg.bin[cli.binName]`. No attacker is present in any of them.

**Two are a guard failing, not a missing guard.** `fastify.js:255`
(`this[pluginUtils.kRegisteredPlugins]`) and `mongoose/lib/aggregate.js:59`
(`modelOrConn[modelSymbol]`) are **Symbol-keyed**, and a Symbol can never be
`'__proto__'` — the rule has an `isSymbolKey` guard for exactly this. Probed:

```js
const kPlugins = Symbol('plugins');  self[kPlugins]      // quiet  ✓
import { kPlugins } from './utils';  self[kPlugins]      // REPORTS ✗
```

`isSymbolKey` resolves an in-file `Symbol()` and gives up on an imported
binding. Module-scope symbols live in a shared `symbols.js` in every codebase
that uses them, so the guard misses the normal spelling and catches the rare
one. Fixing it is bounded and mechanical, and it is the first thing to do here.

### `detect-non-literal-regexp` — the two real positives, and the honest miss

TP: `new RegExp(keyword,'i')` over stored monitor configuration (uptime-kuma),
`new RegExp(pattern, flags)` over a user-supplied JSON-schema keyword
(serverless), and `new RegExp(atom.$regex)` in parse-server's Mongo transform —
the last is a client-supplied query operator reaching the constructor, a real
ReDoS vector.

The instructive FP is directus:

```js
new RegExp(`${escapeRegExp(dep.replace(/\//g, '_'))}\\.[a-zA-Z0-9_-]{8}\\.entry\\.js`)
```

The pattern is escaped already, by a real `escapeRegExp` one call away. `isNeutralised`
recognises the escape only when it can see the metacharacter-class regex literal
at the site, and deliberately refuses to trust the callee's NAME (a
`const escapeRegExp = (s) => s` shipped in this ecosystem once). So the rule is
wrong here *because* of a decision that is right in general. Naming it rather
than filing it as noise.

---

## Corpus-hygiene observations this sample produced

Both are §A5 items, and both were found by *reading findings*, not by auditing the
runner — which is the argument for running this protocol at all.

1. **`*.test.ts` colocated with source was being linted.** `SKIP_DIR` catches test
   *directories*; the modern convention is a sibling file. Fixed in the same
   commit (`SKIP_FILE` now matches `.test.` / `.spec.`), and the run above is
   post-fix. The pre-fix sample contained `no-http-urls` firing on
   `expect(isOriginAllowed('http://foo.example.com', …))` — an assertion.
2. **`integration/` is not excluded** (sample #12, and their #13/#14). Nest keeps
   a full application under `integration/`. It is not obviously wrong to lint it —
   it is real application code — but a hardcoded `password: 'root'` there is test
   scaffolding, and counting it as a true positive flatters us. **Left in
   deliberately, and flagged here rather than silently excluded**: dropping the
   directory that produced one of our six TPs would be corpus-shopping.

## Tier

**`PUB`** — committed runner, code we did not author, sampled FP with n stated.
Per §D2 the volume ratio may only be published in the same sentence as the
precision pair.
