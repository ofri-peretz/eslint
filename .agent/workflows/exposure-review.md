---
description: Run exposure impact and content distribution analysis for Interlace ESLint ecosystem
---

# Exposure Impact Review Workflow

This workflow analyzes how published content (Dev.to, Medium, X) is driving plugin discovery through search, AI agents, and social amplification.

## Prerequisites

- Access to npm registry API (no auth required)
- Dev.to dashboard access (for view counts)

## Key Documents

| Document                                 | Purpose                                                         |
| ---------------------------------------- | --------------------------------------------------------------- |
| `distribution/EXPOSURE_IMPACT_REVIEW.md` | Research methodology, benchmarks, and data collection commands  |
| `distribution/EXPOSURE_AUDIT_LOG.md`     | **Historical record** — Read previous reviews, append new entry |
| `distribution/PUBLISHING_QUEUE.md`       | Article publishing status                                       |

## Profile Links (for tracking)

| Platform              | URL                                 | Metrics Available                     |
| --------------------- | ----------------------------------- | ------------------------------------- |
| **GitHub (Org)**      | https://github.com/interlace-collie | Stars, Forks, Used By                 |
| **GitHub (Personal)** | https://github.com/ofri-peretz      | Profile views, followers              |
| **Dev.to**            | https://dev.to/ofriperetz           | Views, reactions, comments, followers |
| **npm**               | https://www.npmjs.com/~ofri-peretz  | Package downloads                     |
| **npm-stat (Author)** | Dynamic (see below)                 | 3-month download trends (visual)      |
| **X (Twitter)**       | https://x.com/ofriperetzdev         | Impressions, followers                |
| **LinkedIn**          | https://linkedin.com/in/ofri-peretz | Profile views, connections            |

### npm-stat Author Chart (3-month lookback)

Generate the URL dynamically based on the review date:

```
https://npm-stat.com/charts.html?author=ofriperetz&from=YYYY-MM-DD&to=YYYY-MM-DD
```

**Example for Jan 2, 2026 review:**

```
https://npm-stat.com/charts.html?author=ofriperetz&from=2025-10-02&to=2026-01-02
```

## Workflow Steps

### 0. Read Previous Review (MANDATORY FIRST STEP)

Before collecting new data, read the audit log to get baseline comparisons:

```bash
# View the audit log to see previous metrics
cat distribution/EXPOSURE_AUDIT_LOG.md
```

Extract from the **Review Index** table:

- Previous total downloads
- Previous article count
- Previous estimations

This enables the "Change from Previous" calculations in the new review.

### 1. Collect NPM Download Data

// turbo
Run the monthly summary command:

```bash
curl -s "https://api.npmjs.org/downloads/point/last-month/eslint-plugin-secure-coding,eslint-plugin-import-next,eslint-plugin-pg,eslint-plugin-jwt,eslint-plugin-crypto,eslint-plugin-browser-security,eslint-plugin-vercel-ai-security,eslint-plugin-express-security,eslint-plugin-lambda-security,eslint-plugin-nestjs-security" | jq
```

### 2. Collect Daily Breakdown for Top Packages

// turbo
Get daily patterns for the most downloaded packages:

```bash
curl -s "https://api.npmjs.org/downloads/range/last-month/eslint-plugin-secure-coding" | jq
curl -s "https://api.npmjs.org/downloads/range/last-month/eslint-plugin-vercel-ai-security" | jq
```

### 3. Analyze Download Patterns

Identify and report on:

- **Release day spikes**: Downloads > 200 in single day
- **Organic trickle**: 2-30 downloads/day on non-release days
- **Weekend activity**: Downloads on Sat/Sun (best signal of real users)
- **Holiday patterns**: Dec 24-26, Jan 1 typically low

### 4. Estimate Unique Users

Apply the estimation model from `EXPOSURE_IMPACT_REVIEW.md`:

