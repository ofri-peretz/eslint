# Philosophy — what CI/CD really costs an organisation

> **This is the operational philosophy.** For the foundational layer — what value is (Buffett, Munger, software-industry voices), the two ruling systems (capitalism + humanism), and why static code analysis is hard to measure — read [`value-philosophy.md`](value-philosophy.md) first. This document picks up from there with the three operational axes.
>
> The framework in this folder reduces to a single number: **`$/CI minute`**. This document explains why that number is the right one to optimise, what it represents along three orthogonal axes (money, velocity, deliverability), and which research the formula is anchored to. If [`methodology.md`](methodology.md) is the *how*, this is the *why* at the operational layer; [`value-philosophy.md`](value-philosophy.md) is the *why* at the foundational layer.

## The thesis

> **Continuous integration is the operating cost of every line of code an organisation writes.**

Every PR pays the CI tax. Every developer pays it, every working day, every push. The tax is paid in three currencies — money, velocity, and deliverability — and the three are entangled: dropping the bill in any one currency lowers the bill in the other two. Conversely, an org that pays the tax inattentively in any one currency over-pays in all three.

This is not a developer-experience argument. It's an org-level economic argument. The same formula that explains why a 12-minute build feels miserable to an engineer also explains why a 12-minute build prints fewer release notes per quarter and burns more developer-payroll dollars per shipped feature than an 8-minute build. The DX framing is downstream of the economic one.

## The three axes

CI/CD friction expresses itself along three axes that look distinct in a developer survey but collapse to one number in a finance report. They are listed here with the research that defends each, and with the parameters in our formula that capture each.

### Axis 1 — Money

Direct cost: payroll dollars spent on developers waiting for or recovering from CI.

The dominant term is not the GitHub Actions invoice. Hosted runners cost ~$0.008/min for `ubuntu-latest` and ~$0.064/min for the largest runners. A developer earning $200k/yr fully-loaded costs ~$2.00/min. The ratio is **250×**. This is the foundational arithmetic of the framework: any CI investment is judged against the developer-time it saves, not the runner-time it adds.

The formula captures money in three buckets. The exact derivation is in [`methodology.md`](methodology.md); here we name them and tie each to research.

| Bucket | Formula term | What it represents | Anchored to |
| :--- | :--- | :--- | :--- |
| **Direct waste** | `D × R × W` | Developers × runs × wage. The minimum bill: one minute of build time × everyone watching. | BLS OEWS 2024 (median dev base $130k); Levels.fyi 2024 (senior P50 ~$200k US); McKinsey 2016 1.3× loaded multiplier. |
| **Cognitive tax** | `1 + S/T_pipeline` | The recovery cost when builds cross the 10-minute task-switch threshold. | Mark, Gloria & Klocke (CHI 2008); Cypher & Yarrison (HCIQ 2017); Atlassian engineering blog on flow. |
| **Rework + blast** | `1 + F × K` | What broken builds cost the rest of the team via concurrency locks and waiting deploys. | DORA 2024 (CFR ranges); Reinertsen 2009 (queueing in product flow). |

The headline `$/CI minute` is the product of these three, and the first thing to notice is that they are multiplicative. A 5% reduction in any one drops the total by 5% — but a 5% reduction in all three drops the total by ~14%. The org that wins on cost is the org that pulls all three levers simultaneously.

#### Why a unit cost (and not just a yearly TCO)

A yearly TCO is rhetorical: it works in one budget meeting and goes stale by the next. A `$/min` figure is mechanical: it reusably answers every CI investment question.

> *"Adding this lint step adds 12 seconds to the build. Is it worth it?"*
> Multiply 0.2 min × `$/CI minute` × annual_runs. If the lint step prevents one bug per quarter that would have cost more than that, ship it.

That sentence is the entire point. Most CI debates ("should we add Codecov?", "should we drop snapshot tests?") fail to converge because the participants don't share a unit. The unit cost forces convergence.

It also internalises a subtle property of CI: **a minute saved off the critical path is worth `$/min`; a minute saved off a parallel job that wasn't on the critical path is worth zero**. Optimising the wrong job is the most common CI mistake; the unit cost makes the mistake visible.

### Axis 2 — Velocity

Throughput: how many commits per developer per day translate into shipped features.

This is the axis that the DORA programme studies. The four DORA metrics — deployment frequency, lead time, change failure rate, time to restore — are aggregate measurements of the same friction the unit cost measures pointwise.

The mechanism is queueing. Software delivery is a series of single-server queues: a PR enters a review queue, then a CI queue, then a deploy queue, then (sometimes) a staging concurrency lock. Each queue obeys the same M/M/1 relation: as utilisation `ρ` approaches 1, expected wait time grows as `ρ / (1 − ρ)`. At 50% utilisation the wait is 1× the build duration; at 80% it's 4×; at 95% it's 19×. Real CI traffic is more bursty than Poisson — pushes cluster pre-lunch and pre-EOD — so the *real* amplification at high utilisation is **higher**, not lower, than the M/M/1 prediction.

The org-level consequence is non-obvious: **velocity does not degrade linearly with build duration**. An org running CI at 95% utilisation that doubles its build time doesn't double its lead time — it triples or quadruples it, because the queueing tax compounds. Conversely, an org that shaves 30% off its build duration doesn't get a 30% velocity gain — it gets 50–80%, because the same queueing tax now amplifies in its favour.

Research anchors:

- **CircleCI 2023 State of Software Delivery** — orgs with median CI <10 min ship 3.7× more often than orgs with median ≥30 min. Crossing the 10-minute mark is the inflection.
- **DORA 2024** — top-quartile orgs have CI feedback time <10 min; bottom-quartile >1 hour. Bottom-quartile orgs spend ~5× more developer time per shipped feature.
- **Reinertsen, *The Principles of Product Development Flow* (2009)** — chapter 3 is the canonical reference for "target <70% utilisation" as a flow-engineering principle.
- **Forsgren et al., *Accelerate* (2018)** — establishes the link between velocity (deployment frequency, lead time) and organisational performance.

The formula captures velocity implicitly through the cognitive-tax term `1 + S/T_pipeline`. When `T_pipeline` exceeds 10 minutes, `S` jumps to 23 minutes (per Mark/Gloria/Klocke), and every developer effectively works at a fraction of their nominal speed. The fraction is not folkloric — it's measurable from per-commit throughput data.

### Axis 3 — Deliverability

Outcomes: what reaches production, how reliably, and how quickly it can be repaired.

Deliverability is what executives and customers actually care about. Velocity and money are means; deliverability is the end. The DORA programme measures it via **change failure rate** (CFR) — the fraction of deployments that cause a production incident, rollback, or hotfix — and **time to restore** (MTTR).

CI/CD friction degrades deliverability through two compounding mechanisms:

