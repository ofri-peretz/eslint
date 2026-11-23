# Rule authoring

> Moved out of AGENTS.md on 2026-11-23 so it loads when you write or review a rule, not in every session. The mechanical parts are gates: `npm run lint:taxonomy` (plugin scope), `npm run lint:name-inference` (name is not a type), `rule-audit`, `key-vocabulary`, the per-rule budget and the oxmutate ratchet.

## Plugin Scope Rules

**README logo row: Interlace + ESLint + oxlint + the SDK/protocol the plugin targets.**
Every plugin that lints a specific platform, protocol or SDK opens its README with the same
centred row, all marks at `height="90"`, `&nbsp;&nbsp;` between them. The SDK mark links to
that SDK's npm page — it is what tells a reader (and a search engine) which package this
plugin is for. Plugins with no external target (`secure-coding`, `maintainability`, …) keep
the two-mark row.

Marks are **self-hosted** in `apps/docs/public/` and referenced as
`https://eslint.interlace.tools/<name>-logo.svg`. Never hotlink a third-party CDN: npm
proxies README images through GitHub camo with long-lived caching, so an external URL that
moves leaves a broken image that is painful to flush.

> ⚠️ **Deploy the docs site before publishing a package whose README references a new mark.**
> camo caches aggressively; if it fetches a 404 first, the broken image sticks around long
> after the asset lands. Order: merge → docs deploy → verify the SVG is 2xx → release.

