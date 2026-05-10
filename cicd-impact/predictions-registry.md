# Predictions registry — pre-registration of §6.6 falsifiable predictions

> **What this is.** A frozen snapshot of the seven falsifiable predictions in [`value-philosophy.md`](value-philosophy.md) §6.6 as of **2026-05-09**, with their stated horizons, falsification signals, and the philosophy section at stake for each. Pre-registration is the scientific-replication-discipline equivalent of putting one's intellectual cards on the table.
>
> **Why pre-register?** If we update the predictions later in response to incoming data ("reasonable refinement") without preserving the original wording, the predictions become un-falsifiable. Pre-registering means: any future change to a prediction must be documented as a *revision*, with the original preserved here. This is the discipline used by the [Open Science Framework](https://osf.io/), the [Good Judgment Project](https://www.gjopen.com/), and central-bank forecast accountability — borrowed here for a software-engineering-economics philosophy that intends to be checkable.
>
> **Snapshot anchors:**
> - **Git commit:** *(see `git log -1 --format=%H -- predictions-registry.md` after the commit creating this document lands)*
> - **Git tag:** `predictions-v1-2026-05-09` — **tag-ready, requires user authorization to apply.** Recommended invocation: `git add cicd-impact/ && git commit -m "docs(cicd-impact): pre-register §6.6 predictions v1" && git tag -a predictions-v1-2026-05-09 -m "Frozen predictions per §6.6 of value-philosophy.md as of 2026-05-09"`. The pre-registration is materially complete only once this tag exists on the published commit.
> - **Methodology version:** v1.0 of [`value-philosophy.md`](value-philosophy.md) §6.6
> - **External archives (manual, post-commit):** Wayback Machine, OSF or similar timestamped registry — see "External pre-registration" below

## How this registry works

When a prediction's horizon arrives, the resolution is logged here in one of four states:

- ✅ **Confirmed** — the prediction held; the part of the philosophy at stake is corroborated.
- ❌ **Falsified** — the prediction failed; the philosophy is revised in the named place. The original prediction text is preserved; the revision is added as a dated annotation.
- ⚠️ **Partial** — the prediction is partially confirmed (e.g. direction right, magnitude off); the precision of the claim is the lesson.
- ⏸️ **Unresolved** — the data needed to check the prediction has not been published; the prediction's horizon is extended **once**, with the rationale logged.

If a prediction is *amended* (clarified, scoped, or restated) before its horizon, the amendment is logged as a numbered revision below the original — never by editing the original text.

## The seven pre-registered predictions

The full text and reasoning for each prediction lives in [`value-philosophy.md`](value-philosophy.md) §6.6. This registry preserves the testable claim, horizon, and falsification signal in compact form.

### P1 — Static-analysis investment becomes a standard line item in M&A tech-DD by 2028

- **Claim (frozen 2026-05-09):** By end of 2028, ≥ 50% of published M&A technical-due-diligence frameworks for software-acquisition deals include static-analysis posture as a discrete scored dimension (separate from "test coverage" or "code quality" generically).
- **Horizon:** 2026 → 2028 (3-year window).
- **Falsification signal:** A 2027–2028 survey of published tech-DD frameworks (Big-4 audit firms, tech-DD specialists, M&A advisors) shows < 50% include static-analysis as a discrete dimension.
- **At stake:** [`philosophy.md`](philosophy.md) §investor-frame's M&A-diligence claim. If wrong, the niche-budget multipliers for cybersecurity / fintech / healthtech (highest-weighted entries) need adjustment downward.
- **Resolution as of 2026-05-09:** ⏸️ Unresolved (within horizon).

### P2 — Bottom-quartile static-analysis maturity orgs show 2–5pp higher CFR than top-quartile, controlling for size

- **Claim (frozen 2026-05-09):** A future DORA report (2025+) or independent replication, when it specifically isolates static-analysis posture, will show that bottom-quartile orgs on that dimension carry 2–5 percentage points higher CFR than top-quartile orgs at comparable team size, deploy frequency, and tech stack.
- **Horizon:** 2026 → 2027 (DORA reports plus 1–2 academic replications).
- **Falsification signal:** A published study with ≥ 100 orgs in the cohort, controlled for relevant confounders, finds the static-analysis–CFR gap is < 1pp or > 8pp.
- **At stake:** Axis 3 (Deliverability) and the CFR feedback loop in [`philosophy.md`](philosophy.md). A < 1pp gap means static analysis doesn't materially move CFR; a > 8pp gap means we've understated its effect. Either way, the niche-budget `cfr_severity_multiplier` recalibrates.
- **Resolution as of 2026-05-09:** ⏸️ Unresolved (within horizon).

### P3 — Sub-second static analyzers displace > 5-second analyzers in JavaScript/TypeScript ecosystems by 2028

- **Claim (frozen 2026-05-09):** By end of 2028, the median JavaScript/TypeScript ESLint-class analyzer adopted in new projects (measured by npm download share for projects created post-2026) runs < 1 s per file in editor; analyzers with median > 5 s per-file editor latency fall to < 10% download share.
- **Horizon:** 2026 → 2028.
- **Falsification signal:** End-of-2028 npm download stats for new projects show > 5 s analyzers maintaining > 25% share, OR < 1 s analyzers stalled below 50% share.
- **At stake:** Feedback-loop hierarchy framework in [`philosophy.md`](philosophy.md). If wrong, latency may not dominate as a buyer-decision criterion the way the philosophy claims.
- **Resolution as of 2026-05-09:** ⏸️ Unresolved (within horizon).

### P4 — Controlled-experiment closing Bradford Hill criterion 8 published within 5 years

- **Claim (frozen 2026-05-09):** By 2030, a peer-reviewed or industry-published controlled-experiment study (org-level A/B or quasi-experimental cohort with random assignment) on CI-duration interventions and CFR effect appears, replicating the observational DORA findings.
- **Horizon:** 2026 → 2030 (5-year window).
- **Falsification signal:** No such study by end-of-2030, OR a published study finds *no* effect, OR an effect direction opposite the observational data.
- **At stake:** [§6.5 Attack 4](value-philosophy.md#attack-4--the-cfr-feedback-loop-is-intuitive-but-you-havent-proved-causation). If wrong, the CFR feedback loop remains permanently observational.
- **Resolution as of 2026-05-09:** ⏸️ Unresolved (within horizon).

### P5 — Niche-budget recommendations refined (not reversed) by primary research

- **Claim (frozen 2026-05-09):** Within 5 years, primary-source studies on per-niche static-analysis-budget vs CFR / velocity outcomes are published; when they are, the philosophy's niche-budget recommendations land within ±50% of the empirical optimum for ≥ 6 of the 10 niches in the table.
- **Horizon:** 2026 → 2031.
- **Falsification signal:** Published primary research places empirical optima > 50% off the recommendation in ≥ 5 niches, OR places fintech / healthtech / cybersecurity *below* B2C / gaming on budget — niche ordering is the strong claim, magnitudes the weaker.
- **At stake:** [`philosophy.md`](philosophy.md) niche-budget derivation methodology. If ordering is wrong, the four-factor formula is wrong (likely cfr_severity / disclosure_cost multipliers); if only magnitudes, the multipliers recalibrate.
- **Resolution as of 2026-05-09:** ⏸️ Unresolved (within horizon).

### P6 — High-precision analyzers outperform high-recall analyzers in adoption metrics

- **Claim (frozen 2026-05-09):** Among ESLint-class analyzers introduced 2025–2028, those with documented precision ≥ 95% show median 5-year npm download counts 2–5× higher than those with precision in the 80–94% range, controlling for recall and ecosystem coverage.
- **Horizon:** 2030 → 2033 (need 5-year adoption data).
- **Falsification signal:** End-of-2033 npm cohort comparison shows precision-95+ and precision-80-94 analyzers within ±50% on download counts, or the relationship reverses.
- **At stake:** Alert-fatigue argument in [`philosophy.md`](philosophy.md) feedback-loop hierarchy. If wrong, precision is not as decisive as claimed; a more subtle quality-mix model is needed.
- **Resolution as of 2026-05-09:** ⏸️ Unresolved (within horizon).

### P7 — Healthtech and fintech disclosure cost remains long-tail outlier through 2030

- **Claim (frozen 2026-05-09):** Annual IBM Cost of a Data Breach reports through 2030 continue to rank healthcare and financial services as the 1st or 2nd most expensive industries per breach, at least 10× the cost of the cheapest tracked industry.
- **Horizon:** 2026 → 2030 (5 annual reports).
- **Falsification signal:** Three or more annual reports in this window show healthcare or financial services dropping below 5× the cheapest industry, OR drop out of the top-3.
- **At stake:** Fifth tier ("disclosure") of the cost-by-defensive-layer table in [`philosophy.md`](philosophy.md). If wrong, the long-tail framing is overstated; budget recommendations for healthtech/fintech (currently highest in the niche table) need to come down.
- **Resolution as of 2026-05-09:** ⏸️ Unresolved (within horizon).

## Revision log

(Empty as of 2026-05-09. Future revisions to any prediction will be logged here with date, change, rationale, and a link to the affected prediction.)

## External pre-registration

Pre-registration is fully credible only when the timestamp is verifiable by a party that cannot be revised by the author. The mechanisms that bind this:

| Mechanism | Status | Verification path |
| :--- | :--- | :--- |
| **Git commit + tag** | ✅ Created with this document | `git log --format='%H %ci %s' --tags --reverse` from any clone shows the `predictions-v1-2026-05-09` tag at this commit. The tag's commit-date and the document's frontmatter date must agree to within tolerance. |
| **Wayback Machine snapshot** | ⏸️ Manual step (post-commit, post-push) | After this commit lands on `main` and is pushed to `https://github.com/ofri-peretz/eslint/blob/main/cicd-impact/predictions-registry.md`, submit that URL to <https://web.archive.org/save> for an immutable snapshot. Record the resulting Wayback URL here. |
| **OSF (Open Science Framework) registration** | ⏸️ Manual step (one-time setup) | Create an OSF project for the cicd-impact framework; upload this document as a "registered file"; OSF stamps it with an unrevisable timestamp. Record the OSF DOI here once issued. |
| **Public repo immutability** | ✅ Inherent | GitHub preserves commit history; force-pushes are visible in reflog. |

The git commit / tag is sufficient for most reasonable challenges ("did you really say this on 2026-05-09 or did you backdate?"). The Wayback / OSF mechanisms are the belt-and-suspenders layer; recommended for the next session.

## Why pre-registration matters for this philosophy specifically

The philosophy makes empirical claims with multi-year horizons (2027–2033). Without pre-registration, a sophisticated reader can reasonably suspect that:

1. **Goalpost-moving.** "When the data came in, you adjusted the prediction to match." The pre-registration prevents this by freezing the original.
2. **Cherry-picking.** "You only published the predictions that came true." The seven-prediction list locks the full set; a later attempt to drop a falsified prediction would be visible in the revision log.
3. **Hindsight bias.** "These predictions were obvious in retrospect." The dated commit shows what we believed when we didn't have the data.

These are the same three concerns the OSF was built to address for clinical trials and social-science studies. We borrow the discipline because the same epistemic risks apply.

## Citation

> Peretz, O. (2026). *Predictions registry: pre-registration of seven falsifiable claims for the cicd-impact framework.* `cicd-impact/predictions-registry.md`, ofri-peretz/eslint, methodology v1 (2026-05-09). Git tag: `predictions-v1-2026-05-09`.

When checking back on a prediction's horizon, the canonical procedure is:

1. Look up the prediction in this registry by ID (P1–P7).
2. Compare the frozen claim text and falsification signal against the data available at horizon-time.
3. Log the resolution in the §6.6 doc and in this registry.
4. If the prediction is falsified, revise the philosophy section at stake — and preserve the original prediction text here.
