# Intent — the API-surface floor is set against a number nobody measured

> Stage 1 artifact of the AI-native SDLC. Opened after enumerating the surfaces
> the published coverage table claims to describe.

**Status:** draft · **Opened:** 2026-09-02 · **Owner:** @ofri-peretz

---

## What is wanted

The per-plugin API-surface coverage figure is derived from the target's actual
callable surface and from what the rules actually name. The 60% floor is set
against that basis, and no published percentage is a constant a human typed.

## Why now

`scripts/audit-api-surface.ts` says it in its own header: the manifest is
**hand-maintained**. The script checks the numbers are internally consistent and
above the floor. It never reads a rule, and it never reads an API surface.

`eslint-plugin-node-security` declares its surface as _"fs, child_process,
crypto, vm, dns, http(s)"_ and its size as **47** callable APIs. Those exact
modules export **227** callables on node@24 — **195** once constructors and
`_`-prefixed internals are removed.

| Plugin                | Claimed    | Measured (upper bound) |
| :-------------------- | :--------- | :--------------------- |
| `node-security`       | 70% of 47  | **≤55% of 199**        |
| `postgresql-security` | 100% of 14 | **≤32% of 47**         |
| `express-security`    | 64% of 22  | **≤57% of 46**         |
| `nestjs-security`     | 63% of 16  | **≤31% of 106**        |

Every claimed figure is higher than any defensible measurement of the surface it
names. The table is a public quality claim about a security product, and
"drive it to 100%" is, against that instrument, a text edit taking ninety
seconds.

`npm run measure:api-surface` (shipped in #824) produces the right-hand column.
It reports; it does not gate.

## Why the gate could not move, and what changed

Two denominators were not trustworthy, and the script said so rather than
rounding it away. **Both are now curated** (2026-09-02):

| Plugin               | Was |    Now | Because                                                                                                                                      |
| :------------------- | --: | -----: | :------------------------------------------------------------------------------------------------------------------------------------------- |
| `mongodb-security`   | 485 | **87** | enumerated `mongodb` _and_ `mongoose` whole; the declared surface is `Collection` / `Db` / cursor / client prototypes                        |
| `vercel-ai-security` | 107 |  **9** | the whole `ai` package, including 18 `experimental_` entry points and every error class; the declared surface is the generation entry points |

The AI SDK list is written out by name rather than matched by a pattern,
because the list **is** the claim: these are the APIs this plugin says it has
an opinion about, and changing it should read as a change of scope in review.

Seven of the manifest's ten plugins are now measurable. The remaining three
have no enumerable runtime surface and are the reason the gate still cannot
cover the whole table:

- `browser-security` — the web platform. `lib.dom.d.ts` is the candidate source
  and makes the platform version a pinned input.
- `react-a11y` — same, plus JSX attribute semantics.
- `secure-coding` — "generic JS": `eval`, `Function`, regex, serialization.
  Enumerable from the language, but the surface is a judgement, not a module.
- `lambda-security` — AWS SDK clients, which are not installed here.

Calibration also caught a defect in the new instrument, which is the reason to
distrust it until curated. A global "capitalised means constructor" rule is
right for `Cipheriv` and exactly wrong for NestJS, whose entire surface is
capitalised decorators — it scored that plugin "0% of 7" by discarding the 99
APIs its rules exist to read.

## Constraints

- **No floor may be set against an untrusted denominator.** Doing so repeats
  the original defect while looking measured, which is worse than the status quo.
- **The surface spec stays out of the manifest** while the manifest is the
  artefact under suspicion — a spec inside it could be edited until the
  measurement agreed with the claim.
- **An upper bound may be published as an upper bound**, never rounded into an
  exact figure. Naming an API is necessary to act on it and not sufficient.
- **Surfaces are pinned to a version.** `node@24`, and the installed version of
  each npm target; a figure without one describes nothing.

## Success criteria

- **Now:** 10 published figures, 0 derived from a surface; 2 measured
  denominators known wrong.
- **Wanted:** every figure computed; the floor expressed against the measured
  basis; `outOfScope` naming actual APIs rather than carrying a count.
- **Breach:** a hand-edited coverage percentage, or a floor raised without the
  denominator that justifies it.
- **Proven by:** editing a percentage in the manifest by hand fails the gate;
  today it passes, because internal consistency is all that is checked.

## The gap this exposes, which is the point

The measurement is not an accounting exercise. `node-security` names nowhere in
its sources: `createPrivateKey`, `createPublicKey`, `createSecretKey`,
`createECDH`, `createDiffieHellman`, `diffieHellman`, `checkPrime`.

Those are real crypto APIs in a plugin whose stated surface is crypto. Whether
they _should_ be covered is a product question — but it could not even be asked
while the denominator was 47.

## Open questions for Design

1. Does the surface spec live in the manifest, or stay in the script? It is in
   the script today on purpose: the manifest is the artefact under suspicion,
   and a spec inside it could be edited until the measurement agreed.
2. Is the upper bound enough to gate on, or does the floor need the exact figure
   — which means probing each API with a misuse snippet that cannot be generated
   mechanically?
3. `react-a11y` and `browser-security` have no enumerable runtime surface. Is
   TypeScript's `lib.dom.d.ts` the right source, and does that make the web
   platform version a pinned input?

## Deps set 2026-09-03 — 7 plugins measurable becomes 28

The surface spec is no longer hand-written. Every plugin already declares what
it targets in its own `peerDependencies`, and the measurement now derives from
that. A separate list beside those declarations was a second source of truth
that could disagree with them, and did: it covered 7 plugins of 30 while the
peer declarations cover all of them.

Twenty-two peer targets were declared but never installed, so their surfaces
could not be enumerated at all. Added as root devDependencies at the ranges the
peers already ask for: the AI SDKs, every SQL/ORM driver, the AWS and Middy
Lambda packages, and the JWT middleware.

Four remain uncounted and are named per plugin rather than folded into a
denominator: `@middy/*` and `@modelcontextprotocol/sdk` are ESM-only and cannot
be `require`d by the loader; `@prisma/client` needs generation before it
exports anything; `@nestjs/throttler` resolves but not from this entry point.

The lockfile records every platform for the native packages, so `npm ci` on
Linux resolves Linux binaries — checked, because a macOS-generated lockfile
losing Linux bindings is a known failure here.