Source marks from [simple-icons](https://simpleicons.org) (CC0) where available, recoloured
`#8b949e` so they read on light and dark GitHub themes. If simple-icons does not carry a
brand, treat that as a signal the mark is restricted rather than something to work around —
**OpenAI is the live example: simple-icons 404s on it.** Ship the row without that mark
rather than sourcing the logo elsewhere, unless the brand's guidelines have been read and
clearly permit it.

**Naming: every security plugin is `eslint-plugin-<ecosystem>-security`.** The suffix is
what tells a consumer the package is protective rather than stylistic, and it keeps the
family scannable on npm. No exceptions. `eslint-plugin-pg` and `eslint-plugin-jwt`
predated it and were renamed to `eslint-plugin-postgresql-security` /
`eslint-plugin-jwt-security` in #414; the old names stay published and deprecated on npm,
and their pre-rename plugin keys (`pg/`, `jwt/`) stay registered as aliases so existing
configs keep resolving. `eslint-plugin-secure-coding` is the one remaining exception — it
is cross-cutting rather than per-ecosystem, so the `<ecosystem>` slot has nothing to hold.
Renaming a published package costs npm deprecate + republish, every config example and
the live awesome-list entries, so it is a decision, not a cleanup.

When creating or reviewing rules, ensure they're in the correct plugin:

**The decisive test — apply it before anything else:** *can this rule fire on
code whose only dependency is the language and the platform?*

- **Yes** → `secure-coding` (language), `node-security` (Node runtime/stdlib),
  `browser-security` (DOM/BOM/transport).
- **No — it needs driver, framework or SDK X installed** → X's own protective
  plugin. Never the code-agnostic three, no matter how generic the *vulnerability
  class* sounds.

The vulnerability class is not the scope test; the detection gate is. SQL
injection is a universal class, but detecting it means matching `.query()` /
`.raw()` sinks that only exist in a DB driver — so it lives in `pg` and the other
per-driver plugins, not in `secure-coding`. The recurring failure is name
association: every `no-*-injection` rule drifts toward `secure-coding` because
its siblings are there.

Two smells that mean you are in the wrong plugin:

1. You compare against a package identifier (`'sequelize'`, `'multer'`, `'cors'`)
   anywhere in the detection path.
2. Two plugins would report the same line, and you are reaching for a dedupe
   test to make that acceptable. Fix the placement instead — no rule can detect
   that another plugin is installed, so the duplicate reaches the user.

Enforced by `npm run lint:taxonomy` (`scripts/lint-plugin-taxonomy.ts`, gated in
the fast quality job). Violations predating the guard are listed in its
`GRANDFATHERED` array with the reason and the migration target.

### A name is not a type

The sibling of the AST-not-printed-source doctrine, and the systemic cause
behind #504, #505, #506 and four already-fixed rules:

| rule                             | inferred from            | reality                |
| -------------------------------- | ------------------------ | ---------------------- |
| `no-timing-unsafe-compare`       | a variable named `token` | compared to a literal  |
| `jwt/no-decode-without-verify`   | a method named `decode`  | a TOML parser          |
| `no-sensitive-data-exposure`     | the word `password`      | English prose          |
| `detect-suspicious-dependencies` | a name near `react`      | preact, a real package |
| `no-xpath-injection`             | `//` in printed text     | a PEM certificate      |

**Do not report — or suppress — based on a SUBSTRING of an identifier's
spelling.** `propName.includes('phone')` matches `phoneBookLength`;
`objectName.includes('app')` matches `appleCount`; `name.includes('react')`
matches `preact`. Resolve the identifier to an import, a call target, or a
value first.

Two things that are explicitly *not* this, because the distinction is the
whole point:

- **Exact membership.** `REQUEST_ROOTS.has(node.name)` matching `req`/`request`
  is a naming convention, not an inference. It stays.
- **Whole-word matching after tokenising.** Split the name on camelCase and
  separators, then match words — `login`, `dialog`, `catalog` and `blog` all
  contain "log" and none is a logger. This is the *fix*, not the defect.

Suppression counts too, and is the quieter half: withholding a finding because
a callee name contains `encrypt` means `decrypt` reads as safe, and a wrong
guess there is a false negative nobody sees.

Enforced by `npm run lint:name-inference` (`scripts/lint-name-inference.ts`,
same quality job). The 25 existing sites are listed in its `REGISTERED` array
with the direction (`report` / `suppress`) and the reason — as debt, not as an
exemption. A rule that leaves the list must be deleted from it; a stale entry
fails the gate.

| If the rule...                                                  | It belongs in...                   |
| --------------------------------------------------------------- | ---------------------------------- |
| Fires with no dependency installed — pure language semantics    | `eslint-plugin-secure-coding`      |
| Needs a SQL driver or ORM (`.query()`, `.raw()`, `.execute()`)  | `eslint-plugin-postgresql-security` + the per-driver plugins |
| Checks Vercel AI SDK patterns (`generateText`, `streamText`)    | `eslint-plugin-vercel-ai-security` |
| Checks OpenAI SDK patterns (`openai.chat.completions`)          | `eslint-plugin-openai-security`    |
| Detects agentic patterns (tools, autonomous agents) across SDKs | `eslint-plugin-agentic-security`   |

---

## Quality Checklist for New Rules

Before approving any new ESLint rule:

1. **Conceptual Fit**: Is it in the right plugin?
2. **Coverage**: ≥90% line coverage — a floor, never evidence of correctness (see below)
3. **Performance**: O(n) complexity, single AST pass
4. **Documentation**: Rule docs with OWASP mapping
5. **Messages**: Clear, actionable error messages
6. **ESLint Peer Dep**: Package declares `"eslint": "^8.40.0 || ^9.0.0 || ^10.0.0"` — see [docs/ESLINT_VERSION_SUPPORT.md](./ESLINT_VERSION_SUPPORT.md)

See **[docs/QUALITY_STANDARDS.md](./QUALITY_STANDARDS.md)** for the full checklist.

### Coverage is a floor, not a correctness signal

Coverage measures which lines ran. It says nothing about whether the assertion
attached to them was right. Every defect fixed on 2026-08-10 ran inside a
passing test, in a package at 100% coverage.

The failure mode is specific and it has a shape. From `no-xpath-injection`
before #490:

```js
describe('Coverage - branch gaps', () => {
  // id 55 false arm + id 62 false arm: no interpolation, dangerous XPath template
  { code: 'const xpath = `//users/..`', errors: [{ messageId: 'dangerousXpathExpression' }] },
```

A block named for branch coverage, a comment naming branch IDs, and a fixture
asserting that a hardcoded string never passed to any evaluator is a
vulnerability. It was written to make a branch execute, and to do that it
declared the bug correct. When the rule was fixed, the test failed — it was
pinning the defect. Four fixtures in that block were of this kind.

A 100% *gate* is what produces that: it pressures you to write tests that
reach branches instead of tests that challenge behaviour.

So:

- **Keep coverage as a floor.** Do not cite it as evidence a rule is correct,
  in a PR description, a changeset, or a claim in `CLAIMS.md`.
- **A fixture added to reach a branch must still assert behaviour someone
  would defend out loud.** If you cannot say why the expected outcome is right
  without referring to the branch it covers, the fixture is pinning
  implementation, not behaviour.
- **Pair it with evidence coverage cannot give.** Mutation-verify — revert the
  rule and confirm named fixtures turn red — and run the corpus scan, which
  answers the question coverage cannot: *is this true about code we did not
  write?* Both are the convention in #546 and should stay the convention.
- **oxmutate automates the first half for opted-in plugins.** `npm run mutation
  -- --plugin <name>` mutates every line of `src/rules/**` and lists the
  changes no fixture notices; `.agent/mutation-baseline.json` ratchets the
  per-rule score in CI. A survivor in a guard is a missing `valid` case (FP
  risk), one in detection a missing `invalid` case (FN risk). See
  [docs/MUTATION_TESTING.md](./MUTATION_TESTING.md).

### Flag only clear problems; decide by structure, never by string values

A rule reports what a senior engineer would agree is a real problem: a
violated best practice the code itself proves. When the code does not prove
it, the rule stays silent. A missed finding costs less than a rule people
learn to ignore.

- **Decide by structure.** Look at where a value flows, which call it reaches
  and what the object configures. A `username` literal in a `find*` filter
  is a lookup, not a credential. `ssl: false` in a connection config is an
  explicit decision to drop TLS.
- **Never decide by matching specific string values.** That rules out
  hostname lists (`localhost`, private IP ranges, `*.internal`),
  "looks remote / looks local" guesses and value allowlists standing in for
  analysis. A rule cannot know the deployment context, and such a list is
  wrong somewhere the moment it ships. (Key names the API itself defines,
  such as `ssl`, `rejectUnauthorized` and `sslmode`, are structure, not
  guesses.)
- **A missing setting is not a finding** unless the code proves the risk.
  `require-tls` reports explicit disabling only, never a config that omits
  `ssl`.

This also applies to fidelity-model judgment calls and to every agent brief:
when a divergence comes down to judgment, the answer is silence, not a
heuristic.

### Reporting posture: report the finding, let the consumer scope it

Some rules are correct detections whose advice is arguably wrong in a
particular context. `express-security/require-helmet` and
`require-rate-limiting` firing on single-purpose demo apps in
`express/examples/*` is the canonical case — 92 findings across four rules
that are not false positives at all (#517).

**We report them, at their normal severity.** We do not silently exclude
`examples/`, `demo/` or `fixtures/` paths, and we do not lower severity to
`warn` to make the number smaller. The consumer knows their repo; we do not.
Someone who genuinely does not want Helmet in a demo directory disables the
rule *there, explicitly* — an ESLint override or a disable comment — and that
decision is visible in their config, where it belongs.

Two things follow, and both are the point:

- A path exclusion we ship is a decision made silently on behalf of every
  consumer, including the ones whose `examples/` directory is production code.
- Driving these findings to zero would mean deleting real detections. "0
  findings" is not the goal and has repeatedly been misread as "0 false
  positives" in this campaign. It is not the same measurement.

When a rule's finding count is dominated by this class, say so in the audit
rather than tuning the rule.

---

## OWASP Coverage

This repository provides rules mapping to:

- **OWASP Top 10 2021** (Web Security)
- **OWASP Top 10 for LLM Applications 2025** (AI Security)
- **OWASP Agentic Top 10 2026** (Agentic AI Security)
- **OWASP Mobile Top 10 2024** (Mobile Security)

Each plugin's README contains an OWASP coverage matrix.
