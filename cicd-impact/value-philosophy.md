# Value philosophy — from human incentives to static code analysis

> **Read order in this folder:** this document → [`philosophy.md`](philosophy.md) (operational) → [`methodology.md`](methodology.md) (formula).
>
> [`philosophy.md`](philosophy.md) explains *how CI/CD friction expresses itself in money, velocity, and deliverability*. This document explains *why those three are the right axes at all* — by tracing the chain from human-level incentive frameworks down to the specific question of how a static-analysis line item in a CI pipeline creates value. If the operational philosophy is the engineering case, this is the foundation it stands on.

## Why this exists

Most arguments for a tooling investment fail because they start three steps too low. They start at "this rule catches bug X" and have to work upward against a chain of "but does that matter?" questions. By the time the conversation reaches "the rule reduces engineering CI tax which reclaims payroll which improves capital efficiency", the audience has already discounted it as engineer-talk.

The reverse chain is more durable. Start from what *humans, systems, and companies are agreed to want*, derive what makes any activity valuable, derive what makes a measurable activity valuable in a measurable way, and only then descend into the specific mechanics of static code analysis. By the time the chain reaches "this rule catches bug X", the audience has already accepted that the rule must matter — they're only quibbling over how much.

This document is the chain.

## 0. The two ruling systems — capitalism and humanism

Before defining value, it is necessary to name the systems within which the question of value is being asked. The modern world operates inside two largely-co-existing-but-sometimes-tense frameworks, and any serious value philosophy must satisfy both. Treating only one as authoritative produces brittle answers that don't survive contact with the people or the markets being served.

| System | What it optimises | Core mechanism | Canonical sources |
| :--- | :--- | :--- | :--- |
| **Capitalism** | Allocative efficiency of capital and labour | Price signals; voluntary exchange; risk-adjusted returns | Adam Smith *Wealth of Nations* (1776); Hayek *The Use of Knowledge in Society* (1945); Friedman *Capitalism and Freedom* (1962) |
| **Humanism** | Human dignity, agency, meaning, and flourishing | Recognition that humans are ends in themselves, not means | Erasmus and Renaissance humanism; Kant *Groundwork for the Metaphysics of Morals* (1785); Sen *Development as Freedom* (1999) |

These two systems are usually allied and sometimes in tension. Capitalism efficiently coordinates large-scale production but tends to commodify; humanism resists commodification of human experience but is poor at large-scale resource allocation. The argument over which is primary is older than this document and will outlast it. What matters here is the recognition that **a value philosophy that only honours capitalism produces engineering cultures that grind people down for short-term return; a value philosophy that only honours humanism produces engineering cultures that fail in the market and put their people out of work**. Neither extreme is sustainable.

Software development sits cleanly at the intersection. It is a market activity (capitalism) performed by humans seeking meaningful, autonomous, mastery-oriented work (humanism). A defensible value philosophy for software tooling must therefore satisfy both:

- **Capitalist test:** does this activity produce risk-adjusted returns that justify its capital cost?
- **Humanist test:** does this activity respect the dignity, agency, and developmental needs of the humans performing it?

Static code analysis passes both tests cleanly. It produces measurable risk-reduction value (capitalist test, see §4 and §5 of this doc and all of [`philosophy.md`](philosophy.md)). It also frees the humans doing the work from chasing avoidable bugs, debugging on weekends, and accumulating cognitive debt — restoring autonomy and mastery (humanist test). Tools that pass only one test are unstable: they either get killed in budget review (capitalist failure) or burn out the team using them (humanist failure). Tools that pass both compound durably.

This dual frame runs through everything below. When we cite Buffett and Munger on capital allocation, we are honouring the capitalist test. When we cite Pink, Sen, and Christensen on human motivation and customer value, we are honouring the humanist test. Both are non-negotiable.

## 1. What is value?

