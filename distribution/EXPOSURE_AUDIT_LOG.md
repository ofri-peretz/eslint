# 📈 Exposure Impact Audit Log

> **Purpose**: Historical record of all exposure impact reviews with hard data and estimations.
> **Usage**: Each `/exposure-review` run should append a new entry to this log.

---

## 🔗 Profile Links (for tracking)

| Platform              | URL                                 | Metrics to Track                 |
| --------------------- | ----------------------------------- | -------------------------------- |
| **GitHub (Org)**      | https://github.com/interlace-collie | Stars, Forks, Used By            |
| **GitHub (Personal)** | https://github.com/ofri-peretz      | Followers                        |
| **Dev.to**            | https://dev.to/ofriperetz           | Views, Reactions, Followers      |
| **npm**               | https://www.npmjs.com/~ofri-peretz  | Package downloads                |
| **npm-stat (Author)** | Dynamic (see below)                 | 3-month download trends (visual) |
| **X (Twitter)**       | https://x.com/ofriperetzdev         | Impressions, Followers           |
| **LinkedIn**          | https://linkedin.com/in/ofri-peretz | Profile views                    |

### npm-stat Author Chart (3-month lookback)

```
https://npm-stat.com/charts.html?author=ofriperetz&from=YYYY-MM-DD&to=YYYY-MM-DD
```

**Review #1 (Jan 2, 2026):**

