# Intent — 46 rules fire on nothing, and we have never said which

> Stage 1 artifact. Opened once an attributed inventory made the claim
> falsifiable for the first time.

**Status:** draft · **Opened:** 2026-09-03 · **Owner:** @ofri-peretz

---

## What is wanted

The rules that fire on no real code are named, in one place, each with the
reason it fires on none. A reader can tell "we looked and it does not occur"
apart from "we never looked".

## Why now

Against 113 repositories and 347,301 files, **46** of the 145 unmeasured rules
produce no finding anywhere. That number is now trustworthy — the inventory
carries a `configHash` and a `reposHash` that match disk, which the previous
one did not.

Nothing in the repository says which 46, or why. They are spread across
seventeen plugins:

```
lambda-security 6   import-next 5   pg 5   express-security 4
react-a11y 4        vercel-ai-security 4   mongodb-security 3
sequelize-security 3   … and nine more with 1–2 each
```

There are at least four different reasons hiding in one number, and they call
for opposite responses:

1. **The SDK is absent from the sample.** No repository in the corpus uses
   Drizzle or the Gemini SDK, so `drizzle-security/no-mass-assignment` cannot
   fire. Nothing is wrong with the rule.
2. **The shape is genuinely rare.** `express-security/no-graphql-introspection-production`
   describes real misuse that this sample happens not to contain.
3. **The rule is opt-in policy**, not defect detection —
   `import-next/enforce-dependency-direction` fires only under project-specific
   configuration and correctly reports nothing by default.
4. **The rule is broken.** Indistinguishable from the other three today, and
   this is the case the whole exercise exists to surface.

Publishing "46 rules catch nothing" without that split would repeat the
inventory's own mistake at one remove: a true number that reads as a product
finding when it is four different statements.

## One correction to the premise

An earlier draft of this file said the inventory was "awaiting merge" in
PR #835. It is merged — `dbd36b8ed` on `main` — so the figures here are read
from the committed artefact rather than a branch, and `check:audit-freshness`
can attribute them.

## Constraints

- **Reason per rule, not per plugin.** A plugin-level excuse hides case 4,
  which is the only one that matters.
- **No rule may be marked "rare" without evidence** — a CVE, an advisory, or a
  public repository outside the sample. An unevidenced "rare" is a guess with
  a confident label.
- **The sample is 113 repositories**, chosen before several plugins existed.
  "Fires nowhere in this sample" is not "fires nowhere", and the wording must
  keep the distinction.
- **Absence is a claim with a shelf life.** Any classification records the
  `configHash` it was made under, so it expires when the instrument changes.

## Success criteria

- **Now:** 46 rules unnamed · 0 reasons recorded · 4 causes conflated.
- **Wanted:** every one named with a category and its evidence, in an artefact
  that carries the inventory hashes it was derived from.
- **Breach:** a rule classified "rare" with no citation, or a classification
  outliving the `configHash` it was made under.
- **Proven by:** an artefact listing 46 rules, 46 reasons, and the two hashes —
  and at least one rule moved into category 4 and fixed, since a taxonomy that
  finds nothing broken has not been tested.