- Divide total downloads by 50-100x for conservative unique user estimate
- Weekend/holiday downloads are most reliable signal
- Report estimated active projects (20-50 range for ~7K monthly downloads)

### 5. Check Content Publishing Status

Reference:

- `distribution/PUBLISHING_QUEUE.md` for article count
- Dev.to dashboard for view/reaction counts
- X Analytics for social amplification metrics

### 5b. Check Social Profile Metrics

Visit each profile and record:

| Platform                      | Metrics to Capture                                 |
| ----------------------------- | -------------------------------------------------- |
| **GitHub (interlace-collie)** | Total stars across repos, forks, "Used by" count   |
| **GitHub (ofri-peretz)**      | Followers, profile views (if available)            |
| **Dev.to**                    | Total followers, total post views, total reactions |
| **X**                         | Followers, impressions on pinned/recent posts      |
| **LinkedIn**                  | Connections, profile views                         |
| **npm**                       | Total downloads across all packages                |

### 6. Test AI Agent Discovery

Run 2-3 test queries on each:

**Perplexity**:

- "best eslint plugin for sql injection prevention node.js"
- "eslint security plugin OWASP top 10"

**ChatGPT**:

- "What are the best eslint security plugins for Node.js?"
- "Compare eslint-plugin-import vs eslint-plugin-import-next"

Document whether Interlace packages appear in responses.

### 7. Generate Summary Report

Produce a summary with:

- Current metrics snapshot table
- NPM download trend (up/down/stable)
- User/organization estimates
- AI agent discovery status
- Recommendations for next actions

### 8. Update Review Document

Update `distribution/EXPOSURE_IMPACT_REVIEW.md` with:

- New review date
- Updated metrics in Executive Summary
- Any new patterns discovered
- Appendix data for this review period

### 9. Append to Audit Log (MANDATORY FINAL STEP)

Add a new entry to `distribution/EXPOSURE_AUDIT_LOG.md`:

1. **Update the Review Index table** — Add new row with:
   - Review number (increment)
   - Date
   - Total downloads
   - Articles published
   - Estimated unique users
   - Estimated projects
   - Key event

2. **Add full review section** — Use the template at the bottom of the audit log

3. **Accuracy check** — Compare previous estimations to actual data:
   - Did downloads grow as predicted?
   - Are unique user estimates tracking?
   - How accurate were AI discovery predictions?

---

## Output Format

Provide results in this structure:

```markdown
## 📊 Exposure Impact Review - [DATE]

### Metrics Snapshot

| Metric              | Previous | Current | Change |
| ------------------- | -------- | ------- | ------ |
| NPM Downloads (30d) | X        | Y       | +/-%   |
| Dev.to Views        | X        | Y       | +/-%   |
| GitHub Stars        | X        | Y       | +/-N   |

### Download Pattern Analysis

[Describe spikes, organic traffic, weekend patterns]

### User/Organization Estimates

- Estimated unique installs: X-Y
- Estimated active projects: X-Y
- Estimated organizations: X-Y

### AI Agent Discovery

| Agent      | Query Tested | Result |
| ---------- | ------------ | ------ |
| Perplexity | [query]      | ✅/❌  |
| ChatGPT    | [query]      | ✅/❌  |

### Estimation Accuracy (vs. Previous Review)

| Previous Estimate | Actual  | Accuracy |
| ----------------- | ------- | -------- |
| [metric]          | [value] | [note]   |

### Recommendations

1. [Action item 1]
2. [Action item 2]
```

---

## Related Documents

- `distribution/EXPOSURE_IMPACT_REVIEW.md` - Full research methodology and benchmarks
- `distribution/EXPOSURE_AUDIT_LOG.md` - **Historical audit log** — Append new reviews here
- `distribution/PUBLISHING_QUEUE.md` - Article publishing status
- `distribution/DEV_TO_BEST_PRACTICES.md` - Content optimization standards