- 📊 [npm-stat: Oct 2025 - Jan 2026](https://npm-stat.com/charts.html?author=ofriperetz&from=2025-10-02&to=2026-01-02)

---

## Review Index

| #   | Date        | Total Downloads | Articles Published | Est. Unique Users | Est. Projects | Key Event              |
| --- | ----------- | --------------- | ------------------ | ----------------- | ------------- | ---------------------- |
| 1   | Jan 2, 2026 | 7,223           | 26                 | 72-144            | 20-50         | @ThePracticalDev share |

---

## Review #1: January 2, 2026

### 📊 Hard Data

| Metric                  | Value                    | Source           |
| ----------------------- | ------------------------ | ---------------- |
| **NPM Downloads (30d)** | 7,223                    | npm API          |
| **Dev.to Articles**     | 26 published             | Publishing Queue |
| **Dev.to Views**        | 500+                     | Dev.to Dashboard |
| **GitHub Stars**        | 0                        | GitHub           |
| **X Impressions**       | 2,300 (@ThePracticalDev) | X Analytics      |

#### NPM Downloads by Package

| Package                          | Downloads | First Published |
| -------------------------------- | --------- | --------------- |
| eslint-plugin-secure-coding      | 1,881     | Dec 8, 2025     |
| eslint-plugin-vercel-ai-security | 976       | Dec 13, 2025    |
| eslint-plugin-pg                 | 696       | Dec 21, 2025    |
| eslint-plugin-browser-security   | 567       | Dec 30, 2025    |
| eslint-plugin-lambda-security    | 561       | Dec 30, 2025    |
| eslint-plugin-express-security   | 559       | Dec 30, 2025    |
| eslint-plugin-crypto             | 558       | Dec 29, 2025    |
| eslint-plugin-jwt                | 551       | Dec 29, 2025    |
| eslint-plugin-import-next        | 446       | Dec 30, 2025    |
| eslint-plugin-nestjs-security    | 428       | Dec 30, 2025    |

#### Key Download Events

| Date         | Event                         | Peak Package       | Peak Downloads |
| ------------ | ----------------------------- | ------------------ | -------------- |
| Dec 8, 2025  | First publish (secure-coding) | secure-coding      | 244            |
| Dec 14, 2025 | @ThePracticalDev share        | vercel-ai-security | 330            |
| Dec 30, 2025 | Major monorepo release        | lambda-security    | 524            |

### 📐 Estimations (Methodology v1)

Using the model from `EXPOSURE_IMPACT_REVIEW.md`:

| Estimation                | Low | High | Method                        |
| ------------------------- | --- | ---- | ----------------------------- |
| **Unique Installs**       | 72  | 144  | Total ÷ 50-100x               |
| **Active Projects**       | 20  | 50   | Based on organic trickle rate |
| **Organizations**         | 5   | 15   | Based on weekend patterns     |
| **Downloads per Article** | 277 | —    | 7,223 ÷ 26 articles           |

### 🤖 AI Agent Discovery Status

| Agent      | Test Query                     | Found? | Notes              |
| ---------- | ------------------------------ | ------ | ------------------ |
| Perplexity | "eslint sql injection node.js" | ❌     | Baseline - not yet |
| ChatGPT    | "best eslint security plugins" | ❌     | Baseline - not yet |

### 📱 Social Profile Metrics

| Platform             | Metric                 | Value | Notes           |
| -------------------- | ---------------------- | ----- | --------------- |
| **GitHub Stars**     | Total across repos     | 0     | Baseline        |
| **Dev.to Followers** | Followers              | TBD   | Check dashboard |
| **Dev.to Views**     | Total post views       | 500+  | Growing         |
| **X Followers**      | Followers              | TBD   | Check profile   |
| **X Impressions**    | @ThePracticalDev share | 2,300 | Major signal    |
| **LinkedIn**         | Connections            | TBD   | Check profile   |

### 🎯 Period Highlights

- **@ThePracticalDev share** on X with 2.3K views — major credibility signal
- **Dec 30 synchronized spike** across all 10 packages — confirms ecosystem adoption
- **26% of 101 articles published** — foundation phase complete
- **Weekend downloads (100-200/day)** suggest real organic adoption starting

### 🔗 Ecosystem PR Campaign (Jan 2, 2026)

| Target             | PR                                                               | Status    | Notes                           |
| ------------------ | ---------------------------------------------------------------- | --------- | ------------------------------- |
| **awesome-eslint** | [#253](https://github.com/dustinspecker/awesome-eslint/pull/253) | ✅ Open   | Awaiting review                 |
| **node-postgres**  | [#3575](https://github.com/brianc/node-postgres/pull/3575)       | ❌ Closed | Rejected as "AI-generated spam" |

**Strategy Docs:** See `distribution/AI_DISCOVERY_STRATEGY.md` for full PR execution log.

### 📝 Notes for Next Review

- Watch for AI agent discovery (expect 2-4 weeks after article indexing)
- Track star:download ratio (currently 0:7,223, target 1:2,000 in 3 months)
- Monitor if @ThePracticalDev shares again (algorithm boost)
- Next milestone: 50 articles published
- **Follow up on awesome-eslint PR #253 status**

---

## Template for Future Reviews

```markdown
## Review #N: [DATE]

### 📊 Hard Data

| Metric                  | Value | Change from Previous |
| ----------------------- | ----- | -------------------- |
| **NPM Downloads (30d)** | X     | +/-Y%                |
| **Dev.to Articles**     | X     | +Y                   |
| **Dev.to Views**        | X     | +Y                   |
| **GitHub Stars**        | X     | +Y                   |

#### NPM Downloads by Package

[Table with per-package downloads]

### 📐 Estimations

| Estimation          | Low | High | Change |
| ------------------- | --- | ---- | ------ |
| **Unique Installs** | X   | Y    | +/-Z   |
| **Active Projects** | X   | Y    | +/-Z   |
| **Organizations**   | X   | Y    | +/-Z   |

### 🤖 AI Agent Discovery Status

| Agent      | Test Query | Found? | Notes |
| ---------- | ---------- | ------ | ----- |
| Perplexity | [query]    | ✅/❌  |       |
| ChatGPT    | [query]    | ✅/❌  |       |

### 📱 Social Profile Metrics

| Platform         | Metric      | Value | Change |
| ---------------- | ----------- | ----- | ------ |
| GitHub Stars     | Total       | X     | +/-Y   |
| Dev.to Followers | Followers   | X     | +/-Y   |
| X Followers      | Followers   | X     | +/-Y   |
| LinkedIn         | Connections | X     | +/-Y   |

### 🎯 Period Highlights

- [Key event 1]
- [Key event 2]

### 📊 Estimation Accuracy Check

Compare previous review estimates to actual data:
| Previous Estimate | Actual | Accuracy |
|-------------------|--------|----------|
| [metric] | [value] | [note] |

### 📝 Notes for Next Review

- [Action item 1]
- [Action item 2]
```

---

_This audit log should be updated with each `/exposure-review` run._
