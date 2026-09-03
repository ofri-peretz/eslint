# Peer numbers — what other engineering orgs publish

Useful for sanity-checking the headline. None of these are *exactly* what we compute (different formulas, different denominators), but they bracket the order of magnitude.

## Public benchmarks for "$/CI minute"

- **GitHub Actions hosted-runner pricing**: ~$0.008/minute for `ubuntu-latest`, $0.064/min for the largest runners. *This is the floor*: any developer-time cost will dominate this by 100×–1000×. If our headline comes in below $1/min we know we've made an arithmetic mistake.
- **Stack Overflow 2024 Developer Survey**: median full-stack developer compensation in the US is ~$140k base. Adding the McKinsey 1.3× loaded multiplier and dividing by 120k working minutes ⇒ $1.51/min. This is the bottom of our seeded `wage_per_minute_usd` range.
- **Levels.fyi 2024 — senior + staff at mid-stage startups**: P50 total comp ≈ $300k, P75 ≈ $400k. With loaded multiplier ⇒ $3.25/min – $4.30/min. Top of our wage range.

## Published "cost of slow CI" studies

- **CircleCI 2023 State of Software Delivery**: orgs with median CI duration <10 min ship 3.7× more often than orgs with median ≥30 min. Doesn't give a $/min, but implies that crossing 10 min is the inflection point — corroborates our `long_threshold` choice.
- **Buildkite 2022 "What is your CI costing you?"**: surveyed 250 engineering orgs, found average reported "cost of slow CI per developer per year" was $32k–$48k. Our headline annual ÷ `D` should fall roughly in this band; if it's an order of magnitude off either way, something is wrong.
- **DORA 2024**: top-quartile orgs have CI feedback time of <10 minutes; bottom-quartile >1 hour. The bottom-quartile orgs spend ~5× more developer time per shipped feature. Implicit cost ratio ≈ 5×; ours should be similar in spirit.
- **GitLab Global DevSecOps Survey 2024**: 60% of developers say CI/CD pipeline time is a "significant" or "extreme" productivity drag. Doesn't quantify but supports the framing.

## Org-internal — what to look for

When this analysis is rolled up across multiple services in the same org, check:
- Any central deploy-event aggregator (look for `repository_dispatch` calls in CI workflows that POST to a shared repo) — it should give per-service deploy timings going back further than the per-repo Actions API window allows.
- Any existing product-analytics event for "STG-deploy-blocked" or similar — would let you correlate deploy queueing with developer activity.

## Sanity check ranges

Given:
- 20–40 active devs (typical mid-stage SaaS engineering team)
- $2.00/min wage
- 8–15 min mean pipeline
- 4–8 runs/dev/biz-day
- 15–25% CI failure rate
- Blast radius 1.5×–2.5×

The headline `$/CI min` should land between **$50/min** and **$300/min** for a single team-repo-window. Annual cost between **$300k** and **$2.5M**. If the script produces something outside this, double-check `inputs.yml` first.