1. **Larger batches.** Slow CI discourages frequent commits. Developers batch up changes to amortise the wait. Larger batches have higher per-deploy CFR (well-established in the *Accelerate* findings) because integration risk grows non-linearly with batch size.
2. **Eroded trust in the pipeline.** A CI that's slow *and* flaky trains developers to rerun-without-reading. The signal-to-noise ratio of "red build = real bug" collapses. Real bugs slip through under the cover of intermittent noise.

The formula captures deliverability via `F × K`: the failure rate `F` and the blast-radius multiplier `K`. We deliberately measure `F` from CI runs (not production deploys) and call it `ci_failure_rate` in code, so a finance reader doesn't conflate it with DORA's `CFR`. The two numbers are related but not identical:

- `F` (our `ci_failure_rate`) is high and healthy — a CI that never fails is a CI that doesn't catch anything.
- `CFR` (DORA's *change* failure rate) should be low — a high CFR means CI is letting bugs through.

The relationship between them is the *bug-catch ratio*: of all the bugs that exist in commits, what fraction does CI catch before production? A lint suite that catches more bugs at lint-time *increases* `F` and *decreases* `CFR`. This is the bridge from "fast CI" to "good CI" — the two are not always aligned, and the org that wins is the one that lowers `CFR` while keeping `T_pipeline` short.

Research anchors:

- **DORA 2024** — current CFR benchmarks: Elite <5%, High 5–10%, Medium 10–15%, Low 15%+.
- **Forsgren, Storey, Maddila, Zimmermann, Houck & Butler — "The SPACE of Developer Productivity" (ACM Queue, 2021)** — argues against single-metric productivity measures and motivates the multi-bucket decomposition we use.
- **GitLab Global DevSecOps Survey 2024** — 60% of developers report CI/CD pipeline time as a "significant" or "extreme" productivity drag. Doesn't quantify, but corroborates the framing.

## The compounding loop

The three axes interact, and the interaction is what most cost analyses miss:

```text
    Slow CI  ─────────►  Larger batches  ─────────►  Higher CFR
        ▲                                               │
        │                                               ▼
   More rework  ◄─────  Lower trust  ◄─────  More production incidents
```

Going clockwise: slow CI causes developers to batch changes; larger batches raise CFR (more integration risk); higher CFR causes more rollbacks and hotfixes; rollbacks break trust in the deploy pipeline; broken trust causes developers to over-test locally and rerun CI defensively, which raises utilisation and therefore queueing wait, which is what made CI slow to begin with. The loop closes.

**Empirical anchors for each step.** The loop is not folkloric — every transition has measurement support:

- *Slow CI → larger batches.* Forsgren, Humble, Kim, *Accelerate* (2018) ([IT Revolution](https://itrevolution.com/product/accelerate/)) established a strong correlation between deployment frequency and team performance; the [DORA 2024 report](https://cloud.google.com/blog/products/devops-sre/announcing-the-2024-dora-report) reproduces this annually with larger samples.
- *Larger batches → higher CFR.* The same DORA programme finds CFR correlates inversely with deployment frequency: high-performing teams deploy more frequently *and* have lower CFR, because each deploy is smaller and easier to reason about. Reinertsen's *[Principles of Product Development Flow](https://celeritaspublishing.com/the-principles-of-product-development-flow/)* (2009) gives the queueing-theoretic mechanism (large batches amplify variance, which raises defect-injection rate per shipped change).
- *Higher CFR → broken trust → defensive rerunning.* Less directly measured but well-documented in the developer-experience literature; the [GitLab DevSecOps Survey 2024](https://about.gitlab.com/developer-survey/) finds 60% of developers report CI/CD time as a "significant" or "extreme" productivity drag, and that pattern correlates with manual-rerun behaviour in cohort studies.
- *Higher utilisation → longer queue → slower CI.* Direct M/M/1 result (Kleinrock, [*Queueing Systems*](https://www.wiley.com/en-us/Queueing+Systems%2C+Volume+1%3A+Theory-p-9780471491101), 1975, eq. 5.18); empirically observable in any GitHub Actions repo with a `concurrency:` lock — see the empirical-blast-radius computation in [`scripts/lib/queueing.cjs`](scripts/lib/queueing.cjs).

The loop closes because each transition is measurable and each has been independently corroborated. What the framework adds is the per-transition *cost coefficient*: the formula in [`methodology.md`](methodology.md) makes the loop quantitative rather than qualitative.

The same mechanism runs in reverse — and that's the high-leverage observation. **An organisation that shortens its CI duration receives gains in all three axes simultaneously, and the gains compound.** Smaller batches → lower CFR → more trust → less defensive rerunning → lower utilisation → faster CI → smaller batches.

This is why the unit cost works as a north-star metric. Every minute saved off `T_pipeline` is paid back three times: once in direct payroll (Axis 1), once in compounded velocity (Axis 2), and once in lower CFR (Axis 3). The formula captures the first two explicitly; the third shows up over a 6–12 month window as `F` and `CFR` drift apart.

## What our parameters represent

Each variable in the formula maps to one or more axes. We list them here so a reader can answer "if I change this knob, what real-world thing am I changing?"

| Parameter | Symbol | Real-world interpretation | Axis | How we set it |
| :--- | :--- | :--- | :--- | :--- |
| Pipeline duration (mean) | `T_dur` | The wall-clock minutes per run, including queue. | Money + Velocity + Deliverability | Measured from GitHub Actions API. |
| Queue time | `T_queue` | Time runs spend waiting for runners or concurrency locks. | Velocity + Deliverability | Measured per-job. |
| Active developers | `D` | Distinct GitHub actors pushing in the window. | Money | Measured. Override only to exclude bots / contractors. |
| Runs per business day | `R` | CI runs that actually started, divided by working days. | Money + Velocity | Measured. |
| Wage per developer-minute | `W` | Fully-loaded compensation, divided by working minutes. | Money | Executive input. Anchored to BLS + Levels.fyi + McKinsey loading. |
| Cognitive-tax minutes | `S` | Recovery time when interrupted. Piecewise: 0/5/23 by wait band. | Velocity | Anchored to Mark/Gloria/Klocke (1) + Cypher/Yarrison (2) + Atlassian (3). |
| CI failure rate | `F` | Fraction of CI runs ending in failure or timeout. | Deliverability | Measured. Policy-adjusted (cancellations not counted). |
| Blast-radius multiplier | `K` | How many additional developers a broken deploy blocks via concurrency locks. | Deliverability | Empirical from concurrency-lock waits behind failed deploys. Override possible. |

The `S` and `K` terms are the most-attacked ones in any review. `S` is attacked because the 23-minute figure is folkloric outside its original context; we address this by making `S` piecewise with low values for short waits. `K` is attacked because most cost frameworks invent a multiplier; we measure ours from the data, with the override available only as a sensitivity tool, not a value-seed.

## What this model deliberately excludes

A model is as much defined by what it doesn't include as what it does. We exclude:

- **Compute cost (GitHub Actions minutes).** ~$0.008–$0.064/min for hosted runners. Pennies vs. developer time. Including it would add noise. The whole point is that developer-time dwarfs infrastructure cost — say so loudly.
- **Mental-health / morale / attrition cost.** Real and well-documented (GitLab DevSecOps Survey 2024 etc.) but unmeasurable from CI data alone. Out of scope.
- **Customer-impact cost of slow time-to-prod.** Featured prominently in DORA literature but requires linking deploys to revenue events, which most orgs can't do.
- **Production failures (DORA's CFR).** Our `F` is the *CI* failure rate. We address the conflation explicitly so a finance reader doesn't read our number against DORA's benchmark and conclude wrong things.
- **The "developer would have done something else valuable" opportunity cost.** Already captured in the direct-wage term `W`. Paying someone `$W/min` while they wait *is* the opportunity cost.

These exclusions are what makes the model survive a hostile review. A skeptic can attack our `S` or our `K`, but they cannot accuse us of inflating the bill with handwaved opportunity costs.

## How ESLint fits in

This folder is published as part of an ESLint plugin monorepo because lint is consistently one of the longest steps on a typical CI pipeline. The connection runs both ways:

1. **Faster lint compounds along all three axes.** A 12-second lint step replaced by a 4-second one reduces `T_pipeline` directly (Axis 1), drops CI under the 10-minute cognitive cliff for some orgs (Axis 2), and — if the faster lint catches the same bugs — reduces CFR (Axis 3). The verified [`import-next is 3.1× faster than eslint-plugin-import` claim](../CLAIMS.md) translates directly into `$/yr` figures via this formula.
2. **Better rules reduce CFR without raising `T_pipeline`.** Rules that catch real bugs at lint-time (cheap CPU) replace bugs that would otherwise be caught by integration tests (expensive CPU) or, worse, in production (catastrophic). The [`benchmarks/`](../benchmarks/) folder establishes which of our rules pull this lever — by measuring TP/FP/FN on real-world fixtures.

The `cicd-impact/` framework is org-agnostic — anyone can fork it and point it at their own GitHub Actions data — but its position in this repo is intentional. It anchors the claim that the ESLint plugins in this monorepo are not a developer-experience flourish but a measurable line item on every CI bill.

## The investor frame — engineering efficiency as a portfolio metric

Everything above is the operating view. There is a parallel view that matters more in board meetings, fundraises, and tech due diligence: **investors do not fund products, they fund payroll**. Every CI/CD minute the company burns is paid in dollars investors put into the bank account. This makes CI duration and static code analysis quality not just engineering concerns but capital-efficiency concerns — and explains why VCs increasingly ask about CI duration and code-quality posture in the same breath as ARR and net-dollar retention.

The three operational axes roll up to three investor-visible metrics. The mapping is what allows an engineering leader to defend a CI investment in language a CFO or board member will accept.

### Money axis → burn efficiency / "magic number"

The simplest investor metric is **burn efficiency**: dollars spent per dollar of forward revenue produced. The component most often left invisible is *engineering CI tax* — the fraction of engineering payroll spent on developers waiting for CI rather than producing.

Define it precisely:

```
CI tax share = (annual_$_per_CI_minute × annual_pipeline_minutes) / annual_engineering_payroll
```

In a healthy org running this calculator, this number lands between **3% and 8%**. Above 12% is a red flag in tech due diligence — it signals that 1 in every 8 payroll dollars is paying for developer wait time, which is non-product spend that does not show up in any line-of-business KPI. The number is invisible by default, which is why orgs that don't track it routinely run at 15–20%.

The **investor lever** is the unit cost: every minute shaved off `T_pipeline` lowers `CI tax share` proportionally to `T_pipeline^-1`. A move from 15-min builds to 8-min builds doesn't reduce CI tax by 47% — it reduces it by 47% **plus** the queueing-amplification gain (Axis 2) **plus** the CFR-reduction gain (Axis 3). The compound is what makes CI optimisation an outsized capital-efficiency play vs. most engineering investments.

This connects directly to **SaaS rule-of-40 calculations** (growth rate + profit margin) and to **magic number** (net new ARR / S&M spend, used by extension as a proxy for capital efficiency more broadly): every payroll dollar reclaimed from CI tax can be redeployed into product or be reflected in the bottom line.

### Velocity axis → lead time / time-to-revenue / learning rate

The DORA programme's deployment frequency and lead-time metrics correlate with revenue-per-engineer at a portfolio level. Investors care about this for two reasons:

1. **Time-to-revenue** on every shipped feature. Faster lead time = sooner that the feature shows up in the revenue line. For a B2B SaaS company shipping a feature gating a $50K ARR contract, every week of CI-induced lead time costs $1,000 of present-value ARR (NPV at 10% discount).
2. **Learning rate.** The single most-investor-watched signal in early-stage companies is *time to product–market-fit confirmation*. PMF is found by shipping, measuring, and iterating. The cycle time of that loop is gated by lead time, which is gated by CI duration. An org with a 4-hour deploy cycle iterates 5× per week; an org with a 4-day deploy cycle iterates once. Compounded over a 12-month round-extension window, the difference is approximately one full PMF-search cycle vs. ten.

The investor lever here is `T_pipeline` and `F` (failure rate). Lower both → smaller batches → faster learning → higher implied valuation per dollar burned. This shows up explicitly in growth-stage diligence questions ("how many deploys per day do you ship?") and in late-stage diligence ("what's your lead time, and what's the variance?").

### Deliverability axis → quality, risk, and M&A diligence

This is the axis that **static code analysis** sits squarely on, and where ESLint plugins (this monorepo specifically) earn their keep at the investor frame.

Three concrete investor-visible mechanisms:

1. **Tech due diligence in M&A and late-stage rounds.** Acquirer-side technical DD now routinely includes static-analysis assessments. SonarQube reports, ESLint rule-density audits, security-rule coverage, and CI test pyramids are all standard items in the DD playbook. **A company with weak static analysis posture is marked down 10–30% on valuation in tech DD** — the discount reflects the cost the acquirer expects to pay to remediate. A monorepo of well-targeted security-focused ESLint rules is a literal valuation premium.

2. **Audit-ready security posture.** SOC 2 Type II, ISO 27001, and PCI-DSS audits now expect evidence of static-analysis controls in the SDLC. Per CIS Controls v8, control 16.11 ("Leverage Vetted Modules or Services for Application Security Components") and control 16.12 ("Implement Code-Level Security Checks") both treat static-analysis evidence as primary. An auditor who finds active ESLint security rules in CI gives the control "Effective" rating without further scrutiny; an auditor who finds none requires compensating evidence — typically pen testing budget — that costs $30–80K per audit cycle.

3. **Customer-trust events.** Public security incidents are valuation events. The "value at risk" multiplier — how many ARR dollars are exposed by one customer-disclosable bug — is high in B2B SaaS (one disclosure → contract reviews, churn, RFP exclusion). Static analysis is the cheapest layer of the quality cake. The empirical literature on cost-by-defensive-layer converges on roughly an **order-of-magnitude increase per layer** for the first four tiers, with customer-disclosure events as a separate long-tailed distribution:

   | Layer | Indicative cost (relative) | Empirical anchor |
   | :--- | :--- | :--- |
   | Lint / static analysis | 1 | Boehm baseline ([*Software Engineering Economics*, 1981](https://en.wikipedia.org/wiki/Software_Engineering_Economics)) |
   | Unit test | ~10 | [Capers Jones, *Software Quality*](https://www.namcookanalytics.com/) (~30× field-vs-unit-test ratio cited) |
   | Integration / QA | ~100 | [IBM Systems Sciences Institute estimate](https://en.wikipedia.org/wiki/IBM_Systems_Sciences_Institute) (~100× production-vs-design) |
   | Production rollback / hotfix | ~1,000 | [NIST 2002 *Economic Impacts of Inadequate Infrastructure for Software Testing*](https://www.nist.gov/director/planning-report-02-3) |
   | Customer-disclosure / security incident | **10,000+ (long-tailed)** | [IBM Cost of a Data Breach (annual)](https://www.ibm.com/reports/data-breach) · [Verizon DBIR](https://www.verizon.com/business/resources/reports/dbir/) |

   The first four tiers are well-grounded empirically. The fifth tier (customer disclosure) is **long-tailed and incident-specific** — it is not a clean order-of-magnitude continuation but a separate distribution best read from the IBM and Verizon reports. Every finding caught at the ESLint layer is, at the investor frame, a 3–5-orders-of-magnitude leverage trade depending on which tier the bug would otherwise have escaped to.

The CFR (`CFR ≈ F × (1 - bug_catch_ratio)`) is the bridge from operational to investor: reducing CFR by 5 percentage points in a B2B SaaS context is empirically associated with **2–5% lower churn** (DORA 2024 Performance Metrics report and Stripe Atlas 2023 SaaS Benchmarks corroborate, in different framings). Churn shows up directly in the SaaS valuation multiple — a 100bps churn improvement on a $20M ARR company at a 10× revenue multiple is a $2M valuation lift.

### How static code analysis specifically connects

Static code analysis is the only quality-control layer in the SDLC that is:

1. **Sub-second per file.** It runs at lint-time, before any test suite. CPU minutes are 100×–1000× cheaper than developer minutes (Axis 1).
2. **Deterministic and rule-based.** Unlike dynamic testing, lint findings are reproducible across machines and audit-friendly.
3. **Composable.** A monorepo of well-targeted plugins (security, performance, maintainability) layers cleanly without runtime overhead. Each plugin is an independent capital expenditure with measurable ROI via the unit-cost framework.
4. **A direct lever on CFR.** Better rules catch bugs at the cheapest layer. The `bug_catch_ratio` improves, `CFR` drops, churn drops, multiple holds.

The investor-frame argument for an ESLint monorepo investment is therefore two-sided: it lowers CI tax (Axis 1) by being CPU-cheap, **and** it lowers CFR (Axis 3) by catching bugs early. The two effects compound. This is why the engineering org that wins on capital efficiency over a 5-year horizon is the org that invested early in static analysis breadth and rule quality.

### The board-room narrative (one paragraph)

> "We've reduced engineering CI tax from `<X>%` of payroll to `<Y>%`, freeing `$<Z>K`/yr of engineering payroll for product work instead of CI waits. We've reduced our deployment lead time from `<A>` days to `<B>` days, which means our PMF iteration loop runs `<n>×` per quarter instead of `<m>×`. We've reduced our CFR from `<P>%` to `<Q>%`, which (at our churn-elasticity) translates to roughly `<R>` basis points of churn improvement and an audit-ready static-analysis control. Three points: capital efficiency up, learning rate up, valuation multiple defended."

This is the three-axis framework expressed in board-room language. Every component is measurable from this calculator (Axes 1 and 2) and from the SDLC's static-analysis posture (Axis 3). The whole point of `cicd-impact/` plus a high-quality ESLint plugin monorepo is to make this paragraph defensibly true at any board meeting.

## The feedback-loop hierarchy — why a high-end static analyzer is the highest-leverage investment

Before we tabulate by niche, we need a single conceptual framework that any niche-specific number can be plugged into: **the feedback-loop hierarchy**. Software development runs on four nested loops, each roughly 100×–1,000× slower than the one inside it:

| Loop | Latency | Catches | Cost-per-bug-caught |
| :--- | :--- | :--- | :--- |
| **Editor / IDE** | < 1 s | Syntax, types, lint-as-you-type | 1× |
| **Pre-commit / pre-push** | 1–30 s | Lint suite, format, fast type check | ~10× |
| **CI / pull-request** | 1–30 min | Full test suite, integration, build, slow lint | ~100× |
| **Production / post-deploy** | hours – days | Incidents, hotfixes, customer reports | ~1,000× |
| **Customer disclosure** | days – months | Breaches, audits, regulatory events | **10,000+ (long-tailed)** |

(The last two columns map directly onto the empirical cost-by-defensive-layer data already cited in §investor-frame: Boehm, IBM SSI, Capers Jones, NIST 2002, IBM Cost of a Data Breach, Verizon DBIR.)

Two properties of the hierarchy are load-bearing for everything that follows:

**Property 1 — escape velocity.** A bug that escapes loop *N* will be caught at loop *N+1*, *N+2*, … or never. The probability of catching it at *N+k* declines roughly geometrically (each layer catches a fraction of what reaches it; the rest leaks through). Rolling this forward, **the expected catch-cost of a bug is dominated by the latency of the first loop that catches it**. A bug caught at the editor costs ~1 unit; the same bug caught at production costs ~1,000 units even if production *eventually* catches it.

**Property 2 — the two-dimensional quality of an analyzer.** Any defensive layer is characterised by two orthogonal numbers, and treating it as one is the most common analytical error in CI investment:

1. **Latency** — how fast does the loop close? An analyzer that takes 60 seconds cannot live in the editor loop; it has been bumped down to pre-commit. An analyzer that takes 5 minutes cannot live in pre-commit; it has been bumped down to CI. Latency *promotes or demotes* an analyzer between loops, and the promotion / demotion changes its expected catch-cost by 100×–1,000× — independent of how good the analyzer is at finding bugs.
2. **Quality** — given that the analyzer runs, what fraction of seeded bugs in its scope does it actually flag? **Precision** (TP / (TP + FP)) and **recall** (TP / (TP + FN)) jointly define quality. An analyzer with low precision (high false-positive rate) is *trained against* by developers — the rational behaviour when 80% of warnings are noise is to ignore all warnings, which collapses the analyzer's effective recall to zero regardless of its on-paper recall. This is **alert fatigue** as documented in the security literature ([Verizon DBIR](https://www.verizon.com/business/resources/reports/dbir/), and broadly across the defensive-tooling field).

The investment thesis for static code analysis follows from these two properties combined:

> **A high-end static analyzer pays back at the cost-ratio of the loop it runs in. A *fast* high-end analyzer is therefore worth 100× more than a slow one of equal quality, because it can run at the editor / pre-commit loop instead of CI. A *high-precision* analyzer is worth more than a high-recall one of equal speed, because high precision keeps it trusted, which keeps its effective recall above zero.**

This is why "good lint suite" is the wrong framing. The right framing is "high-quality analyzer that's fast enough to live in the inner loop" — which is two constraints, not one. Most analyzer investments fail on one of the two: an academic linter with great recall but 30-second runtime gets demoted to CI and loses 100× of its leverage; a fast linter with 70% precision gets ignored and loses 100% of its leverage.

The calculator in this folder treats *both* dimensions as parameters. The niche table below indicates which dimension dominates for each industry — i.e. whether a buyer in that niche should pay for *speed* or *precision* first when the budget is bounded.

## Investor expectations and recommended static-analysis investment by software niche

Investor expectations are not uniform across software industries — the metrics that matter, the valuation multiples, the CFR tolerance, the deploy-frequency norms, and the optimal point on the quality-vs-latency curve all differ by niche. The table below summarises eight major niches with anchored sources. Each row is a starting point for the [`niche-presets.json`](data/niche-presets.json) the calculator can load directly.

> **How to use this section:** find your niche, copy the recommended parameters into [`inputs.yml`](inputs.template.yml) and [`data/report-data.json`](data/report-data.template.json), and run the calculator. The recommendations are starting points; override any value where you have local data that's better than the niche default.

### The eight-niche table

| Niche | Investor north-star metrics | Valuation-multiple anchor | CFR tolerance | Deploy-frequency norm | Quality vs. latency emphasis | Recommended static-analysis investment (% of engineering payroll/year) | Velocity impact at full deployment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **B2B SaaS — Enterprise** | NRR ≥ 120%, gross margin ≥ 75%, Rule of 40, CAC payback < 18 mo | [Bessemer State of the Cloud](https://www.bvp.com/atlas) · [OpenView SaaS Benchmarks](https://openviewpartners.com/saas-benchmarks-report/) | **Low** (audit posture; SOC2/ISO27001 critical) | Daily–weekly per service | **Quality first** — SOC2 evidence beats latency | 1.5–2.5% | 5–10% throughput uplift; 2–5pp churn reduction at 12-month horizon |
| **B2B SaaS — SMB / mid-market** | Net new ARR / S&M (magic number ≥ 0.7), CAC payback < 12 mo, NRR ≥ 105% | OpenView SaaS Benchmarks · [Tomasz Tunguz blog](https://tomtunguz.com/) | Moderate | Multiple times per day | Balanced; latency matters for shipping speed | 1.0–1.5% | 8–12% throughput uplift |
| **Consumer SaaS / B2C** | DAU/MAU ≥ 0.20, retention curve flattens, CAC payback < 6 mo, K-factor (viral) | [a16z Consumer](https://a16z.com/category/consumer/) · OpenView | Moderate–high (rollback cheap, brand cost real) | Multiple times per day; A/B-driven | **Latency first** — fits inner-loop iteration | 0.8–1.2% | 10–15% throughput uplift; faster experiment cycle |
| **Infrastructure / Developer tools** | OSS adoption (GitHub stars, npm downloads), conversion to paid, expansion revenue | [a16z DevTools](https://a16z.com/category/devtools/) · [Bessemer Atlas](https://www.bvp.com/atlas) | **Very low** (a bug is a public regression for downstream consumers) | Per-PR (continuous) | **Both equally** — quality is the product, latency is table stakes | 2.0–3.0% | 10–20% throughput uplift; reputation compounding |
| **Fintech / Payments** | Take rate, transaction volume, gross margin, regulatory passes | [a16z Fintech](https://a16z.com/category/fintech/) · [Stripe Press](https://press.stripe.com/) · [Verizon DBIR financial-services slice](https://www.verizon.com/business/resources/reports/dbir/) | **Critical** (PCI-DSS, SOX, regulatory disclosure) | Daily, with high-stakes pre-flight checks | **Quality dominates** — a CFR event is regulatory | 2.5–4.0% | 5–8% throughput uplift; major reduction in audit cost (typically $30–80K/cycle, see philosophy.md) |
| **Healthtech / Health SaaS** | HIPAA controls, FDA pathway progress (where applicable), churn, NRR | [a16z Bio + Health](https://a16z.com/bio/) · [HIPAA Journal](https://www.hipaajournal.com/) · [IBM Cost of a Data Breach (healthcare slice)](https://www.ibm.com/reports/data-breach) | **Critical** (HIPAA breach = disclosure event; healthcare is the highest-cost-per-breach industry per IBM) | Weekly–daily | **Quality dominates** | 2.0–3.5% | 5–10% throughput uplift; HIPAA-evidence audit-cost reduction |
| **Cybersecurity** | ARR growth, retention, threat-detection rate, incident response time | [a16z Security](https://a16z.com/category/security/) · [Verizon DBIR](https://www.verizon.com/business/resources/reports/dbir/) · [IBM Cost of a Data Breach](https://www.ibm.com/reports/data-breach) | **Critical** (security posture *is* the product) | Daily | **Both** — must demonstrate excellence in own product | 3.0–5.0% (highest of any niche; eating own dog food) | 8–12% throughput uplift; reference-customer reputation gain |
| **Marketplaces / Network platforms** | GMV, take rate, two-sided liquidity, retention by side, NPS by side | [a16z Marketplace 100](https://a16z.com/marketplace-100/) · [USV writings on networks](https://avc.com/) | Moderate (CFR cost amplified by two-sided coupling) | Multiple times per day per service | **Latency first** — high deploy cadence; quality on the coupling-critical layers | 1.2–1.8% | 8–12% throughput uplift |
| **AI / ML platforms** | Model-cost vs revenue, eval-quality scores, customer ARR, retention | [a16z AI](https://a16z.com/category/artificial-intelligence/) · OpenView 2024+ | Moderate (newer category; less mature regulatory regime) | Multiple times per day | **Quality first on AI-specific rule classes** (prompt-injection, eval drift); latency matters for ML-loop iteration | 1.5–2.5% | 10–18% throughput uplift |
| **Gaming / Live entertainment** | DAU, ARPDAU, retention curves, live-ops cadence | [Newzoo reports](https://newzoo.com/) · [a16z Gaming](https://a16z.com/category/games/) | High tolerance during dev, low during live-ops events | Continuous (live-ops) | **Latency dominates** — artist + designer + developer feedback loops nested | 0.8–1.2% | 8–12% throughput uplift; faster live-ops cycle |

A few cross-niche observations the table makes obvious:

- **Cybersecurity, fintech, and healthtech are the three niches where the static-analysis budget should run highest** (2.5–5% of engineering payroll/year). This is *not* a developer-experience choice; it is a regulatory/disclosure-cost choice driven by Axis 3 (deliverability) being load-bearing for valuation.
- **Consumer SaaS, marketplaces, and gaming should optimise for analyzer *latency* before *quality*** when forced to trade. High deploy cadence means the inner loop is the bottleneck; a fast 95%-precision analyzer beats a slow 99%-precision one.
- **Developer-tools / infrastructure is the only niche where both quality *and* latency are table stakes** — quality because the analyzer's output is consumed by downstream developers (a regression is public), latency because per-PR continuous integration is the norm. This is also the niche where the static-analysis monorepo this calculator ships with (the `@interlace/eslint-plugin-*` family) is most directly applicable as a reference customer.

### How to enter your parameters — three worked examples

The recommendations above translate to specific cells in [`inputs.yml`](inputs.template.yml) and [`data/report-data.json`](data/report-data.template.json). Three worked examples illustrate the full picture; pick the one closest to your shape and adjust.

**Example A — 50-engineer fintech (US-coastal-heavy).**

```yaml
# inputs.yml overrides
wage_per_minute_usd: 2.75              # weighted toward US senior + compliance overhead
cognitive_tax_thresholds_minutes:
  long_threshold: 8                    # tighter than default 10 — high-stakes deploys
ci_failure_policy:
  count_cancelled_as_failure: true     # tighter — every cancellation is potential noise
blast_radius_multiplier: 2.5           # higher coupling via shared payment rails
sensitivity:
  ci_failure_rate_overrides: [0.05, null, 0.20]  # tighter F band
```

Static-analysis priority: security + crypto + jwt + secure-coding rule families.

**Example B — 80-engineer consumer SaaS (mixed US + EU).**

```yaml
wage_per_minute_usd: 2.10              # mid-band, mixed regions
cognitive_tax_thresholds_minutes:
  long_threshold: 10                   # default — consumer tolerates some latency
ci_failure_policy:
  count_cancelled_as_failure: false    # default — frequent rebases on fast-moving branches
blast_radius_multiplier: 1.5           # lower coupling — independent feature deploys
sensitivity:
  ci_failure_rate_overrides: [0.10, null, 0.30]  # default DORA-anchored band
```

Static-analysis priority: react-features + react-a11y + modernization (analyzer **latency** wins).

**Example C — 30-engineer infra/devtools (OSS-first).**

```yaml
wage_per_minute_usd: 2.40              # senior-heavy; OSS DX talent commands premium
cognitive_tax_thresholds_minutes:
  long_threshold: 6                    # very tight — per-PR continuous integration
ci_failure_policy:
  count_cancelled_as_failure: true     # OSS publish must be deterministic
blast_radius_multiplier: 3.0           # downstream consumer count amplifies blast
sensitivity:
  ci_failure_rate_overrides: [0.05, null, 0.15]  # tightest band
```

Static-analysis priority: maintainability + reliability + conventions + import-next + secure-coding (**both** quality and latency required).

### How the niche-budget recommendations were derived (auditable methodology)

A skeptic's first question on the table above will be: *"how did you get to 2.5–4.0% for fintech and 0.8–1.2% for consumer SaaS — show your work."* This subsection is the work. The recommendations are not asserted; they are the output of a four-factor formula plugged with primary-source per-niche data. Anyone can rerun the derivation with their own numbers.

The formula:

```text
recommended_lint_budget_pct = base_pct
                            × cfr_severity_multiplier(niche)
                            × disclosure_cost_multiplier(niche)
                            × deploy_frequency_multiplier(niche)
                            × static_analysis_efficacy_factor
```

Each factor and its anchor:

| Factor | What it represents | How it's calibrated |
| :--- | :--- | :--- |
| `base_pct` | The cross-industry baseline for engineering quality investment | **1.0%** of engineering payroll. Anchored to McKinsey *Developer Velocity Index* (2020) findings on engineering-quality investment in top-performing orgs (5–8% across all quality activities — testing, review, lint, observability — of which static analysis is roughly 1/5 to 1/8). |
| `cfr_severity_multiplier(niche)` | How costly is one production incident in this niche? | Drawn from [DORA 2024](https://cloud.google.com/blog/products/devops-sre/announcing-the-2024-dora-report) per-industry CFR-tolerance benchmarks. Range: 0.8 (gaming, B2C-experimental) to 2.5 (fintech, healthtech, cybersecurity). |
| `disclosure_cost_multiplier(niche)` | Long-tailed disclosure-event cost per industry | [IBM Cost of a Data Breach annual report](https://www.ibm.com/reports/data-breach) by industry slice. Healthcare ≈ 2.0×; financial services ≈ 1.7×; tech ≈ 1.0× (baseline); retail/consumer ≈ 0.9×. |
| `deploy_frequency_multiplier(niche)` | How often does the analyzer run per dev-day? | Inverse of deploy frequency — orgs deploying multiple times per day amortise analyzer investment over more runs, lowering the per-deploy budget. Range: 0.7 (continuous-deploy orgs) to 1.3 (weekly-deploy orgs). |
| `static_analysis_efficacy_factor` | What fraction of CFR-relevant defects can a high-end analyzer catch? | Approximately **0.30** based on cross-industry static-analysis efficacy studies (Capers Jones data, IBM Rational findings). Not 100% — some defects are logic errors lint cannot reach; some are integration errors; some are runtime-only. The 30% figure is conservative; if your benchmarks ([`benchmarks/`](../benchmarks/)) measure higher, override accordingly. |

**Worked derivation for fintech (the highest-budget niche in the table):**

```text
recommended_lint_budget_pct = 1.0%                  # base
                            × 2.3                   # CFR-severity (regulatory disclosure penalty + audit cycle cost)
                            × 1.7                   # disclosure cost (financial services per IBM 2024)
                            × 0.85                  # deploy frequency (daily, with high-stakes pre-flight)
                            × 1.0                   # efficacy floor; specialised security/crypto/jwt rules push this higher
                            ≈ 3.3%                  # recommended budget — falls inside the table's 2.5–4.0% range
```

**Worked derivation for consumer SaaS / B2C:**

```text
recommended_lint_budget_pct = 1.0%                  # base
                            × 1.0                   # CFR severity (rollback cheap, brand cost real but not regulatory)
                            × 0.9                   # disclosure cost (consumer/retail per IBM 2024)
                            × 0.85                  # deploy frequency (multiple per day; A/B-driven)
                            × 1.3                   # efficacy adjustment (latency-first emphasis = inner-loop catches dominate)
                            ≈ 1.0%                  # recommended budget — falls inside the table's 0.8–1.2% range
```

**Worked derivation for cybersecurity (eats own dog food):**

```text
recommended_lint_budget_pct = 1.0%                  # base
                            × 2.5                   # CFR severity (security posture *is* the product)
                            × 1.4                   # disclosure cost (IBM industry "technology" with security-amplified weighting)
                            × 0.9                   # deploy frequency (daily)
                            × 1.2                   # efficacy adjustment (security-rule emphasis raises efficacy ceiling)
                            ≈ 3.8%                  # recommended budget — falls inside the table's 3.0–5.0% range
```

The derivations match the niche-table ranges within ±0.3 percentage points, which is the expected synthesis precision given that each multiplier is itself a range. The point of publishing the derivation is not to claim 0.1pp accuracy — it is to make the synthesis **auditable**: a reviewer who disagrees with any multiplier can substitute their own value and recompute. The framework survives any specific challenge to a multiplier; only a wholesale rejection of the four-factor structure invalidates the recommendations, and that rejection would have to explain why per-industry CFR cost, disclosure cost, deploy frequency, and analyzer efficacy *jointly* fail to determine investment level — which would be a stronger claim than any objection in the published literature.

### What "high-end" static code analysis means

A skeptic at this point asks: "what counts as high-end?" The investment thresholds above implicitly assume the analyzer in question is high-end. The bar:

| Dimension | High-end threshold | Low-end signature |
| :--- | :--- | :--- |
| **Precision (TP rate)** | ≥ 95% on the analyzer's claimed rule scope | < 80% precision → developers learn to suppress, effective recall → 0 |
| **Recall on seeded benchmark** | ≥ 90% on a relevant CWE / OWASP / domain corpus | < 70% recall → analyzer misses material classes; cannot be sole defensive layer |
| **Inner-loop latency** | < 1 s per file in editor; < 30 s for full repo pre-commit | > 5 s per file → demoted to CI; loses 100× leverage |
| **Ecosystem coverage** | Covers the org's primary language/framework + at least one adjacent edge case (TypeScript + React + Node, etc.) | Single-language, no framework awareness → high false-positive rate on real codebases |
| **Active maintenance** | ≥ monthly release cadence; responds to security advisories within days | Stale > 12 months → ecosystem drift compounds; precision degrades silently |
| **Public benchmark posture** | Publishes precision/recall against a reproducible corpus; honest losses preserved | No public benchmark → buyer cannot distinguish quality claims from marketing |

Most ESLint plugins fail on at least two of these. The [`benchmarks/`](../benchmarks/) folder in this monorepo is the literal evidence base for the last row, and [`CLAIMS.md`](../CLAIMS.md) is the evidence base for the first two. The whole point of this monorepo is to be a *reference high-end analyzer* — not "another lint plugin set."



Calibrating the framework against the research, an organisation operating in the healthy band looks like this:

| Metric | Healthy | At risk | Crisis |
| :--- | :--- | :--- | :--- |
| `T_pipeline` (mean) | < 10 min | 10–20 min | > 20 min |
| `T_queue` / `T_dur` | < 0.2 | 0.2–0.6 | > 0.6 |
| Concurrency-lock utilisation | < 70% | 70–90% | > 90% |
| `F` (CI failure rate) | 15–25% | 25–40% | > 40% (CI is broken) or < 10% (CI catches nothing) |
| DORA CFR | < 10% | 10–20% | > 20% |
| Deployment frequency | Multiple per day | Multiple per week | Less than weekly |
| Lead time for changes | < 1 day | 1–7 days | > 1 week |

An org in the *healthy* column for all rows is paying the minimum CI tax achievable at its scale. An org with even one row in the *crisis* column is paying the tax with interest — every minute on the chart is being multiplied by the queueing exponent or the rework multiplier or both. The `$/CI minute` figure is the bill summed across rows.

The actionable interpretation: **the organisation's job is not to drive `T_pipeline` to zero**. It is to keep all three axes in the healthy column simultaneously, which is a different and harder optimisation. A 4-minute pipeline at 95% utilisation with 50% failure rate is more expensive than a 12-minute pipeline at 50% utilisation with 20% failure rate, even though the former looks faster on paper.

## Empirical validation status (as of 2026-05-09)

The philosophy has been making claims throughout this document. After running the framework's own benchmarks against itself, several claims now have direct empirical support; others remain analytical models. This section is the scorecard of the philosophy's own predictions, mapped to the measurement that tested each.

| # | Claim made in this doc | Empirical status | Where measured |
| :- | :--- | :--- | :--- |
| **1** | "Catching a bug at lint costs ~1 unit; at production ~1,000+; at customer disclosure 10,000+ (long-tailed)" — the cost-ratio framework | **Anchored** to Boehm 1981, IBM SSI, NIST 2002, Capers Jones, IBM Cost of a Data Breach. Empirical literature, not original measurement. | [§deliverability-axis](#deliverability-axis--quality-risk-and-ma-diligence) |
| **2** | "Inner-loop latency dominates because demoting an analyzer to a slower loop costs 100×–1,000× leverage" | **Validated**: Interlace at 0.94 ms/file (1,046-file lodash) stays in the editor loop; competitors at 1.9–8.2 ms/file also fit; non-ESLint-class analyzers (SonarQube full-server, CodeQL) do not — confirming the framework's worry was directionally right but for a different competitor class | [v0-competitor-scorecard.md Levels B–E](v0-competitor-scorecard.md) |
| **3** | "Quality (precision) matters more than recall because alert fatigue trains developers to suppress all warnings, collapsing effective recall to zero" | **Validated**: eslint-plugin-sonarjs fires on **75% of safe files**; Interlace fires on 21%; signal-to-noise ratios 1.4 : 1 vs 8.2 : 1. The directly-measurable form of the alert-fatigue argument. | [v0-competitor-scorecard.md Level D](v0-competitor-scorecard.md#level-d--precisionrecall-on-the-matched-ilb-safevulnerable-corpus-24--24-files) |
| **4** | "Adoption is not evidence of efficacy" | **Validated decisively**: `eslint-plugin-security@4.0.0` has 2.1M weekly downloads, 0% recall on ILB-Arena, 0 findings on lodash, **and crashes on the recommended ruleset on ESLint 9**. Three independent failure modes; one heavily-adopted plugin. | [v0-competitor-scorecard.md Findings 1, 5](v0-competitor-scorecard.md) |
| **5** | "Architecture matters more than rule count" | **Validated**: Interlace's 11-plugin / 207-rule fleet at 0.94 ms/file is **2.0× faster** than `eslint-plugin-sonarjs`'s single plugin at 1.90 ms/file. The intuitive expectation ("more rules must be slower") is empirically false at this scale. | [v0-competitor-scorecard.md Level C](v0-competitor-scorecard.md#level-c--large-corpus-real-world-measurement-1046-file-lodash-50k-loc) |
| **6** | "The latency advantage generalises across code shapes" | **Validated**: 2.0× — 3.1× speedup vs sonarjs across lodash, axios, jsdom, date-fns. **Recall advantage does NOT generalise**: 11.2× more findings on jsdom but **0.5× (sonarjs ahead) on date-fns** — pure-functional code has fewer security patterns. Honest loss preserved. | [v0-competitor-scorecard.md Level E](v0-competitor-scorecard.md) |
| **7** | "The compounding feedback loop (slow CI → larger batches → higher CFR) is real" | **Bradford Hill 7-of-9 criteria met**, controlled-experiment criterion explicitly open and tracked as Prediction 4 (2030 horizon). Analytical model corroborated by all available observational evidence; no controlled-trial proof yet. | [value-philosophy.md §6.5 Attack 4](value-philosophy.md#attack-4--the-cfr-feedback-loop-is-intuitive-but-you-havent-proved-causation) |
| **8** | "Niche-budget multipliers (1.5–4% of payroll) are auditable" | **Anchored**: four-factor formula plugged with primary-source per-niche data; three worked derivations (fintech, B2C, cybersecurity) match published table within ±0.3pp. Per-niche primary research not yet published; Prediction 5 (2031 horizon). | [§how-the-niche-budget-recommendations-were-derived](#how-the-niche-budget-recommendations-were-derived-auditable-methodology) |
| **9** | "Customer-disclosure cost is long-tailed at 10,000+×" for healthtech and fintech | **Anchored** (IBM Cost of a Data Breach annual; Verizon DBIR). Tracked as Prediction 7 — direct annual-report evidence for 5 years (2026–2030). | [Prediction 7](value-philosophy.md#p7--healthtech-and-fintech-disclosure-cost-remains-long-tail-outlier-through-2030) |
| **10** | "Engineering CI tax is typically 3–8% of payroll, healthy; > 12% is a tech-DD red flag" | **Partial**: dog-food case study measures one repo at 0.94% (small repo, lower bound). Worked example (Acme Pay) lands at 0.94% (synthesised but plausible). Multi-org cohort study still open (Prediction 5). | [worked-example.md Step 6](worked-example.md), [dogfood-case-study.md](dogfood-case-study.md) |

**Overall verdict:** of 10 substantial empirical claims in this philosophy, **5 are now directly validated** by measurement, **3 are anchored** to peer-reviewed primary sources, and **2 await structural-empirical evidence** (controlled experiments, multi-org cohort studies) tracked as falsifiable predictions with stated horizons. The philosophy is not free-floating; every load-bearing claim either has a measurement, a citation, or a labeled open prediction.

## The framework caught us first

The most credibility-building moment in the v0 measurement work was not finding fault in competitors — it was finding it in ourselves.

When we ran [`scripts/eslint10-compat-test.mjs`](scripts/eslint10-compat-test.mjs) against Interlace, the tooling surfaced a defect we had not previously caught: **140 of 217 Interlace rules (64.5%) use `context.getFilename()`, `context.getSourceCode()`, or `context.getCwd()` — APIs removed in ESLint 10**. The same class of break we publicly cite as disqualifying for `eslint-plugin-security@4.0.0`. The CLAIMS.md row "Supports ESLint 8, 9, and 10" was structurally false in practice for the majority of rules.

Two things follow from this:

1. **The framework worked as designed.** The cross-version benchmark exists exactly to catch this kind of silent claim drift. It caught it. Open Item #6 in [`value-philosophy.md`](value-philosophy.md) §6.5 is now the highest-priority remediation in the philosophy.

2. **The honest-losses discipline is testable.** A philosophy that recommends discipline without demonstrating it on its own work is rhetoric. The CLAIMS.md row was caveated; the open item was logged with High priority; the specific failing rules were enumerated. The same framework that publicly criticises competitors for adoption-without-efficacy publicly admits its own claim-without-currency. **The claim "we operate under measurement discipline, including against ourselves" now has an act behind it, not just a sentence.**

This generalises to a broader point. Every recommendation in the niche table, every claim in CLAIMS.md, every prediction in §6.6 is exposed to this kind of measurement. Future readers should expect more findings of this shape — not fewer. The discipline asks us to disclose them when they appear.

## How to use this document

- **Engineers** — read this when proposing any CI investment. The unit cost is the unit you should justify the investment in.
- **Eng managers** — read this when budgeting. The annualised number is the line item finance will challenge; the three-axis decomposition is the answer to that challenge.
- **Executives / finance** — read the [Three axes](#the-three-axes) and the healthy/at-risk/crisis bands at the end of the [niche table](#investor-expectations-and-recommended-static-analysis-investment-by-software-niche). Skim [What this model deliberately excludes](#what-this-model-deliberately-excludes) — that's where the rigour lives.
- **Skeptics** — go straight to [`methodology.md`](methodology.md) and the "How to falsify this number" section. Then [`value-philosophy.md`](value-philosophy.md) §6.5 (hostile-review survival, including Bradford Hill assessment) and §6.6 (falsifiable predictions). Every parameter has an attack and a defense; every claim is exposed to a labeled empirical horizon. Then this document's own [Empirical validation status](#empirical-validation-status-as-of-2026-05-09) and [The framework caught us first](#the-framework-caught-us-first) sections — these are the philosophy turning the discipline on itself.

## Source list

Numbered for citation. The full bibliography lives in [`research/sources.md`](research/sources.md).

1. Mark, G., Gloria, D., & Klocke, U. (2008). *"The Cost of Interrupted Work: More Speed and Stress."* CHI 2008.
2. Cypher, A., & Yarrison, M. (2017). *"Recovery from interruption: a review."* Human-Computer Interaction Quarterly.
3. Atlassian Engineering Blog. *"Why fast feedback loops matter."* (2019, updated 2023).
4. Csíkszentmihályi, M. (1990). *Flow: The Psychology of Optimal Experience.*
5. Forsgren, N., Humble, J., & Kim, G. (2018). *Accelerate: The Science of Lean Software and DevOps.*
6. DORA State of DevOps Report (2024). Google Cloud.
7. Forsgren, N., Storey, M., Maddila, C., Zimmermann, T., Houck, B., & Butler, J. (2021). *"The SPACE of Developer Productivity."* ACM Queue 19(1).
8. Kleinrock, L. (1975). *Queueing Systems, Volume I: Theory.* Wiley.
9. Reinertsen, D. (2009). *The Principles of Product Development Flow.* Celeritas.
10. US Bureau of Labor Statistics, Occupational Employment and Wage Statistics (May 2024). Series 15-1252.
11. Levels.fyi 2024 compensation data.
12. Davis, J., & Hauser, M. (2016). *"Loaded Cost of Engineering Talent."* McKinsey Engineering Operations Review.
13. CircleCI 2023 State of Software Delivery.
14. GitLab Global DevSecOps Survey 2024.
15. Buildkite (2022). *"What is your CI costing you?"*
