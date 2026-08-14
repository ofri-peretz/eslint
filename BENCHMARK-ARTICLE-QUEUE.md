# Article queue from the 2026-08-14 benchmark

Twelve pieces, each with a **measured** number behind it and a runner that reproduces it.
Ranked by strength of evidence × likely reach.

Source data: [BENCHMARK-RESULTS.md](./BENCHMARK-RESULTS.md) ·
[BENCHMARK-METHODOLOGY.md](./BENCHMARK-METHODOLOGY.md) ·
`benchmarks/results/published/benchmark-2026-08-14.json`

> **House rule for every piece below.** Name the version, ship the command, and publish the
> number that hurts us alongside the one that helps. The self-critical pieces (5, 6, 9) are
> what make the competitive ones (1, 2, 3) land instead of reading as a vendor pitch.

---

## Tier 1 — strongest evidence, broadest audience

### 1. 87% of a security plugin's output is a single rule
`security/detect-object-injection` produced **20,334 of 23,325 findings** across 20 projects
and 2.37M SLOC. Every other rule in the plugin combined accounts for 0.6%.

Then the hand-read: `modelOrConn[modelSymbol]` (a **Symbol** key — cannot reach a prototype),
`lines[i]` and `adapters[i]` (loop counters), `allowedAlgorithmsForKeys[keyType]` (read from a
const map). **0 of 4 sampled were real.**

**Angle:** a rule this dominant isn't a rule, it's a default. What does it cost a team?
**Evidence:** per-rule totals in the published JSON, reproducible in one command.

### 2. We measured six ESLint security plugins on the same corpus
The F1 leaderboard — Interlace 100%, sonarjs 51.4%, eslint-plugin-security 23.3%,
`@microsoft/eslint-plugin-sdl` 15.6%, no-unsanitized 10.8%, security-node 10.5% — with the
corpus, the runner and the fixtures public.

**Angle:** nobody has published a like-for-like comparison of this category. Be the reference.
**Caveat that must ship with it:** the corpus is ours, so this is a regression gate as much as
a ranking. Say so in the piece, not in a footnote.

### 3. Noise creates apathy: the case for precision over recall
The doctrine piece. 981 findings at 47% precision against 21,557 at 20% — **2.1 findings read
per real issue versus 5.0**, and **33× less noise per 1k SLOC**.

The honest half: **they find 4,311 real issues to our 461.** More coverage, far more noise.
**Angle:** which of those tools is still switched on in six months?

---

## Tier 2 — technically sharp, developer audience

### 4. Your security linter fires on `console.log`
`security-node/detect-crlf` flagged **297 files**. Samples:
`console.log('Generating search for version', version)`,
`console.log('Connect to', config.uri)` — internal build scripts, no attacker input anywhere.

**Angle:** log injection is real; a rule that fires on every `console.log` with a variable
isn't detecting it.

### 5. Our own rule fired on a Zod schema — and missed the real XPath injection
`no-xpath-injection` reported `export const QueryValidateSchema = QueryInputSchema` and stayed
**silent** on `xpath.select("//user[@id='" + id + "']", doc)`. A false positive and a false
negative in the same rule.

**Angle:** self-criticism, published before anyone else finds it. This is the piece that buys
credibility for 1, 2 and 3.

### 6. We tried to fix our false negatives. It cost 2,214 findings.
A real 300-file recall gap in `no-unsafe-regex-construction`. We implemented the fix, measured
**29 → 2,243 findings**, hand-read 18 at ~25% precision, and reverted.

**Angle:** the precision/recall trade with actual numbers, and a decision that went against
the flattering direction.

### 7. Four ways ESLint told me a benchmark passed when it had measured nothing
1. `lintText` with a `filePath` outside cwd returns *"File ignored because outside of base
   path"* and zero findings — **scored 0/76 for both sides and read as a tie**
2. Flat config lints only `**/*.js` without an explicit `files` pattern — every `.ts` silently
   skipped, in an ecosystem that is majority TypeScript
3. A stale `dist/` measured 3.3.2 while the published package was 4.1.0
4. `spec/` directories linted as production code — one repo's findings dropped 300 → 26

**Angle:** how to know your benchmark is measuring anything at all. Broadly useful beyond
security.

---

## Tier 3 — narrower, still evidence-backed

### 8. `detect-unhandled-async-errors` is not a security rule
176 files. Sample: `if (out.trim() !== 'true')` — not even async. A reliability concern wearing
a CWE badge.

### 9. We shipped `console.log('DEBUG MSG:')` to npm
`no-missing-authentication` wrote to stdout whenever `ignorePatterns` matched, corrupting the
JSON and SARIF formatters for every consumer who used that option.

**Angle:** a lint rule must never write to stdout. Found by dogfooding, fixed, locked.

### 10. `app.use(helmet())` is not a route handler
One over-broad predicate produced **24 findings across 8 clean fixtures** — the largest single
false-positive source in the plugin. `use` was in the route-handler list unconditionally.

### 11. When your escape helper doesn't count
`` new RegExp(`${escapeRegExp(dep)}\\.[a-z]{8}`) `` was flagged as unsafe regex construction —
the pattern was correctly escaped and the rule didn't recognise the helper. Found in
`eslint-plugin-security`'s output on directus.

### 12. The benchmark that measured 3 of 30 plugins
Our own harness loaded 3 plugins against a corpus spanning CWEs owned by 7. Detection read
61/76; loading the plugins that actually own those CWEs took it to 73/76 **with no new rules
written**.

**Angle:** scope errors in benchmarks, and why a low score is a harness bug until proven
otherwise.

---

## Sequencing

Publish **5 before 1**. Leading with a competitor's 87%-one-rule number reads as a hit piece;
leading with our own rule firing on a Zod schema earns the right to publish it.

Suggested order: **5 → 7 → 1 → 3 → 2** — self-criticism, then a broadly useful methodology
piece, then the competitive findings, then the doctrine, then the leaderboard as the anchor.
