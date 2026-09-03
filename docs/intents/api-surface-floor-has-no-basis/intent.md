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

## Why the gate cannot move yet

Two denominators are not trustworthy, and the script says so rather than
rounding it away:

- `mongodb-security` — 485, because the spec enumerates `mongodb` **and**
  `mongoose` prototypes where the declared surface is "Collection / Db / cursor
  query methods".
- `vercel-ai-security` — 107, the whole `ai` package including internals.

Setting a floor against those would be repeating the original defect with fresh
numbers, which is worse than the current state: it would look measured.

Calibration also caught a defect in the new instrument, which is the reason to
distrust it until curated. A global "capitalised means constructor" rule is
right for `Cipheriv` and exactly wrong for NestJS, whose entire surface is
capitalised decorators — it scored that plugin "0% of 7" by discarding the 99
APIs its rules exist to read.

## Control band

- **Now:** 10 published figures, 0 derived from a surface; 2 measured
  denominators known wrong.
- **Wanted:** every figure computed; the floor expressed against the measured
  basis; `outOfScope` naming actual APIs rather than carrying a count.
- **Breach:** a hand-edited coverage percentage, or a floor raised without the
  denominator that justifies it.

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
