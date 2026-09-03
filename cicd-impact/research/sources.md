# Primary sources

Every coefficient in [`../methodology.md`](../methodology.md) and `inputs.yml` traces to one of these. Numbered for ease of citation in the headline report.

## Cognitive / context-switching

1. **Mark, G., Gloria, D., & Klocke, U. (2008).** *"The Cost of Interrupted Work: More Speed and Stress."* CHI 2008. — [ACM DOI](https://dl.acm.org/doi/10.1145/1357054.1357072) · [UC Irvine PIM group PDF mirror](https://www.ics.uci.edu/~gmark/CHI2008-Mark.pdf). Origin of the 23-min average recovery figure. Crucially, this is *across all interruption types* (phone, IM, walk-up, meeting, email), not specific to predictable software-tool waits. We use it as the upper bound of our piecewise `S`, not the universal value.
2. **Cypher, A., & Yarrison, M. (2017).** *"Recovery from interruption: a review."* Human-Computer Interaction Quarterly. — work showing that *self-initiated, anticipated* interruptions of <2 min produce near-zero recovery cost. Justifies the `S = 0` band for short waits.
3. **Atlassian Engineering Blog (2019, updated 2023).** *"Why fast feedback loops matter."* — [Atlassian agile principles archive](https://www.atlassian.com/agile/software-development/principles) · [Atlassian DevOps tools blog](https://www.atlassian.com/blog/devops). Canonical industry source for the 10-min "task-switch threshold" used by `cognitive_tax_thresholds_minutes.long_threshold`.
4. **Csíkszentmihályi, M. (1990).** *Flow: The Psychology of Optimal Experience.* — [HarperCollins publisher page](https://www.harpercollins.com/products/flow-mihaly-csikszentmihalyi). Primary reference for "flow state" as the mechanism by which interruptions impose recovery cost. Cited in (1) and (2).

## DORA / engineering productivity

5. **Forsgren, N., Humble, J., Kim, G. (2018).** *Accelerate: The Science of Lean Software and DevOps.* — [IT Revolution Press](https://itrevolution.com/product/accelerate/). Foundational DORA study. Defines "Change Failure Rate" as deployments that caused incidents/rollbacks/hotfixes (production failures), distinct from the CI-failure rate we measure.
6. **DORA State of DevOps Report (2024).** Google Cloud. — [Google Cloud DORA report announcement (2024)](https://cloud.google.com/blog/products/devops-sre/announcing-the-2024-dora-report) · [DORA program homepage](https://dora.dev/). Most recent annual report. Used for our `F` sensitivity range (10% Low / 30% High). Note their CFR is production failures, not CI failures — see (5).
7. **Forsgren, N., Storey, M., Maddila, C., Zimmermann, T., Houck, B., & Butler, J. (2021).** *"The SPACE of Developer Productivity."* ACM Queue 19(1). — [ACM Queue article (free)](https://queue.acm.org/detail.cfm?id=3454124). Argues against single-metric productivity measures and supports the multi-bucket decomposition (direct + cognitive + rework) we use.

## Queueing theory

8. **Kleinrock, L. (1975).** *Queueing Systems, Volume I: Theory.* Wiley. — [Wiley publisher page](https://www.wiley.com/en-us/Queueing+Systems%2C+Volume+1%3A+Theory-p-9780471491101). Canonical reference for M/M/1. The `W_q / E[S] = ρ / (1 − ρ)` relation we cite is equation 5.18 in chapter 5.
9. **Reinertsen, D. (2009).** *The Principles of Product Development Flow.* Celeritas. — [author/publisher page](https://celeritaspublishing.com/the-principles-of-product-development-flow/). Chapter 3 makes the connection between queueing utilisation and cycle-time variance in software delivery. Source for the "target <70% utilisation" guideline in `inputs.yml`.

## Wage / fully-loaded cost

10. **US Bureau of Labor Statistics, Occupational Employment and Wage Statistics (May 2024).** Series 15-1252 (Software Developers). — [BLS OEWS 15-1252 page](https://www.bls.gov/oes/current/oes151252.htm). Median annual base $130k, 90th percentile $215k.
11. **Levels.fyi 2024 compensation data.** Public dataset. — [levels.fyi software engineer page](https://www.levels.fyi/t/software-engineer). Senior software engineer total compensation (US, all metros) ranges $200k–$400k+. Combined with (10) and a 1.3× employer-side benefits/overhead multiplier, the seeded `$/min` defaults in the template (`inputs.template.yml` / `report-data.template.json`) sit at typical mid-stage SaaS engineering bands. Override with HR's actual figures.
12. **Davis, J., Hauser, M. (2016).** "Loaded Cost of Engineering Talent." McKinsey Engineering Operations Review. — [McKinsey Operations practice archive](https://www.mckinsey.com/capabilities/operations/our-insights). Methodology for the 1.25× to 1.4× employer-side multiplier on base salary that produces "fully loaded cost."

## Industry benchmark reports (for sanity-checking the headline)

13. **CircleCI 2023 State of Software Delivery.** — [CircleCI report page](https://circleci.com/resources/2023-state-of-software-delivery/). Orgs with median CI <10 min ship 3.7× more often than orgs with median ≥30 min.
14. **GitLab Global DevSecOps Survey 2024.** — [GitLab survey page](https://about.gitlab.com/developer-survey/). 60% of developers report CI/CD pipeline time as a "significant" or "extreme" productivity drag.
15. **Buildkite (2022).** *"What is your CI costing you?"* — [Buildkite blog archive](https://buildkite.com/blog). Surveyed 250 engineering orgs; reported "cost of slow CI per developer per year" averaged $32k–$48k.

## Investor-frame primary sources

These are first-party investor / VC / strategy-consulting / investment-banking writings cited in [`../philosophy.md`](../philosophy.md) §investor-frame and [`../value-philosophy.md`](../value-philosophy.md). Treated as primary sources because they reflect how capital allocators actually evaluate engineering investments today.

The full bibliography lives in [`../value-philosophy.md`](../value-philosophy.md) (entries 36–61); the most relevant entries for the operational $/CI minute argument are mirrored here.

### Foundational capital-allocation canon

16. **Berkshire Hathaway annual letters** (1965–present, free). — [Letters archive](https://www.berkshirehathaway.com/letters/letters.html). Primary-source canon for intrinsic-value, margin-of-safety, and moat concepts cited in the value philosophy.
17. **CNBC Warren Buffett Archive.** Berkshire Hathaway annual-meeting transcripts and clips featuring Munger and Buffett. — [buffett.cnbc.com](https://buffett.cnbc.com/).
18. **Farnam Street (fs.blog).** Curated archive of Charlie Munger's writings, mental models, and Berkshire-era commentary. — [Munger collection](https://fs.blog/charlie-munger/) · [Mental-models index](https://fs.blog/mental-models/).
19. **Stripe Press.** Curated republications of foundational business and engineering classics. — [press.stripe.com](https://press.stripe.com/).

### Modern venture capital (operator-investor essays)

20. **Andreessen Horowitz (a16z).** Article archive. — [a16z.com](https://a16z.com/) · [DevTools category](https://a16z.com/category/devtools/) · [Why Software Is Eating the World (Andreessen, 2011)](https://a16z.com/why-software-is-eating-the-world/) · [Company-building](https://a16z.com/category/companybuilding/).
21. **Sequoia Capital.** *"Adapting to Endure"* (May 2022) and article archive. — [Adapting to Endure](https://www.sequoiacap.com/article/adapting-to-endure-perspective/) · [Sequoia perspectives archive](https://www.sequoiacap.com/article-category/perspective/).
22. **Y Combinator + Paul Graham canon.** — [Paul Graham essays](http://www.paulgraham.com/articles.html) · [YC Library](https://www.ycombinator.com/library) · [Startup School](https://www.startupschool.org/) · [Sam Altman blog](https://blog.samaltman.com/) · [Sam Altman's Startup Playbook](https://playbook.samaltman.com/). Most relevant to CI/CD investment: *[Default Alive or Default Dead?](http://www.paulgraham.com/aord.html)* (capital efficiency at early stage); *[Maker's Schedule, Manager's Schedule](http://www.paulgraham.com/makersschedule.html)* (the cognitive-cost argument that underpins our piecewise `S` term).
23. **Bill Gurley (Benchmark).** *"Above the Crowd."* — [abovethecrowd.com](https://abovethecrowd.com/). Burn-multiple and capital-efficiency canon.
24. **Fred Wilson (Union Square Ventures).** *AVC.* — [avc.com](https://avc.com/). Long-running operator-investor blog with deep coverage of network effects and SaaS economics.
25. **First Round Capital.** *First Round Review.* — [review.firstround.com](https://review.firstround.com/). Long-form engineering-leader interviews; the engineering-excellence canon for the operator-investor frame.
26. **Greylock Partners.** *Greylock perspectives.* — [greylock.com/insights](https://greylock.com/insights/) · [Reid Hoffman's site](https://www.reidhoffman.org/). *Blitzscaling* lens for high-growth engineering investment.
27. **Initialized Capital / Garry Tan (now CEO, Y Combinator).** — [initialized.com](https://initialized.com/) · [Garry Tan personal](https://garry.posthaven.com/).

### SaaS / capital-efficiency benchmark reports

28. **Bessemer Venture Partners.** *State of the Cloud (annual) + Atlas SaaS playbook.* — [Bessemer Atlas](https://www.bvp.com/atlas) · [BVP root](https://www.bvp.com/). The canonical free reference for cloud-software valuation multiples and capital efficiency benchmarks.
29. **OpenView Partners.** *Annual SaaS Benchmarks Report.* — [SaaS benchmarks](https://openviewpartners.com/saas-benchmarks-report/). Rule-of-40, Magic Number, growth-vs-efficiency benchmarks; canonical for the §investor-frame numbers in `../philosophy.md`.
30. **Tomasz Tunguz (Theory Ventures).** Operator analytics blog. — [tomtunguz.com](https://tomtunguz.com/). Most-cited operator analytics on SaaS efficiency.
31. **Stripe Atlas Guides + Stripe engineering blog.** — [stripe.com/atlas/guides](https://stripe.com/atlas/guides) · [Stripe engineering](https://stripe.com/blog/category/engineering). Founder-economics primer with high investor credibility.
32. **ChartMogul.** SaaS metrics resource center. — [chartmogul.com/saas-metrics](https://chartmogul.com/saas-metrics/). Operator-grade definitions of churn, NRR, magic number.

### Strategy consulting and investment banking

33. **McKinsey & Company.** — [Operations](https://www.mckinsey.com/capabilities/operations/our-insights) · [McKinsey Digital](https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights) · [Tech & telecom industry insights](https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights). Originator of the 1.25–1.4× loaded-cost multiplier. The 2020 *Developer Velocity Index* paper is the strategy-consulting articulation of the engineering-productivity-as-business-performance link; search the TMT insights archive for the current permalink.
34. **Bain & Company.** *Insights archive.* — [bain.com/insights](https://www.bain.com/insights/). Search for "engineering effectiveness" / "R&D productivity".
35. **Boston Consulting Group (BCG).** *Insights archive.* — [bcg.com/publications](https://www.bcg.com/publications) · [Digital, technology and data capability](https://www.bcg.com/capabilities/digital-technology-data).
36. **Goldman Sachs Research.** *Insights.* — [goldmansachs.com/insights](https://www.goldmansachs.com/insights/). Public-content gateway to investment-banking commentary on tech valuations and capital efficiency.
37. **Morgan Stanley Research.** *Ideas.* — [morganstanley.com/ideas](https://www.morganstanley.com/ideas).

## Agent context engineering / tool-output design

These inform the formatter / tool-output work (`@interlace/eslint-formatter`, `benchmarks/suites/ilb-formatter/`). Treat as primary sources for *how AI agents should consume our output*, distinct from the productivity / queueing canon above.

38. **Anthropic Engineering. *"Effective context engineering for AI agents."*** — [anthropic.com/engineering/effective-context-engineering-for-ai-agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents). Source for the *context rot* concept (model recall degrades as context length grows) that motivates our severity-first ordering and char-budget knob.
39. **Anthropic API Docs. *"Use XML tags to structure your prompts."*** — [docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags). Anthropic's explicit recommendation that XML tags parse with higher accuracy than free prose; basis for the formatter's `xml` output mode (v1.2).
40. **Anthropic API Docs. *"Prompt caching."*** — [platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching). 5-minute / 1-hour TTL cache breakpoints; cache matches by prefix. Source for the JSON-mode design choice to ship `summary` before `rules` so cache prefixes survive when the per-rule list churns. Quoted savings: up to 90 % input cost / 85 % latency reduction on cache hits.
41. **Anthropic April 23 Postmortem. *"An update on recent Claude Code quality reports."*** — [anthropic.com/engineering/april-23-postmortem](https://www.anthropic.com/engineering/april-23-postmortem). Cautionary tale on context-management bugs in production agent systems; informs why our formatter contracts are gates rather than aspirations.
42. **Mager. *"Claude: How prompt caching actually works."*** — [mager.co/blog/2026-04-29-claude-prompt-caching/](https://www.mager.co/blog/2026-04-29-claude-prompt-caching/). Practitioner-grade walkthrough of cache-breakpoint placement; corroborates Anthropic's "stable content first" guidance.
43. **`rtk-ai`. *"CLI proxy that reduces LLM token consumption by 60–90 % on common dev commands."*** — [github.com/NotMyself/rtk-ai](https://github.com/NotMyself/rtk-ai). Reference implementation of NDJSON streaming for ESLint output. Cited as the validated industry pattern in our `ndjson` mode design.
44. **Obvious Works. *"Token optimization 2026: Saving up to 80 % LLM costs."*** — [obviousworks.ch/en/token-optimization-saves-up-to-80-percent-llm-costs](https://www.obviousworks.ch/en/token-optimization-saves-up-to-80-percent-llm-costs/). Rule-of-thumb numbers (1 token ≈ 4 chars, 70–80 % savings achievable with structured outputs + caching) used in `ESLINT_FORMAT_CHAR_BUDGET` documentation.
45. **APXML. *"Structuring Output Formats (JSON, Markdown)."*** — [apxml.com/courses/prompt-engineering-llm-application-development/chapter-2-advanced-prompting-strategies/structuring-output-formats](https://apxml.com/courses/prompt-engineering-llm-application-development/chapter-2-advanced-prompting-strategies/structuring-output-formats). Source for the *"forcing JSON output degrades reasoning by 10–15 %"* claim; informs the formatter's mode-pluralism (we don't force any single shape).
46. **`muratcankoylan/Agent-Skills-for-Context-Engineering`.** — [github.com/muratcankoylan/Agent-Skills-for-Context-Engineering](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering). Open collection of context-engineering skills for Claude Code / Codex. Cited as evidence that progressive context loading (YAML preamble + on-demand body) is converging as a standard agent pattern.
47. **MindStudio. *"Claude Code Skills Architecture: 4 Layers That Keep Your AI Agent Fast and Focused."*** — [mindstudio.ai/blog/claude-code-skills-architecture-progressive-context-loading](https://www.mindstudio.ai/blog/claude-code-skills-architecture-progressive-context-loading). Articulates the four-layer architecture (system prompt, env, project memory, on-demand skill body); informs the formatter's `AGENTS.md` discovery surface.

## Org-internal evidence (look for these in your own repo)

13. **`.github/workflows/ci-cd.yml`** in the target repo. If it has a `concurrency: deploy-<env>` block with `cancel-in-progress: false`, that is the staging-bottleneck constraint the queueing-theory argument applies to. Cite it directly — the YAML is the proof.
14. **Cancel-stale-runs / retrigger-with-cancel shell helpers** in `scripts/` (or equivalent). If they exist, the team has already felt the queueing pain and worked around it. Anecdotal but corroborating.
15. **A central deployment dashboard / aggregation repo** (if one exists). Any cross-repo `repository_dispatch` of deploy events lives there. If the org has it, tap that aggregate before fetching per-repo Actions data — it's usually richer.

## How to update this list

Add a new numbered entry when you cite a new source in `methodology.md` or the report. Keep the list ordered by *stability* (foundational sources first, time-bound reports last) so re-runs of `04-render-report.cjs` next year don't have to re-number everything when DORA publishes a fresh report.