The word *value* is overloaded. Engineers, finance, and investors use it differently, and the differences matter. The clearest single definition comes from [Warren Buffett](https://www.berkshirehathaway.com/letters/letters.html), paraphrasing his teacher [Benjamin Graham](https://en.wikipedia.org/wiki/Benjamin_Graham):

> **"Price is what you pay; value is what you get."** — Warren Buffett, [Berkshire Hathaway annual letters](https://www.berkshirehathaway.com/letters/letters.html), recurring (cf. Graham, *[The Intelligent Investor](https://en.wikipedia.org/wiki/The_Intelligent_Investor)*, 1949)

This is the foundational distinction. Price is what an accounting system records when an exchange happens. Value is the *thing the buyer actually receives* — which can be larger than the price (a bargain), smaller (overpriced), or invisible at the moment of exchange and visible only over time (compound assets). For most of corporate history, accounting has been a faithful recorder of price and an unfaithful recorder of value, and the gap between the two is where investment skill — and engineering judgement — lives.

[Charlie Munger](https://en.wikipedia.org/wiki/Charlie_Munger), Buffett's partner, sharpens the point with the observation that has done more than any other to clarify what to expect from any system:

> **"Show me the incentive and I'll show you the outcome."** — Charlie Munger, *[Poor Charlie's Almanack](https://stripepress.com/books/poor-charlies-almanack)* (2005)

Read together, these two quotes anticipate and answer most of the value-measurement problems any organisation will encounter. *Price is what you pay; value is what you get* tells you that the price tag is not the answer. *Show me the incentive and I'll show you the outcome* tells you that whatever the organisation actually rewards is what the organisation will produce more of — which is why the gap between price and value persists, because the incentives to measure value are weaker than the incentives to record price.

With that framing in place, the academic typology of value can be set out cleanly. Three definitions appear repeatedly across the literature, and a fourth cuts across all of them:

| Definition | Frame | Core question | Canonical source |
| :--- | :--- | :--- | :--- |
| **Use value** | Direct utility to the consumer | "Does this satisfy a need?" | Adam Smith, *Wealth of Nations* (1776), Book 1 Ch. 4; Christensen *Competing Against Luck* (2016) on Jobs-to-be-Done |
| **Exchange value** | Market price | "What will someone pay for this?" | Smith again; Marx *Capital* I.1; modern microeconomics |
| **Counterfactual value** | What would have happened without it | "What did this prevent or enable?" | Insurance theory; David Lewis on causation; modern epidemiology |
| **Eudaimonic value** | Human flourishing | "Does this enable a life worth living?" | Aristotle, *Nicomachean Ethics*; Sen's *Capability Approach*; Pink's *Drive* (2009) |

The distinction that matters most for software tooling is **direct vs. counterfactual**. A revenue-generating feature has direct value: it shows up in the income statement next quarter. A static-analysis rule has counterfactual value: it prevents something that would have shown up in the income statement next quarter as a *negative*. The two are economically equivalent — a dollar prevented is a dollar earned — but only one is naturally visible to the accounting system.

This is the central problem of measuring static code analysis, and indeed of measuring any defensive activity in any domain. Counterfactual value is real but invisible by default. Making it visible requires deliberate work, because the accounting systems we inherit measure direct value first.

### 1.1 Buffett and Munger applied to engineering

The Buffett-Munger framework was developed for capital allocation, but its central concepts translate to engineering investment decisions through a **structural isomorphism**, not an analogy. The structure is:

> A business is a stream of risk-adjusted future cash flows. A codebase is a stream of risk-adjusted future feature deliveries (which themselves convert into cash flows via the product). The mathematical object — a discounted-cash-flow valuation under risk-adjusted return ([Markowitz 1952](https://www.jstor.org/stable/2975974); standard NPV) — is identical in both cases. Therefore the analytical apparatus Graham, Buffett, and Munger built for evaluating businesses applies *mechanically* to evaluating engineering investments, not by analogy.

The isomorphism makes five concepts load-bearing.

**Intrinsic value vs market price.** Graham's *intrinsic value* — the value of a business based on its actual earning power rather than its quoted price — has a direct engineering analogue: the *intrinsic value* of a piece of code is the risk-adjusted future cash flow it produces or protects, not the lines-of-code count or the cycle-time-to-ship. A rule that catches one production-grade bug per quarter has high intrinsic value even if its line count is small and its CI-time cost is invisible.

**Margin of safety.** Graham's *margin of safety* — the gap between intrinsic value and price that protects against estimation error — translates to defence-in-depth in engineering. Static analysis is a margin-of-safety layer: it catches a fraction of the bugs that the test suite would have caught, *and* a fraction the test suite would have missed, *and* runs at 1/100th the cost. A team that relies on a single defensive layer (only tests, only review) has zero margin of safety; a team with lint + types + tests + review has compounding margin.

**Moats.** Buffett's *economic moat* — the durable competitive advantage that protects future cash flows — applies to a codebase the same way it applies to a business. A codebase with a strong static-analysis posture has a quality moat: it can be modified faster, audited cheaper, onboarded onto faster. The moat shows up in M&A diligence (see [`philosophy.md`](philosophy.md) §investor-frame), in audit cycles, and in hiring.

**Circle of competence.** Buffett: *"Risk comes from not knowing what you're doing."* Engineers face the same risk every time they take on code outside their fluency. Strict, well-targeted static-analysis rules expand the *effective* circle of competence by codifying the patterns an expert would have caught — making the codebase safer for less-expert hands. A rule is a transferred competence.

**Compound interest.** Munger's most-quoted observation on compounding:

> **"The first rule of compounding: never interrupt it unnecessarily."** — Charlie Munger ([Berkshire Hathaway annual meeting archive, CNBC](https://buffett.cnbc.com/) · [Farnam Street's curated Munger collection](https://fs.blog/charlie-munger/))

In engineering, the compound asset is *codebase quality*. Every prevented anti-pattern saves a downstream day; the saved day enables a feature that creates a customer that funds further investment. Cutting the static-analysis budget interrupts the compounding. The damage is invisible at the moment of the cut and obvious five years later when the codebase has accumulated debt that costs an order of magnitude more to remove than it would have cost to prevent.

The Buffett-Munger lens does one more thing that conventional engineering-economics framing misses: it forces the question *what is the intrinsic value of an investment whose return is invisible*? Buffett built a fortune on the answer that intrinsic value is real even when the market price doesn't reflect it. The same answer applies to defensive engineering: the intrinsic value of static-analysis investment is real even when no quarterly metric reflects it. The job of [`cicd-impact/`](README.md) and [`CLAIMS.md`](../CLAIMS.md) is to construct the measurement infrastructure that makes the intrinsic value visible — exactly as a fundamental investor constructs valuation models that make intrinsic value visible despite market noise.

### 1.2 Software industry leaders on value

The same value insights have been articulated, in software-industry-specific terms, by the industry's most-cited figures. Each quote below corresponds to one of the value mechanisms described above; together they form an industry-internal vocabulary for the same concepts Buffett and Munger built externally.

**On the cost ratio across defensive layers (counterfactual value, ~order-of-magnitude per layer):**

> *"It's all about catching bugs as early as possible. The cost of a bug grows exponentially with the time it lives in the codebase."* — [Steve McConnell](https://stevemcconnell.com/), *[Code Complete](https://www.microsoftpressstore.com/store/code-complete-9780735619678)* (2nd ed., 2004), drawing on Boehm's [*Software Engineering Economics*](https://en.wikipedia.org/wiki/Software_Engineering_Economics) (1981). The empirical literature converges on roughly an order-of-magnitude cost increase per defensive layer — see the [grounded table in `philosophy.md` §investor-frame](philosophy.md#deliverability-axis--quality-risk-and-ma-diligence) for the per-layer empirical anchors (Boehm, Capers Jones, IBM SSI, NIST 2002, IBM Cost of a Data Breach, Verizon DBIR).
>
> *"Program testing can be used to show the presence of bugs, but never to show their absence."* — [Edsger Dijkstra](https://www.cs.utexas.edu/~EWD/) ([EWD303](https://www.cs.utexas.edu/~EWD/transcriptions/EWD03xx/EWD303.html), 1972; popularised in [The Humble Programmer (EWD340)](https://www.cs.utexas.edu/~EWD/transcriptions/EWD03xx/EWD340.html)). The reason static analysis matters: it is the only layer that can categorically rule out classes of bugs by construction.

**On leverage — why a small static-analysis investment compounds (compound + network effects):**

> *"A great lathe operator commands several times the wages of an average lathe operator, but a great writer of software code is worth 10,000 times the price of an average software writer."* — [Bill Gates](https://en.wikipedia.org/wiki/Bill_Gates) (commonly cited; appears in *[Hard Drive](https://archive.org/details/harddrivebillgat00wall_0)*, Wallace & Erickson, 1992). Quality leverage in software is non-linear — and the same leverage that makes a great writer worth 10,000× makes a missing lint rule cost 10,000× when the bug it would have caught reaches production.

**On human cost of avoidable work (humanist test, restored autonomy):**

> *"There are two ways of constructing a software design: one way is to make it so simple that there are obviously no deficiencies, and the other way is to make it so complicated that there are no obvious deficiencies. The first method is far more difficult."* — [Tony Hoare](https://en.wikipedia.org/wiki/Tony_Hoare), [Turing Award lecture (1980)](https://dl.acm.org/doi/10.1145/358549.358561). Static-analysis rules embody the first approach; without them, complexity grows by default and the humans maintaining the system bear the cost.

**On the budget-cycle vs compound-payoff mismatch (Trap 3 in §4):**

> *"Adding manpower to a late software project makes it later."* — [Frederick Brooks](https://en.wikipedia.org/wiki/Fred_Brooks), *[The Mythical Man-Month](https://en.wikipedia.org/wiki/The_Mythical_Man-Month)* (1975). Brooks's law is the engineering version of Munger's compounding rule: damage is asymmetric. The cost of *fixing* a quality crisis with more headcount exceeds the cost of *preventing* it with rule investment by an order of magnitude or more.

**On creating durable value vs capturing rent:**

> *"Create more value than you capture."* — [Tim O'Reilly](https://en.wikipedia.org/wiki/Tim_O%27Reilly), *[WTF? What's the Future and Why It's Up to Us](https://www.harpercollins.com/products/wtf-tim-oreilly)* (2017). Open-source ESLint rules captured by a closed-source company would be one form of rent extraction; a public, evidence-backed monorepo of rules with public benchmarks ([`benchmarks/`](../benchmarks/), [`CLAIMS.md`](../CLAIMS.md)) is the alternative — value created exceeds value captured, and the surplus compounds via reputation and contributions.

**On the measurement problem (why measurement infrastructure matters):**

> *"You can't manage what you don't measure."* — [Peter Drucker](https://www.drucker.institute/perspective/about-peter-drucker/), often paraphrased. The pair to it is *what gets measured gets managed* — and per Munger, *what gets managed gets the incentives*. If a static-analysis investment isn't measured, it won't be managed, and incentives will erode it.

**On long-term thinking (compounding via culture):**

> *"It's always Day 1."* — [Jeff Bezos](https://www.aboutamazon.com/news/company-news/2016-letter-to-shareholders), [Amazon 1997 shareholder letter](https://www.sec.gov/Archives/edgar/data/1018724/000119312598014949/0001193125-98-014949.txt) (restated annually). Day 2 is stasis, then irrelevance. Day 1 means treating quality investments as if the company's survival depended on them — because over a 10-year horizon, it does.

**On the moat created by quality:**

> *"Software is eating the world."* — [Marc Andreessen](https://a16z.com/why-software-is-eating-the-world/) ([WSJ, 2011](https://www.wsj.com/articles/SB10001424053111903480904576512250915629460)). The corollary: in a world where every business is a software business, the durability of every business is bounded by the quality of its software. Static-analysis posture is part of that durability.

**On the developer-experience humanist case:**

> *"Make it work, make it right, make it fast."* — [Kent Beck](https://en.wikipedia.org/wiki/Kent_Beck) ([wiki](https://wiki.c2.com/?MakeItWorkMakeItRightMakeItFast)). The middle step is what static analysis automates at scale. Without it, developers spend their cognitive budget catching anti-patterns by hand; with it, the cognitive budget is freed for design and decision-making — the work humans do better than rules.

These ten threads — Buffett, Munger, McConnell, Dijkstra, Gates, Hoare, Brooks, O'Reilly, Drucker, Bezos, Andreessen, Beck — are not a stylistic collage. Each one names a distinct mechanism by which static analysis creates value: cost ratio, leverage, simplicity, asymmetric damage, public-good reputation, measurement discipline, long-term thinking, market durability, and developer flourishing. The industry's most-quoted voices have been making the case for forty years; what has been missing is the measurement infrastructure to convert the case into budget. That infrastructure is what this folder builds.

## 2. How we measure value (and what slips through)

There are five mechanisms by which value gets measured. They are not equally easy to use, and the ones that are hardest to use are the ones static analysis depends on.

### 2.1 Direct measurement

Revenue, hours saved, units shipped. This is what financial accounting was built for. Strengths: precise, auditable, time-bounded. Weakness: only captures activities that produce a measurable artifact in a measurable window.

### 2.2 Proxy measurement

NPS, retention, engagement. Used when direct measurement is too coarse or too slow. Strength: fast feedback. Weakness: every proxy is one assumption away from the thing it measures, and the proxy can be gamed (Goodhart's law: *when a measure becomes a target, it ceases to be a good measure*).

### 2.3 Counterfactual measurement

Bugs prevented, breaches avoided, churn that didn't happen. Mechanically harder: requires a model of what would have occurred otherwise. Insurance does this with actuarial tables; security does it with attack-tree analysis; engineering can do it with the cost-ratio framework grounded in [`philosophy.md` §investor-frame](philosophy.md#deliverability-axis--quality-risk-and-ma-diligence) — empirically anchored to Boehm, Capers Jones, IBM SSI, NIST 2002, IBM Cost of a Data Breach, and Verizon DBIR, with each defensive layer (lint → unit test → QA → production → disclosure) costing roughly an order of magnitude more than the previous tier (and the disclosure tier behaving as a separate long-tailed distribution).

The challenge is **attribution dilution**: when multiple layers could have caught a bug, who gets the credit? The honest answer is that all of them do, fractionally. The dishonest answer is the one most accounting systems give: only the layer that *did* catch it. This systematically under-credits prevention in favour of detection.

### 2.4 Lagged measurement

Reputation, trust, codebase quality. These accumulate slowly and are visible only when integrated over years. The annual budget cycle is hostile to this kind of value because it reports on a 12-month window and discounts anything that pays back later.

### 2.5 Negative-space measurement

The strongest form, used in actuarial work, public health, and security: measure the gap between *what happened* and *what plausibly could have happened*. Examples: `prevented_breaches = expected_breaches_at_industry_baseline - observed_breaches_at_this_company`. The mechanic is contrastive; the technique requires a credible baseline.

These five mechanisms form a hierarchy of difficulty. Direct measurement is universally adopted because it's easy. The other four are adopted unevenly — by industries that have *had to* (insurance, public health, aviation) and by those that haven't *yet* (most software engineering organisations).

## 3. Why incentive systems determine what gets measured

A measurement system is not neutral. The KPIs an organisation tracks are the activities it implicitly rewards, which are the activities it gets more of. This is **Goodhart's law operating in reverse**: the unmeasured is also un-incentivised, and gradually disappears from the activity portfolio.

The literature on motivation and incentive design — Daniel Pink's *Drive* (2009) for individuals, Donella Meadows' *Thinking in Systems* (2008) for systems, Coase's *Theory of the Firm* (1937) for companies — converges on three layers, each with its own incentive vocabulary:

| Layer | Drives action via | Time horizon | What's naturally measured | What's naturally invisible |
| :--- | :--- | :--- | :--- | :--- |
| **Individual** | Autonomy, mastery, purpose; reputation; dopamine on completion | Hours to weeks | Tasks shipped | Bugs prevented; tech debt avoided |
| **System** | Equilibrium states; feedback loops; metric targets | Weeks to quarters | OKRs; cycle-time KPIs | Adversarial inputs that didn't arrive; brittleness avoided |
| **Company** | Profit; market position; regulatory pressure; mission | Quarters to years | Revenue; growth rate; CFR | Reputation in 5 years; M&A premium; audit posture |

Notice the pattern: **at every layer, the visible column is direct value and the invisible column is counterfactual + lagged value**. This is not a coincidence; it is a consequence of the fact that measurement infrastructure is itself an investment, and organisations under-invest in measuring the things that aren't easy to measure.

The strategic implication is concrete: any activity whose value lives in the *invisible* column will be systematically underinvested in unless someone deliberately builds the measurement infrastructure to make it visible. **This is the entire reason `cicd-impact/` exists.** It is measurement infrastructure for an invisible value source.

## 4. Why static code analysis is especially hard to measure

Static code analysis sits at the intersection of all three difficult-to-measure categories:

- **It is counterfactual.** It prevents bugs that don't ship. The cost it saves is the cost that didn't happen.
- **It is lagged.** Its compound benefits — audit posture, lower CFR over time, codebase entropy held in check — accumulate over years.
- **It is in negative space.** Its evidence is what *didn't* occur.

This compounds three measurement traps that any honest practitioner will encounter:

### Trap 1 — Survivorship bias

We only see the bugs that escaped to production. We never see the bugs that the linter caught, because by the time we look at the codebase, those bugs are already absent. An audit of "bugs in production" therefore systematically under-credits the layer that prevented the most.

### Trap 2 — Attribution dilution

Every defensive layer (lint, type-check, test, code review, QA, staging) "could have" caught any given bug. When a bug is caught, the layer that caught it gets the credit; when a bug is prevented, the credit is split across all layers that *would have* caught it. Static analysis runs first, so it has the highest probability of being the prevention layer — and therefore the lowest visibility, because nothing visible happens at the lint stage.

### Trap 3 — Time lag vs. budget cycle

The compound benefits of static-analysis investment (codebase quality, audit posture, M&A multiple) materialise over 1–5 years. Engineering budgets are set on 3–12-month cycles. The time-mismatch alone is enough to defund static analysis at organisations without explicit philosophical commitment to compounding investments.

### How to escape each trap

The escape from Trap 1 is **deliberate counterfactual modelling**: build benchmarks (like the ILB suite in this monorepo's [`benchmarks/`](../benchmarks/) folder) that measure "what fraction of seeded bugs does this rule catch?" Survivorship bias dissolves once you can answer that question for any rule against any corpus.

The escape from Trap 2 is **the cost-ratio framework**: when multiple layers could have caught a bug, the *cost* of catching it differs by orders of magnitude across layers. Even fractional credit at the cheapest layer is worth more than full credit at the most expensive. The empirical ~10× per layer ratio ([`philosophy.md` §investor-frame](philosophy.md#deliverability-axis--quality-risk-and-ma-diligence)) means that a 10% attribution to lint at 1× cost beats 100% attribution to test at ~10× cost by roughly a factor of one — and beats 100% attribution to QA at ~100× by a factor of ten. The asymmetry compounds with each layer crossed.

The escape from Trap 3 is **explicit compounding accounting**: model the value as a recurring annuity rather than a one-time saving. The right way to budget for static-analysis investment is the way you budget for insurance premiums — yearly, against an actuarially-modelled risk that will materialise unevenly across years.

### Trap 4 (and its escape) — "1 dollar prevented = 1 dollar earned" is unbooked

A finance reviewer who has read this far will pose the sharpest objection: *the equivalence "a dollar prevented is a dollar earned" is true in principle and false in accounting*. Avoided cost does not show up as revenue. It does not fund growth. It does not appear on the income statement as a line item. A CFO is right to discount any business case that rests on it as primary value.

This is correct, and the philosophy must answer it directly rather than wave at it. The honest answer has three parts:

**Part 1 — what avoided cost actually does.** Avoided cost shows up as **freed engineering capacity**, which has two bookable destinations: either it converts to product output (more features shipped per dollar of engineering payroll, raising revenue per FTE — bookable as gross-margin improvement and as faster time-to-revenue per dollar invested), or it translates to lower headcount required for the same output (bookable directly as opex). The conversion is not automatic — it requires an explicit decision by engineering leadership about how to deploy reclaimed capacity — but the conversion path is real and standard. The McKinsey *Developer Velocity Index* research ([McKinsey TMT insights archive](https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights)) is the canonical articulation of this conversion at company scale.

**Part 2 — risk-adjusted return reframing.** The investor frame in [`philosophy.md`](philosophy.md) does not rest on dollar-for-dollar cost-substitution. It rests on **risk reduction shifting the expected-return distribution** — Markowitz's foundational result that risk-adjusted return is the relevant valuation quantity, not raw return. Static-analysis investment lowers the variance of CFR (fewer customer-disclosable bugs reaching production) without lowering expected throughput; for an investor evaluating a portfolio company, that is a Sharpe-ratio improvement, which is bookable in the discount rate the investor applies. Lower discount rate → higher present value → higher valuation. This is the rigorous form of "1 dollar prevented = 1 dollar earned": not in the income statement, but in the multiplier the income statement is multiplied by.

**Part 3 — the actuarial frame.** The defensive industries that have survived this objection longest — insurance, public health, aviation — book avoided cost via expected-value reasoning, not literal cost-substitution. An insurance company books "expected losses prevented" as a present-value annuity discounted at the firm's cost of capital. Static-analysis investment is structurally identical: a recurring premium paid in engineering hours, against a stochastic loss (CFR events) that will materialise unevenly across years. The right financial treatment is to amortise the investment as an insurance premium and the avoided losses as a contingent-liability reserve — both of which *are* booked under standard GAAP / IFRS, just not in the line items engineers are familiar with.

The answer to the CFO is therefore: avoided cost is real value, it is bookable, and the booking mechanisms are well-established in industries that have already had this argument. What is missing in software organisations is not the financial machinery but the *measurement* — which is exactly what [`cicd-impact/`](README.md) and [`CLAIMS.md`](../CLAIMS.md) build.

## 5. What compounds value

The activities that produce the most value over a long horizon share a pattern: they are *productive of more value*. Technical literature converges on four mechanisms:

| Mechanism | Source | How it shows up in software | How it shows up in static analysis |
| :--- | :--- | :--- | :--- |
| **Network effects** | Metcalfe's law (1980); Reed's law (1999) | Stars, downloads, contributors | Each merged upstream PR is a permanent backlink and reference customer |
| **Path dependence** | Brian Arthur (1989) on increasing returns | A codebase's quality compounds; tech debt also compounds | A rule catching a bug today prevents a class of similar bugs tomorrow; without the rule, the codebase normalises the anti-pattern |
| **Knowledge accumulation** | Polanyi (1958) on tacit knowledge; Nelson & Winter (1982) on organisational routines | Documented benchmarks, runbooks, ADRs | Every audit, every benchmark, every claim with evidence (e.g. [`CLAIMS.md`](../CLAIMS.md)) raises the cost of dethroning the artifact |
| **Reputation** | Akerlof (1970) on lemons; modern reputation economics | Brand strength of a tool / library | A rule that catches bugs in popular OSS becomes the rule everyone cites — see *Wild Findings* track in the promotion initiative |

The combinatorics matter: an investment that triggers two of these is roughly four times more valuable than one that triggers one (the effects compound multiplicatively, not additively). Static-analysis investment can trigger all four:

1. **Network effects** — the more popular projects use a rule, the more discoverable it becomes.
2. **Path dependence** — early adoption of strict rules keeps the codebase free of patterns that would later be expensive to remove.
3. **Knowledge accumulation** — every benchmark and every claim becomes a citation surface.
4. **Reputation** — the rule becomes "the rule that caught the bug in `<famous OSS repo>`".

This is why the canonical advice on engineering investment is not "ship features", but "build assets that ship features for you". A strong static-analysis posture is one such asset.

## 6. The chain — from ruling systems to a single ESLint rule

We can now trace the chain top-to-bottom in one direction, and bottom-to-top in the other. The chain is mechanical: each step is a strict consequence of the one above. The two ruling systems from §0 — capitalism and humanism — both feed the top of the chain, and both are honoured at every level below.

```text
                       CAPITALISM            ╳            HUMANISM
                  (allocative efficiency)         (dignity, agency, flourishing)
                            │                              │
                            └─────────────┬────────────────┘
                                          ▼
                          Individuals seek economic security
                              AND meaningful work
                              (humanist + capitalist tests)
                                          │
                                          ▼
                       Specialisation lets individuals produce
                              more than they consume
                                          │  (Smith — division of labour)
                                          ▼
                   Companies coordinate specialised work
                          at lower cost than markets do
                                          │  (Coase — theory of the firm)
                                          ▼
                  Investors fund companies based on risk-adjusted
                                expected returns
                                          │  (Markowitz; Buffett/Munger
                                          │   intrinsic value + moats)
                                          ▼
                  Risk reduction at any stage is value creation
                       (a dollar prevented = a dollar earned)
                                          │  (insurance principle;
                                          │   Buffett margin of safety)
                                          ▼
                    The cheapest place to reduce engineering risk
                          is the earliest defensive layer
                                          │  (~10× per layer empirical;
                                          │   Boehm, IBM SSI, NIST 2002,
                                          │   McConnell, Brooks; with disclosure
                                          │   tier as separate long-tailed
                                          │   distribution per IBM/Verizon)
                                          ▼
                  Static code analysis is the earliest defensive
                            layer in the SDLC
                                          │  (Dijkstra: the only layer that
                                          │   can rule out bug classes by
                                          │   construction)
                                          ▼
                       Each ESLint rule reduces a quantum of
                            engineering risk per run
                            AND restores cognitive budget
                                to the humans using it
                              (Beck, Hoare, Pink)
```

The chain is unbroken in both directions. Every ESLint rule in this monorepo is, properly understood, a small purchase of risk-reduction value funded by investors (capitalism), deployed at the cheapest defensive layer of the SDLC (Buffett's margin-of-safety principle), in service of a company that exists to coordinate specialised work (Coase), in service of individuals who seek both economic security AND meaningful work (the dual humanist + capitalist test), in service of the broader project of human flourishing.

This sounds grandiose. It is also literally true, and the literature underpinning each step is well-established. The reason organisations under-invest in static analysis is not that the chain is invalid — the chain is rigorously valid in both the capitalist and humanist frames — but that *the measurement infrastructure to make the chain visible doesn't exist by default*. As Munger would put it: the incentives to record price are present everywhere, but the incentives to surface intrinsic value have to be deliberately built.

## 6.5 Hostile review — what survives, what's defended, what's open

A philosophy that doesn't survive contact with a hostile reader is not load-bearing. This section names the strongest attacks any informed skeptic — engineering manager, CFO, board director, academic — will mount, and the response for each. Where the response is solid, it's marked **defended**; where the philosophy concedes a real gap, it's marked **open** with an honest caveat. Per [`CLAIMS.md`](../CLAIMS.md)'s "Honest losses (preserved)" discipline, preserved gaps are credibility multipliers, not weaknesses.

### Attack 1 — "The Buffett/Munger frame is rhetorical, not mechanical."

> *"You're trading on Buffett's reputation. Capital allocation in markets and engineering investment in a company are different problems."*

**Defended.** §1.1 establishes the structural isomorphism explicitly: a business is a stream of risk-adjusted future cash flows; a codebase is a stream of risk-adjusted future feature deliveries that themselves convert to cash flows. The shared mathematical object — a discounted-cash-flow valuation under risk-adjusted return ([Markowitz 1952](https://www.jstor.org/stable/2975974)) — applies mechanically. Attack survives only if the reader denies the underlying NPV-under-risk-adjustment framework, which would invalidate corporate finance itself.

### Attack 2 — "The cost ratio is asserted, not proved."

> *"You claim a 1:10:100:1,000:10,000+ cost ratio across defensive layers. Show your work."*

**Defended (with explicit caveats).** Each layer is empirically anchored to a primary source: lint→unit test (Capers Jones, ~30× field-vs-unit-test); unit→QA (Boehm 1981); QA→production rollback (NIST 2002); production→disclosure (IBM Cost of a Data Breach annual; Verizon DBIR). The first four tiers converge on roughly an order-of-magnitude per layer. The fifth tier (disclosure) is **explicitly labeled long-tailed and incident-specific**, not a clean continuation. A skeptic who pushes harder is told: it's the empirical literature's range, not our extrapolation, and the calculator's sensitivity sweep already varies the multiplier.

### Attack 3 — "'A dollar prevented is a dollar earned' is unbooked. CFOs care about the income statement."

> *"You can't fund growth with avoided cost. It's not revenue."*

**Defended in §4 Trap 4.** Avoided cost converts to (a) freed engineering capacity bookable as gross-margin improvement or opex reduction, (b) variance reduction in CFR which is bookable in the discount rate (Markowitz / Sharpe-ratio framework), and (c) actuarial-style amortisation under standard GAAP/IFRS (insurance-premium analogue). The financial machinery is well-established in industries with longer experience of defensive-investment accounting (insurance, public health, aviation); software is just late.

### Attack 4 — "The CFR feedback loop is intuitive but you haven't proved causation."

> *"You're correlating CI duration with CFR via DORA. Correlation isn't causation."*

**Defended via Bradford Hill criteria; controlled-experiment gap explicitly open.** A controlled randomised experiment at the org level (the gold standard) has not been published and is operationally hard to run. But "no controlled trial" is not the same as "no causal evidence" — every other defensive-engineering domain that lacks RCTs (epidemiology, aviation safety, structural engineering) uses [Bradford Hill's nine criteria](https://en.wikipedia.org/wiki/Bradford_Hill_criteria) (Hill 1965) to infer causation from observational evidence. Applied to the slow-CI → high-CFR claim:

| Bradford Hill criterion | What it asks | Status for slow-CI → high-CFR |
| :--- | :--- | :--- |
| **1. Strength of association** | Is the effect size large? | ✅ DORA 2024 reports **5× developer-time-per-feature gap** between top and bottom quartile orgs by CI duration. Not a marginal effect. |
| **2. Consistency** | Replicated across studies, populations, methods? | ✅ DORA programme reproduces the link annually (2014–2024); independently corroborated by CircleCI 2023 State of Software Delivery (3.7× ship-frequency gap at the 10-min cliff) and GitLab DevSecOps Survey 2024 (60% of devs cite CI as significant productivity drag). |
| **3. Specificity** | Does the cause specifically produce this effect? | ⚠️ Partial. Slow CI is not the *only* cause of high CFR; review depth, test quality, and team experience also matter. We say so explicitly in [`philosophy.md`](philosophy.md). |
| **4. Temporality** | Cause precedes effect? | ✅ DORA's longitudinal cohort tracks orgs that *changed* CI duration and the CFR change followed. Direction confirmed. |
| **5. Biological gradient (dose-response)** | More cause → more effect? | ✅ DORA's quartile data is a step-function dose-response: each tier of CI duration ships less and has higher CFR, monotonically. CircleCI's 10-min cliff is a sharper version of the same gradient. |
| **6. Plausibility** | Is there a mechanism? | ✅ Reinertsen 2009 chapter 3 supplies the queueing-theoretic mechanism (large batches amplify variance). M/M/1 (Kleinrock 1975) supplies the wait-amplification mechanism. The mechanism is *not* hand-waving; it's textbook queueing. |
| **7. Coherence** | Consistent with what's already known? | ✅ Coherent with Brooks's law (large batches harder to integrate), with cognitive-tax research (Mark/Gloria/Klocke 2008, longer waits → more task-switching → more errors), and with security alert-fatigue literature (more noise → less signal). No published finding contradicts the loop. |
| **8. Experiment** | Direct experimental evidence? | ❌ **OPEN.** This is the criterion that's not met. No published org-level RCT randomising CI duration. The honest gap. |
| **9. Analogy** | Similar effects in similar domains? | ✅ Identical effect documented in manufacturing (Reinertsen draws this analogy explicitly), in supply-chain (Bullwhip effect), and in queueing networks (Little's law extensions). The pattern is structural, not software-specific. |

**Verdict:** 7 of 9 Bradford Hill criteria fully met, 1 partial, 1 open. By the standard the rest of defensive engineering lives by, this is **strong observational evidence for causation, with one explicitly-named gap**. Compare: aviation safety improvements rest on fewer than 7 of 9 criteria for many specific interventions, and we still trust them. A skeptic who demands criterion 8 is right to demand it; the philosophy concedes that gap and continues to recommend the intervention based on the other 7. This is exactly how a hospital decides to recommend statins from observational data while a Phase-3 trial is still running — you do not get to wait when the evidence on every criterion *except* the controlled trial is consistent and the cost of waiting is real.

**Closing the gap.** A multi-org partnership running an A/B-style intervention on CI duration with measured CFR effect over 12–24 months would close criterion 8. Tracked as Open item #1 below; would move this attack from "Defended via Bradford Hill" to "Defended via direct evidence." Until then, the philosophy is honest about what kind of evidence it rests on and what kind it lacks.

### Attack 5 — "The capitalism + humanism framing in §0 is decorative."

> *"Strip §0 and the rest still stands. Why is it there?"*

**Partially defended, partially conceded.** §0 is load-bearing for *one* specific argument: that a value philosophy satisfying only the capitalist test produces engineering cultures that grind people down (humanist failure → attrition → defunding via talent flight) and one satisfying only the humanist test produces cultures that fail in the market (capitalist failure → defunding via insolvency). This dual-failure-mode argument doesn't appear elsewhere in the doc; it's what §0 contributes uniquely. **Concession:** the framing could be tighter. A reader who reads §0 as "two systems, both important, neither dominant" and skips the dual-failure-mode argument has not lost much. Future revisions should foreground the dual-failure-mode mechanic more explicitly.

### Attack 6 — "Your niche table in `philosophy.md` makes specific recommendations without specific data per niche."

> *"You give a 1.5–4% lint-budget range for fintech. Where's the per-niche empirical study?"*

**Open and explicitly labeled.** The niche table in [`philosophy.md`](philosophy.md) anchors investor-metric and CFR-tolerance claims to industry-leading sources (Bessemer, OpenView, a16z by sector, Verizon DBIR by industry slice, IBM Cost of a Data Breach by industry). The *budget recommendations* are derived by combining those niche characteristics with the cross-niche cost-ratio framework (Attack 2), not from per-niche budget studies — which to our knowledge do not exist as published primary sources. The recommendations are therefore **synthesised**, not measured. A reviewer who plugs them into the calculator and substitutes their own org's measured numbers will get a tighter answer; the niche presets are a starting point, not a substitute for measurement.

### Attack 7 — "You're recommending an ESLint monorepo while making the philosophical case for it. Conflict of interest."

> *"This is just dressed-up marketing for `@interlace/eslint-plugin-*`."*

**Conceded transparently and addressed structurally.** The conflict is real: the philosophy is published by the same project it argues for. The structural mitigations: (a) the framework is org-agnostic and forkable — anyone can apply it to evaluate any analyzer, including competitors; (b) [`benchmarks/`](../benchmarks/) publishes precision/recall *including against competing analyzers*, with honest losses preserved in [`CLAIMS.md`](../CLAIMS.md); (c) the "What 'high-end' means" section in [`philosophy.md`](philosophy.md) gives the buyer specific quantitative thresholds the buyer can apply to *any* analyzer, not just ours. A reader skeptical of the conflict should run the framework against several analyzers — including ours — and let the numbers decide. That is the only honest answer.

### Open items, by priority

These are the gaps the philosophy concedes are not yet closed. Each is tracked here so future revisions know what to attack first.

| # | Open item | What would close it | Priority |
| :- | :--- | :--- | :- |
| 1 | CFR feedback loop has correlation, not controlled-experiment causation (Attack 4). | A multi-org controlled study on CI-duration interventions and CFR effect. Operationally hard. | Medium — analytical model is consistent with all observational evidence; closing this would harden, not reverse, the conclusion. |
| 2 | Per-niche budget recommendations are synthesised, not measured (Attack 6). | A primary-source study of static-analysis budget vs CFR / velocity outcomes by industry. Not yet published. | Medium — calculator already supports per-org measurement override. |
| 3 | The `S = 23` upper bound (Mark/Gloria/Klocke 2008) is from general office-interruption studies, not CI-specific. | A CI-specific replication of the recovery-time study. | Low — the piecewise S already discounts the upper-band aggressively; sensitivity sweep covers the residual uncertainty. |
| 4 | Capitalism-vs-humanism §0 framing's dual-failure-mode mechanic is implicit, not foregrounded. | A short rewrite of §0 to lead with the dual-failure mechanic. | Low — affects clarity not correctness. |
| 5 | Rule-level economic case shipped at 17/20: the 3 JWT rule docs (`no-algorithm-none`, `no-algorithm-confusion`, `require-expiration`) do not currently carry the value-case section. Investigation found no local sync script that reverts them; the cause is presumed to be IDE-side (markdownlint auto-format, editor auto-save with strict template enforcement) or an intentional reversion. The existing Husky `pre-commit` hook only runs `oxlint` and tests, not docs sync. | Either: (a) configure the IDE-side toolchain to allow the new section header in JWT files specifically, (b) integrate a sync script that writes the value-case from a templated source, or (c) accept 17/20 as v0 and revisit when the cause is identified. | Low — JWT rules already display their CWE/CVE/severity prominently in their existing structure; the value-case section is additive context, not load-bearing for the rule's correctness. |

The discipline of naming open items publicly is itself part of the philosophy: it operationalises Munger's "show me the incentive" rule against the writer of the philosophy. A philosophy that hides its open items rewards the writer's reputation; a philosophy that publishes them rewards the reader's skepticism. The latter is the only kind that compounds.

## 6.6 Falsifiable predictions — what this philosophy claims will happen

A philosophy that doesn't make checkable predictions is folklore. This section commits the philosophy to specific, time-bound, falsifiable claims. Each prediction is a **bet** — if any of them turns out empirically wrong over the stated horizon, the part of the philosophy that produced it must be revised. This is the strongest form of intellectual honesty available to a documentary work: skin in the game, with public stakes.

The predictions are listed with their **horizon** (how long until we expect them checkable), the **specific data signal** that would falsify them, and the **part of the philosophy at stake** if they fail.

### Prediction 1 — Static-analysis investment will become a standard line item in M&A tech-DD by 2028

**Claim.** By end of 2028, ≥ 50% of published M&A technical-due-diligence frameworks for software-acquisition deals will include static-analysis posture as a discrete scored dimension (separate from "test coverage" or "code quality" generically).

**Horizon.** 2026–2028 (3-year window).

**Falsification signal.** A 2027–2028 survey of published tech-DD frameworks (from major audit firms, tech-DD specialists, M&A advisors) shows < 50% include static-analysis as a discrete dimension. Tracked via the M&A specialist publications and Big-4 audit firm methodology updates.

**At stake if wrong.** §investor-frame's M&A-diligence claim ([`philosophy.md`](philosophy.md)). If wrong, the M&A leverage point is overstated and the niche-budget multipliers for cybersecurity / fintech / healthtech (entries with the highest weights) need adjustment.

### Prediction 2 — Orgs at the bottom quartile of static-analysis maturity will show 2–5pp higher CFR than top-quartile peers, controlling for size

**Claim.** A future DORA report (2025 or later) or independent replication will, when it specifically isolates static-analysis posture, show that bottom-quartile orgs on that dimension carry 2–5 percentage points higher CFR than top-quartile orgs at comparable team size, deploy frequency, and tech stack.

**Horizon.** 2026–2027 (DORA reports plus 1–2 academic replications).

**Falsification signal.** A published study with ≥ 100 orgs in the cohort, controlled for the relevant confounders, finds the static-analysis-CFR gap is < 1pp or > 8pp. (The 2–5pp window is narrow on purpose; either direction of failure invalidates the prediction.)

**At stake if wrong.** Axis 3 (Deliverability) and the CFR feedback loop in [`philosophy.md`](philosophy.md). A < 1pp gap means static analysis doesn't materially move CFR; a > 8pp gap means we've understated its effect. Either way, the niche-budget multipliers for `cfr_severity_multiplier` need recalibration.

### Prediction 3 — Sub-second static analyzers will displace > 5-second analyzers in JavaScript/TypeScript ecosystems by 2028

**Claim.** By end of 2028, the median JavaScript / TypeScript ESLint-class analyzer adopted in new projects (measured by npm download share for projects created post-2026) will run < 1 second per file in the editor loop; analyzers with median > 5s per-file editor latency will fall to < 10% download share.

**Horizon.** 2026–2028 (npm download stats are continuously available; new-project share takes ~2 years to stabilise).

**Falsification signal.** End-of-2028 npm download stats for new projects show > 5s analyzers maintaining > 25% share, OR < 1s analyzers stalled below 50% share.

**At stake if wrong.** The feedback-loop hierarchy framework in [`philosophy.md`](philosophy.md). If wrong, latency may not dominate as a buyer-decision criterion the way the philosophy claims; the quality-vs-latency framing needs revision.

### Prediction 4 — A controlled-experiment closing Bradford Hill criterion 8 will be published within 5 years

**Claim.** By 2030, a peer-reviewed or industry-published controlled-experiment study (org-level A/B or quasi-experimental cohort with random assignment) on CI-duration interventions and CFR effect will appear, replicating the observational DORA findings.

**Horizon.** 2026–2030 (5-year window).

**Falsification signal.** No such study by end-of-2030, OR a published study that finds *no* effect, OR an effect direction opposite the observational data.

**At stake if wrong.** Attack 4 in §6.5. If wrong, the CFR feedback loop remains permanently in observational territory; the hostile-review verdict has to admit the criterion-8 gap is structural rather than temporary.

### Prediction 5 — Niche-budget recommendations will be refined (not reversed) by primary research

**Claim.** Within 5 years, primary-source studies on per-niche static-analysis-budget vs CFR / velocity outcomes will be published; when they are, the philosophy's niche-budget recommendations will land within ±50% of the empirical optimum for ≥ 6 of the 10 niches in the table.

**Horizon.** 2026–2031.

**Falsification signal.** Published primary research that places empirical optima > 50% off the philosophy's recommendation in ≥ 5 niches, OR places fintech / healthtech / cybersecurity *below* B2C / gaming on budget — the niche ordering in the philosophy is the strong claim; the absolute numbers are weaker.

**At stake if wrong.** The niche-budget derivation methodology in [`philosophy.md`](philosophy.md). If the *ordering* is wrong, the four-factor formula is wrong (likely the CFR-severity or disclosure-cost multipliers); if only the *magnitudes* are wrong, the formula is right and the multipliers need recalibration.

### Prediction 6 — High-precision analyzers will outperform high-recall analyzers in adoption metrics

**Claim.** Among ESLint-class analyzers introduced 2025–2028, those with documented precision ≥ 95% will show median 5-year npm download counts 2–5× higher than those with precision in the 80–94% range, controlling for recall and ecosystem coverage.

**Horizon.** 2030–2033 (need 5-year adoption data).

**Falsification signal.** End-of-2033 npm cohort comparison shows precision-95+ and precision-80-94 analyzers within ±50% on download counts, or the relationship reverses.

**At stake if wrong.** The alert-fatigue argument in [`philosophy.md`](philosophy.md) feedback-loop hierarchy. If wrong, precision is not as decisive as the philosophy claims; a more subtle quality-mix model is needed.

### Prediction 7 — Customer-disclosure cost in healthtech and fintech will remain the long-tail outlier (10,000×+) through 2030

**Claim.** Annual IBM Cost of a Data Breach reports through 2030 will continue to rank healthcare and financial services as the 1st or 2nd most expensive industries per breach, at least 10× the cost of the cheapest tracked industry.

**Horizon.** 2026–2030 (annual data, 5 reports).

**Falsification signal.** Three or more annual reports in this window show healthcare or financial services dropping below 5× the cheapest industry, OR drop out of the top-3.

**At stake if wrong.** The fifth-tier ("disclosure") of the cost-by-defensive-layer table in [`philosophy.md`](philosophy.md). If wrong, the long-tail framing is overstated; budget recommendations for healthtech/fintech (currently the highest in the niche table) need to come down.

### How predictions are tracked

Each prediction is dated and signed (the publication date of this document version). When a prediction's horizon arrives, the conclusion is logged in this document with one of:

- ✅ **Confirmed** — the prediction held; the part of the philosophy at stake is corroborated.
- ❌ **Falsified** — the prediction failed; the philosophy is revised in the named place. The original prediction text is preserved; the revision is added as a dated annotation.
- ⚠️ **Partial** — the prediction is partially confirmed (e.g. direction right, magnitude off); the precision of the claim is the lesson.
- ⏸️ **Unresolved** — the data needed to check the prediction has not been published; the prediction's horizon is extended once.

This is the same discipline applied to any honest forecasting practice (Tetlock's *Superforecasting*, the Good Judgment Project, central-bank forecast accountability). It is what separates a philosophy that compounds credibility over time from one that evaporates after the first contradiction.

## 6.7 When this philosophy does NOT apply (scope limits)

A philosophy that claims to apply universally is suspect. This one does not. There are well-defined regimes where the budget recommendations, the niche table, and even the central thesis ("static analysis is the cheapest defensive layer") either fail to apply, apply weakly, or apply differently. Naming those regimes is part of the discipline — it prevents the strongest cheap-shot ("you're saying every team needs 3% of payroll on lint") and keeps the philosophy useful to the readers it actually serves.

The scope limits, in order of how often they're violated:

### Limit 1 — Solo developer or 2–4-person team

**Where the philosophy weakens:** the headline `$/CI minute` formula scales linearly with `D` (active developers). At D = 1, the direct-waste term collapses to a single developer's wage × pipeline minutes; the cognitive-tax term still applies if pipelines run long, but the budget *recommendation* (1–4% of engineering payroll) is misleading at this scale because the absolute number is tiny. A 2-person team running this calculator will get a $2k–$5k annual headline (see [`dogfood-case-study.md`](dogfood-case-study.md)); a 1.5%-of-payroll lint budget at that scale is $30–$75/year, which is meaningless.

**What still applies:** the feedback-loop hierarchy and the per-tier cost ratio still hold — a small team should still adopt fast lint and pre-commit hooks, because the *time-saved-per-developer* logic is unchanged. What doesn't apply is the *budget-as-percentage* framing.

**Use the framework anyway?** Yes, for the unit-cost intuition. Skip the budget-percentage recommendations.

### Limit 2 — Throwaway prototype or proof-of-concept

**Where the philosophy weakens:** if the codebase has a known short lifespan (< 3 months until rewrite or shutdown), the compounding mechanisms (codebase quality, audit posture, M&A multiplier) don't have time to compound. The investment-as-annuity framing in [§4 Trap 3](#trap-3--time-lag-vs-budget-cycle) requires multi-year horizons; a proof-of-concept doesn't have that horizon.

**What still applies:** if the prototype contains user-facing security-relevant code (auth, payments, data ingestion), the cost-ratio argument still holds — a single missed CWE in a "prototype" that ships to a customer is a real disclosure event. The lifespan exemption is only for code that genuinely never reaches a customer surface.

**Use the framework anyway?** Only for security-relevant rule families. Skip everything else.

### Limit 3 — Internal-only tools with single-user audience

**Where the philosophy weakens:** the investor-frame argument (M&A diligence, audit posture, churn-driven valuation) collapses for tools that have no external customer surface. A scripts-and-dashboards repo used by ten internal analysts has no churn metric; its CFR has no regulatory dimension; its quality has no third-party-perceived component.

**What still applies:** the internal-developer experience axis (Velocity, Axis 2 in [`philosophy.md`](philosophy.md)) still applies — slow internal tools waste internal-engineering time the same way slow external tools do. The Money axis applies. The Deliverability axis weakens but doesn't disappear (internal tools can still cause data-corruption events).

**Use the framework anyway?** Yes, but anchor the argument to Velocity + Money, not Deliverability.

### Limit 4 — Regulated industry with mandated tooling stack

**Where the philosophy fails:** if the industry mandates specific analyzers (e.g. avionics under DO-178C requires specific certified static-analysis tools; medical devices under IEC 62304 similarly), the *choice* of analyzer is not yours and the niche-preset cost-benefit recommendations are moot. The mandate is a non-negotiable cost line.

**What still applies:** the framework still tells you the **cost of slow CI** — even certified analyzers have latency that affects the feedback loop. You can still measure `$/CI minute` and use it to advocate for *faster* CI within the certified-tool envelope.

**Use the framework anyway?** Yes for the CI-cost argument; no for the analyzer-selection argument.

### Limit 5 — Codebase nearing planned end-of-life

**Where the philosophy weakens:** if the codebase has a documented sunset within ~12 months, multi-year compounding doesn't apply. Investment in the static-analysis budget should fall to maintenance-only levels regardless of niche.

**What still applies:** the cost-of-slow-CI argument applies as long as the codebase is actively shipping. The investment-budget argument doesn't — you're maintaining, not investing.

**Use the framework anyway?** For the operational `$/CI minute` while the repo is alive; not for budget recommendations.

### Limit 6 — Research or experimentation codebases (data science, ML training pipelines)

**Where the philosophy weakens:** the failure-rate term `F` is a noisy signal in research codebases — *intentionally* failing experiments are normal and shouldn't be counted as "rework". The `count_cancelled_as_failure` policy switch in [`inputs.template.yml`](inputs.template.yml) handles part of this, but the deeper issue is that "rework" assumes intent-to-ship, which doesn't apply to exploratory code.

**What still applies:** velocity (researchers also feel the inner-loop friction) and money (their time costs the same). Deliverability is mostly N/A for pre-publication research code.

**Use the framework anyway?** Set `count_timed_out_as_failure: false` in addition to cancellations; treat the headline as a Velocity-only number.

### Limit 7 — Pre-revenue startups in the seed-or-earlier stage

**Where the philosophy weakens:** the investor-frame argument depends on having a valuation that can be moved by CFR and capital efficiency. A seed-stage company is being valued on team and thesis, not metrics. A 0.1pp improvement in churn-rate doesn't move the valuation needle yet.

**What still applies:** the velocity argument applies *more* strongly at seed stage — the constraint is shipping speed for product-market-fit-discovery, and any CI friction directly trades against PMF iteration cycles. The lint-budget recommendation should still be the niche-default, but the *justification* shifts from "reduces CFR / improves audit posture" to "preserves PMF iteration speed."

**Use the framework anyway?** Yes, but reframe the argument. The Y Combinator literature (Paul Graham's [*Default Alive or Default Dead*](http://www.paulgraham.com/aord.html), [*Maker's Schedule*](http://www.paulgraham.com/makersschedule.html)) is the right anchor, not Bessemer SaaS benchmarks.

### Where the philosophy actively does **NOT** make a recommendation

The philosophy is silent on these specific questions, which is also a scope limit. The reader who wants them answered must look elsewhere:

- **Which specific ESLint rule to adopt vs. which to skip.** This is a per-codebase decision; the philosophy provides the *framework* for evaluating any analyzer ([`analyzer-evaluation-framework.md`](analyzer-evaluation-framework.md)) but does not prescribe specific rules.
- **Build-system optimisation choices** (Turborepo vs. Nx vs. pnpm workspaces vs. Bazel). These affect `T_pipeline` and `T_queue` but the philosophy is build-system-agnostic.
- **Test-pyramid composition** (unit vs. integration vs. E2E split). The cost-ratio framework places test broadly at "~10×" but does not differentiate between test types within that tier.
- **Cloud provider / runner-tier choice.** GitHub-hosted vs. self-hosted runners affect both `T_queue` and dollar cost but the philosophy treats them as input parameters, not policy recommendations.
- **Hiring vs. tooling tradeoff.** The framework can compute the unit cost of either intervention; choosing between them is a strategic decision the philosophy does not pre-empt.

### The honest summary

This philosophy applies most strongly to: **multi-engineer (≥ 5) organisations**, **with codebases that ship to external customers**, **operating on multi-year horizons**, **in industries where churn and audit posture matter for valuation**. That envelope covers most B2B SaaS, fintech, healthtech, infrastructure, marketplaces, and developer-tools companies — i.e. most of the niche table in [`philosophy.md`](philosophy.md).

It applies *partially* to small teams, throwaway prototypes, internal tools, regulated industries, sunsetting codebases, research codebases, and pre-revenue startups — usually for the velocity argument but not the investor-frame budget argument.

It does *not* apply to single-script utilities, demo-only repos, or codebases that genuinely have no customer surface and no developer-experience cost to absorb.

A reader who finds themselves outside this envelope is correct to discount the recommendations. The framework still makes the unit-cost computation available — but its prescriptive force depends on being inside the envelope.

## 7. The connection to the operational philosophy

[`philosophy.md`](philosophy.md) makes the operational case along three axes — money, velocity, deliverability — and adds the investor frame on top. With the value-philosophy chain established, the operational axes can be re-read as different *instruments* for measuring the same underlying value:

- **Money axis** measures the value via *direct* measurement: payroll dollars in, dollars out.
- **Velocity axis** measures the value via *proxy* measurement: shipping cadence as proxy for throughput.
- **Deliverability axis** measures the value via *counterfactual* measurement: incidents prevented, audits passed.
- **Investor frame** measures the value via *lagged* and *negative-space* measurement: M&A multiple, churn improvement, capital efficiency.

The four together cover all five measurement mechanisms from §2 except *eudaimonic*, which is out of scope for an engineering tool but is the upstream justification for everything else. An organisation that uses all four mechanisms in concert sees the full value of static-analysis investment; an organisation that uses only the first sees about 10% of it and systematically under-invests.

This is the deepest reason `cicd-impact/` exists: not because CI/CD optimisation matters in the abstract, but because **the absence of a visible measurement chain causes the systematic underinvestment in defensive engineering that the unbroken value chain says should be funded**. Build the chain visible, and the funding follows.

## 8. Practical commitments this philosophy implies

Stating the philosophy without acting on it would be empty. The philosophy implies concrete commitments that the rest of this monorepo follows:

1. **Every claim is mapped to evidence.** [`CLAIMS.md`](../CLAIMS.md) maps every public claim to its evidence file with a "last verified" date and a 90-day staleness gate. This is *deliberate counterfactual + lagged measurement infrastructure*.
2. **Benchmarks are first-class.** The [`benchmarks/`](../benchmarks/) folder is treated as production code: audited, versioned, regression-gated. Benchmarks are *negative-space measurement infrastructure* — they tell us what fraction of seeded bugs each rule catches.
3. **The unit cost is the unit of debate.** Every CI investment in this monorepo is debated in `$/CI minute` (see [`philosophy.md`](philosophy.md)). This is *direct measurement* applied consistently, which Goodharts in our favour: the metric becomes the target, and the target is the right one.
4. **Honest losses are preserved.** [`CLAIMS.md`](../CLAIMS.md) has a "Honest losses (preserved)" section. We document where competitors beat us. This is the *attribution-dilution* trap acknowledged in public, which builds the kind of reputation that compounds over years (mechanism §5.4).
5. **Compound effects get explicit budget.** Investments whose payoff is lagged (audit posture, codebase entropy control, reputation building via Wild Findings PRs) get explicit roadmap allocation, rather than being squeezed out by quarterly direct-value targets. This is the *Trap 3 escape* in §4.

These five commitments are how a value philosophy that says "static code analysis is hard to measure, but the value is real and compounding" translates into the day-to-day operating discipline of an engineering organisation.

## Source list

Numbered. Foundational philosophy and economics sources first; capital-allocation and software-industry sources second; modern applied sources last.

### Foundational philosophy and political economy

1. Aristotle. *Nicomachean Ethics.* (4th c. BCE) — [Stanford Encyclopedia of Philosophy entry](https://plato.stanford.edu/entries/aristotle-ethics/) · [Internet Classics Archive translation](http://classics.mit.edu/Aristotle/nicomachaen.html). Eudaimonia as the foundation of value.
2. Erasmus and the Renaissance humanist tradition (15th–16th c.) — [SEP: Renaissance humanism](https://plato.stanford.edu/entries/humanism/) · [SEP: Erasmus](https://plato.stanford.edu/entries/erasmus/). Origin of "humanism" as a frame placing human dignity at the centre.
3. Kant, I. (1785). *Groundwork for the Metaphysics of Morals.* — [SEP entry on Kant's moral philosophy](https://plato.stanford.edu/entries/kant-moral/) · [Project Gutenberg full text](https://www.gutenberg.org/files/5682/5682-h/5682-h.htm). The categorical imperative; humans as ends, not merely means.
4. Smith, A. (1776). *An Inquiry into the Nature and Causes of the Wealth of Nations.* — [Library of Economics and Liberty edition](https://www.econlib.org/library/Smith/smWN.html) · [Project Gutenberg](https://www.gutenberg.org/ebooks/3300).
5. Marx, K. (1867). *Capital, Volume I.* — [Marxists.org full text](https://www.marxists.org/archive/marx/works/1867-c1/). Use value vs exchange value distinction in its sharpest form.
6. Coase, R. (1937). *"The Nature of the Firm."* Economica. — [JSTOR DOI](https://www.jstor.org/stable/2626876).
7. Hayek, F. (1945). *"The Use of Knowledge in Society."* American Economic Review. — [Library of Economics and Liberty full text](https://www.econlib.org/library/Essays/hykKnw.html).
8. Polanyi, M. (1958). *Personal Knowledge.* — [University of Chicago Press](https://press.uchicago.edu/ucp/books/book/chicago/P/bo19722848.html). Tacit knowledge.
9. Friedman, M. (1962). *Capitalism and Freedom.* — [University of Chicago Press](https://press.uchicago.edu/ucp/books/book/chicago/C/bo36066897.html).
10. Sen, A. (1999). *Development as Freedom.* — [publisher page (Knopf)](https://www.penguinrandomhouse.com/books/167770/development-as-freedom-by-amartya-sen/). Modern statement of the Capability Approach.

### Capital allocation and value investing

11. Graham, B., & Dodd, D. (1934). *Security Analysis.* — [Wikipedia entry](https://en.wikipedia.org/wiki/Security_Analysis_(book)). Origin of intrinsic value vs market price.
12. Graham, B. (1949). *The Intelligent Investor.* — [Wikipedia entry](https://en.wikipedia.org/wiki/The_Intelligent_Investor). Margin of safety; "Mr. Market" parable.
13. Markowitz, H. (1952). *"Portfolio Selection."* Journal of Finance. — [JSTOR DOI](https://www.jstor.org/stable/2975974).
14. Akerlof, G. (1970). *"The Market for Lemons."* Quarterly Journal of Economics. — [JSTOR DOI](https://www.jstor.org/stable/1879431).
15. Buffett, W. *Berkshire Hathaway Annual Letters* (1965–present). — [Free archive at berkshirehathaway.com](https://www.berkshirehathaway.com/letters/letters.html). Recurring articulation of intrinsic value, moats, "price is what you pay; value is what you get".
16. Kaufman, P. (ed.) (2005). *Poor Charlie's Almanack: The Wit and Wisdom of Charles T. Munger.* — [Stripe Press edition](https://stripepress.com/books/poor-charlies-almanack) · [CNBC Warren Buffett Archive (annual-meeting transcripts featuring Munger)](https://buffett.cnbc.com/) · [Farnam Street curated Munger collection](https://fs.blog/charlie-munger/). "Show me the incentive and I'll show you the outcome"; mental-models latticework; compounding rule.

### Causation, counterfactuals, and systems

17. Lewis, D. (1973). *"Causation."* Journal of Philosophy. — [JSTOR DOI](https://www.jstor.org/stable/2025310). Counterfactual theory of causation.
18. Goodhart, C. (1975). *"Problems of Monetary Management."* — [Wikipedia: Goodhart's law](https://en.wikipedia.org/wiki/Goodhart%27s_law). Origin of the law.
19. Nelson, R. R., & Winter, S. G. (1982). *An Evolutionary Theory of Economic Change.* — [Harvard University Press](https://www.hup.harvard.edu/books/9780674272286).
20. Arthur, W. B. (1989). *"Competing Technologies, Increasing Returns, and Lock-in by Historical Small Events."* Economic Journal. — [JSTOR DOI](https://www.jstor.org/stable/2234208).
21. Meadows, D. (2008). *Thinking in Systems.* — [Donella Meadows Project](https://donellameadows.org/) · [Chelsea Green publisher page](https://www.chelseagreen.com/product/thinking-in-systems/).

### Software industry — engineering economics and craft

22. Brooks, F. (1975). *The Mythical Man-Month.* — [Wikipedia entry](https://en.wikipedia.org/wiki/The_Mythical_Man-Month) · [publisher page (Addison-Wesley)](https://www.informit.com/store/mythical-man-month-the-essays-on-software-engineering-9780201835953). Brooks's law; cost asymmetry of late fixes.
23. Dijkstra, E. (1969–1972). *"The Humble Programmer"* and related papers. — [E. W. Dijkstra Archive at UT Austin (free, complete)](https://www.cs.utexas.edu/~EWD/) · [The Humble Programmer (EWD340)](https://www.cs.utexas.edu/~EWD/transcriptions/EWD03xx/EWD340.html). "Testing shows the presence, not absence, of bugs"; case for formal methods and rule-based correctness.
24. Hoare, C. A. R. (1980). *"The Emperor's Old Clothes."* Turing Award lecture. — [ACM DOI](https://dl.acm.org/doi/10.1145/358549.358561) · [Free PDF mirror](https://www.cs.fsu.edu/~engelen/courses/COP4610/hoare.pdf). Simplicity as the first method of correctness.
25. Knuth, D. (1974). *"Structured Programming with `go to` Statements."* ACM Computing Surveys. — [ACM DOI](https://dl.acm.org/doi/10.1145/356635.356640). "Premature optimization is the root of all evil" (in context).
26. Wallace, J., & Erickson, J. (1992). *Hard Drive: Bill Gates and the Making of the Microsoft Empire.* — [Internet Archive scan](https://archive.org/details/harddrivebillgat00wall_0). Source for the Bill Gates 10,000× leverage quote.
27. McConnell, S. (2004). *Code Complete* (2nd ed.). — [Microsoft Press product page](https://www.microsoftpressstore.com/store/code-complete-9780735619678) · [author site](https://stevemcconnell.com/). Empirical data behind the cost-of-bug-by-stage curve.
28. Beck, K. (1999). *Extreme Programming Explained.* — [author profile](https://en.wikipedia.org/wiki/Kent_Beck) · ["Make it work, make it right, make it fast" wiki](https://wiki.c2.com/?MakeItWorkMakeItRightMakeItFast). TDD; refactoring as a first-class activity.
29. Andreessen, M. (2011). *"Why Software Is Eating the World."* — [Wall Street Journal](https://www.wsj.com/articles/SB10001424053111903480904576512250915629460) · [a16z mirror](https://a16z.com/why-software-is-eating-the-world/). Quality of software bounds the durability of every business.
30. Bezos, J. (1997, restated annually). *Amazon shareholder letter.* — [Original 1997 letter (SEC archive)](https://www.sec.gov/Archives/edgar/data/1018724/000119312598014949/0001193125-98-014949.txt) · [More recent letters at aboutamazon.com](https://www.aboutamazon.com/news/company-news/2016-letter-to-shareholders). "It's always Day 1."
31. O'Reilly, T. (2017). *WTF? What's the Future and Why It's Up to Us.* — [HarperCollins publisher page](https://www.harpercollins.com/products/wtf-tim-oreilly). "Create more value than you capture."

### Motivation, design, and craft

32. Drucker, P. (1954). *The Practice of Management.* — [Drucker Institute](https://www.drucker.institute/perspective/about-peter-drucker/). Customer-value definition; "what gets measured gets managed".
33. Pink, D. (2009). *Drive: The Surprising Truth About What Motivates Us.* — [author site](https://www.danpink.com/books/drive/) · [TED talk: The puzzle of motivation](https://www.ted.com/talks/dan_pink_the_puzzle_of_motivation). Autonomy, mastery, purpose.
34. Christensen, C., Hall, T., Dillon, K., & Duncan, D. (2016). *Competing Against Luck.* — [Christensen Institute on Jobs-to-be-Done](https://www.christenseninstitute.org/jobs-to-be-done/) · [HarperCollins publisher page](https://www.harpercollins.com/products/competing-against-luck-clayton-m-christensen). Modern Jobs-to-be-Done formulation of use-value.

### Network effects and reputation economics

35. Metcalfe, R. (1980); Reed, D. (1999). — [Wikipedia: Metcalfe's law](https://en.wikipedia.org/wiki/Metcalfe%27s_law) · [Wikipedia: Reed's law](https://en.wikipedia.org/wiki/Reed%27s_law).

### Modern primary-source venture capital writing

These are first-party essays from leading venture firms, founders' funds, and capital allocators — directly relevant to the capitalist-test framing of value, the moat concept, capital efficiency, and the engineering-excellence thesis. Treated as primary sources because they reflect how capital allocators actually evaluate engineering investments today.

#### Foundational firms and letters

36. Berkshire Hathaway. *Annual letters to shareholders* (1965–present, free). — [Letters archive](https://www.berkshirehathaway.com/letters/letters.html). Primary-source canon for intrinsic-value, margin-of-safety, and moat concepts.
37. CNBC Warren Buffett Archive. Berkshire Hathaway annual-meeting transcripts and clips featuring Munger and Buffett. — [buffett.cnbc.com](https://buffett.cnbc.com/).
38. Farnam Street (fs.blog). Curated archive of Charlie Munger's writings, mental models, and Berkshire-era commentary. — [Munger collection](https://fs.blog/charlie-munger/) · [Mental-models index](https://fs.blog/mental-models/).
39. Stripe Press. Curated republications of foundational business and engineering classics. — [Stripe Press catalogue](https://press.stripe.com/). Notable for *Poor Charlie's Almanack* edition (entry 16) and other engineering-economics canon.

#### Andreessen Horowitz (a16z)

40. Andreessen, M. (2011). *"Why Software Is Eating the World."* — [a16z full text](https://a16z.com/why-software-is-eating-the-world/) · [WSJ original](https://www.wsj.com/articles/SB10001424053111903480904576512250915629460).
41. Andreessen Horowitz. *Article archive.* — [a16z.com](https://a16z.com/) · [DevTools category](https://a16z.com/category/devtools/) · [Company-building category](https://a16z.com/category/companybuilding/). Operator-investor essays directly relevant to engineering productivity and capital allocation.

#### Sequoia Capital

42. Sequoia Capital. *"Adapting to Endure"* (May 2022). — [Article](https://www.sequoiacap.com/article/adapting-to-endure-perspective/). Capital-efficiency framework that crystallised the post-ZIRP investor lens; relevant to the §0 capitalist test and to [`philosophy.md`](philosophy.md) §investor-frame.
43. Sequoia Capital. *Perspectives archive.* — [Sequoia article archive](https://www.sequoiacap.com/article-category/perspective/) · [Founder companion content](https://articles.sequoiacap.com/). Founder + engineering-excellence essays.

#### Y Combinator and the Paul Graham canon

44. Graham, P. *Essays archive.* — [paulgraham.com](http://www.paulgraham.com/articles.html). The full canon of YC-era essays. Most relevant to this philosophy: *[Default Alive or Default Dead?](http://www.paulgraham.com/aord.html)* (capital efficiency at early stage); *[Maker's Schedule, Manager's Schedule](http://www.paulgraham.com/makersschedule.html)* (the cognitive-cost argument that underpins our piecewise `S` term); *[How to Make Wealth](http://www.paulgraham.com/wealth.html)* (the leverage thesis Bill Gates also articulates in entry 26).
45. Y Combinator. *Library and Startup School.* — [YC Library](https://www.ycombinator.com/library) · [Startup School](https://www.startupschool.org/). Founder-stage primary sources on capital efficiency and engineering investment.
46. Altman, S. *"Startup Playbook"* and personal essays (legacy YC era). — [Sam Altman essays](https://blog.samaltman.com/) · [Startup Playbook (YC)](https://playbook.samaltman.com/).

#### Operator-investor blogs (Benchmark, USV, First Round, Greylock, Initialized, Bessemer, OpenView)

47. Gurley, B. (Benchmark). *"Above the Crowd."* — [abovethecrowd.com](https://abovethecrowd.com/). Burn-multiple, capital-efficiency, and unit-economics writing that shaped how late-stage tech valuations are debated.
48. Wilson, F. (Union Square Ventures). *AVC.* — [avc.com](https://avc.com/). The longest continuously-running operator-investor blog (since 2003); deep on network effects, SaaS metrics, and engineering-driven moats.
49. First Round Capital. *First Round Review.* — [review.firstround.com](https://review.firstround.com/). Long-form interviews with engineering leaders and operator-investors; the engineering-excellence canon for the operator-investor frame.
50. Greylock Partners. *Greylock perspectives.* — [greylock.com/insights](https://greylock.com/insights/) · [Reid Hoffman's site](https://www.reidhoffman.org/). Reid Hoffman's *Blitzscaling* lens, and Sarah Guo / Sarah Tavel essays on AI-era engineering.
51. Initialized Capital / Garry Tan. *Public writing.* — [initialized.com](https://initialized.com/) · [Garry Tan personal](https://garry.posthaven.com/). Founder-stage capital-allocation perspective; Garry Tan is now CEO of Y Combinator.
52. Bessemer Venture Partners. *State of the Cloud (annual) and Cloud 100.* — [Bessemer Atlas (SaaS playbook + State of the Cloud)](https://www.bvp.com/atlas) · [BVP root](https://www.bvp.com/). Annual SaaS benchmark; the canonical free reference for cloud-software valuation multiples and capital efficiency benchmarks.
53. OpenView Partners. *Annual SaaS Benchmarks Report.* — [SaaS benchmarks page](https://openviewpartners.com/saas-benchmarks-report/) · [OpenView blog](https://openviewpartners.com/blog/). Rule-of-40, Magic Number, growth-vs-efficiency benchmarks; canonical for the §investor-frame numbers in [`philosophy.md`](philosophy.md).

#### Operator-investor analytics (SaaS metrics specialists)

54. Tunguz, T. *Theory Ventures (formerly Redpoint) blog.* — [tomtunguz.com](https://tomtunguz.com/). The most-cited operator analytics on SaaS efficiency, deal pacing, and engineering-productivity-as-investor-signal.
55. Stripe. *Stripe Atlas Guides.* — [stripe.com/atlas/guides](https://stripe.com/atlas/guides) · [Stripe engineering blog](https://stripe.com/blog/category/engineering). Founder-economics primer with high investor credibility; Stripe's engineering-blog content underpins operator-investor consensus on internal-tools ROI.
56. ChartMogul. *SaaS metrics resource center.* — [chartmogul.com/saas-metrics](https://chartmogul.com/saas-metrics/). Operator-grade definitions of churn, NRR, magic number — the metrics our investor frame moves.

#### Strategy consulting and investment-banking primary sources

57. McKinsey & Company. *Operations and Digital archives.* — [Operations practice](https://www.mckinsey.com/capabilities/operations/our-insights) · [McKinsey Digital](https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights) · [Tech & telecom industry insights](https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights). Originator of the 1.25–1.4× loaded-cost multiplier. The 2020 *Developer Velocity Index* paper ("Developer Velocity: How software excellence fuels business performance") is the strategy-consulting articulation of the engineering-productivity-as-business-performance link; search the TMT insights archive for the exact slug, which has been re-permalinked.
58. Bain & Company. *Insights archive.* — [bain.com/insights](https://www.bain.com/insights/). Strategy-consulting articulation of engineering-productivity ROI; search "engineering effectiveness" or "R&D productivity" within the archive.
59. Boston Consulting Group (BCG). *Insights archive.* — [bcg.com/publications](https://www.bcg.com/publications) · [Digital, technology and data capability](https://www.bcg.com/capabilities/digital-technology-data).
60. Goldman Sachs Research. *"Insights" public content.* — [goldmansachs.com/insights](https://www.goldmansachs.com/insights/). Investment-banking-side commentary on tech valuations and capital efficiency (most equity research is paywalled; this is the public-content gateway).
61. Morgan Stanley Research. *"Ideas."* — [morganstanley.com/ideas](https://www.morganstanley.com/ideas).
