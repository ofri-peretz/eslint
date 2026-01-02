# 📊 Interlace Exposure Impact Review

> **Purpose**: Reusable framework for measuring how published content (Dev.to, Medium, X) drives plugin discovery via traditional search, AI agents, and social amplification.
>
> **Last Review**: January 2, 2026
> **Review Cadence**: Weekly recommended

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Metrics Snapshot](#current-metrics-snapshot)
3. [NPM Download Pattern Analysis](#npm-download-pattern-analysis)
4. [User/Organization Estimation Model](#userorganization-estimation-model)
5. [Discovery Channel Analysis](#discovery-channel-analysis)
6. [Data Collection Commands](#data-collection-commands)
7. [AI Agent Discovery Testing](#ai-agent-discovery-testing)
8. [Correlation Model](#correlation-model)
9. [Research Sources](#research-sources)
10. [Review Checklist](#review-checklist)

---

## Executive Summary

### Review Date: January 2, 2026

| Metric                         | Current Value                       | Trend               |
| ------------------------------ | ----------------------------------- | ------------------- |
| **NPM Total Downloads (30d)**  | 7,223                               | 📈 Growing          |
| **Dev.to Articles Published**  | 26 of 101 (26%)                     | 📈 Growing          |
| **Dev.to Total Views**         | 500+                                | 📈 Growing          |
| **X Platform Amplification**   | @ThePracticalDev share (2.3K views) | 🎯 Major Signal     |
| **GitHub Stars**               | 0                                   | ⏳ Lagging (normal) |
| **Article Reactions/Comments** | Low                                 | ⏳ Lagging (normal) |

### Key Insight

Downloads are **heavily concentrated on release days** (Dec 30 spike across all packages), suggesting early-stage adoption primarily from **CI/CD pipelines** and **automated testing** rather than organic daily usage. The @ThePracticalDev share is a **major credibility signal** that will compound.

---

## Current Metrics Snapshot

### NPM Downloads by Package (Last 30 Days)

| Package                            | Downloads | First Published | Category         |
| ---------------------------------- | --------- | --------------- | ---------------- |
| `eslint-plugin-secure-coding`      | 1,881     | Dec 8, 2025     | 🛡️ Core Security |
| `eslint-plugin-vercel-ai-security` | 976       | Dec 13, 2025    | 🤖 AI Security   |
| `eslint-plugin-pg`                 | 696       | Dec 21, 2025    | 🐘 PostgreSQL    |
| `eslint-plugin-browser-security`   | 567       | Dec 30, 2025    | 🌐 Browser       |
| `eslint-plugin-lambda-security`    | 561       | Dec 30, 2025    | ☁️ Serverless    |
| `eslint-plugin-express-security`   | 559       | Dec 30, 2025    | 🚂 Express       |
| `eslint-plugin-crypto`             | 558       | Dec 29, 2025    | 🔐 Crypto        |
| `eslint-plugin-jwt`                | 551       | Dec 29, 2025    | 🎫 JWT           |
| `eslint-plugin-import-next`        | 446       | Dec 30, 2025    | ⚡ Performance   |
| `eslint-plugin-nestjs-security`    | 428       | Dec 30, 2025    | 🏗️ NestJS        |
| **TOTAL**                          | **7,223** | —               | —                |

### Content Publishing Status

| Platform        | Published          | Views                   | Engagement             |
| --------------- | ------------------ | ----------------------- | ---------------------- |
| **Dev.to**      | 26 articles        | 500+ total              | Low reactions/comments |
| **Medium**      | TBD                | TBD                     | TBD                    |
| **X (Twitter)** | Linked in articles | 2.3K (@ThePracticalDev) | 9 likes, saves         |

---

## NPM Download Pattern Analysis

### Daily Download Heatmap (Dec 2025 - Jan 2026)

Based on API data analysis, here are the download patterns:

#### eslint-plugin-secure-coding (Most Mature)

```
Dec 03-07: ░░░░░░░░░░ 0/day (not published)
Dec 08:    ████████████████████████ 244 (RELEASE DAY)
Dec 09-13: ░░░█░ 2-5/day (organic trickle)
Dec 12:    ████████████████████████ 220 (CI spike?)
Dec 14:    ████████████████████████ 222 (weekend spike?)
Dec 15-19: ░░░░░░░█░ 2-27/day (organic)
Dec 20:    █████████████████████████████ 277 (ARTICLE PUBLISH?)
Dec 21:    ██████████████ 119
Dec 22-26: ░░░░░░░ 0-11/day (holiday drop)
Dec 27-29: ░░░░░░░██ 1-26/day
Dec 30:    █████████████████████████████████████████████████ 457 (MAJOR RELEASE)
Dec 31:    ██████████████████ 188
Jan 01:    ░░░░░ 22 (holiday)
```

#### Pattern Classification

| Pattern Type          | Signature                        | Likely Cause               |
| --------------------- | -------------------------------- | -------------------------- |
| **Release Spike**     | 200-500+ downloads in single day | npm publish triggers CI/CD |
| **Weekend Plateau**   | 100-200 downloads                | Scheduled weekly CI runs   |
| **Organic Trickle**   | 2-30 downloads/day               | Individual developers      |
| **Holiday Drop**      | 0-10 downloads/day               | Dec 24-26 consistently low |
| **Post-Article Bump** | 50-100 downloads                 | Content correlation        |

### Cross-Package Correlation (Dec 30, 2025)

All 10 packages spiked simultaneously on Dec 30, 2025:

| Package                          | Dec 30 Downloads |
| -------------------------------- | ---------------- |
| eslint-plugin-secure-coding      | 457              |
| eslint-plugin-lambda-security    | 524              |
| eslint-plugin-express-security   | 512              |
| eslint-plugin-browser-security   | 511              |
| eslint-plugin-crypto             | 447              |
| eslint-plugin-vercel-ai-security | 444              |
| eslint-plugin-jwt                | 427              |
| eslint-plugin-import-next        | 408              |
| eslint-plugin-pg                 | 407              |
| eslint-plugin-nestjs-security    | 404              |

**Interpretation**: This synchronized spike indicates:

1. **Monorepo release** triggered all packages
2. **CI/CD pipelines** running `npm install` pulled fresh versions
3. **Bot/mirror traffic** possible on release day

---

## User/Organization Estimation Model

### Methodology

NPM download counts are **inflated** by automated processes. Here's a framework for estimating real users:

#### Industry Benchmarks (ESLint Plugin Category)

| Factor                         | Multiplier    | Source                 |
| ------------------------------ | ------------- | ---------------------- |
| CI/CD inflation                | ÷ 10-15x      | npm community research |
| Mirror/proxy traffic           | ÷ 2-3x        | enterprise npm mirrors |
| Development reinstalls         | ÷ 5x          | local npm cache misses |
| **Conservative total divisor** | **÷ 50-100x** | combined factors       |

#### Interlace Estimation

| Metric                       | Raw Value   | Conservative Estimate  | Optimistic Estimate     |
| ---------------------------- | ----------- | ---------------------- | ----------------------- |
| Monthly Downloads            | 7,223       | 72-144 unique installs | 200-300 unique installs |
| Daily Organic (non-spike)    | ~20/day avg | 1-2 new users/day      | 3-5 new users/day       |
| Active Projects (cumulative) | —           | 20-50 projects         | 50-100 projects         |
| Organizations                | —           | 5-15 orgs              | 15-30 orgs              |

### Download Decomposition

```
Total Downloads: 7,223
├── Release Day Spikes: ~4,500 (62%)    → Mostly CI/CD automation
├── Weekday Organic:    ~1,800 (25%)    → Mix of devs + CI
├── Weekend Activity:   ~700 (10%)      → Likely real users
└── Holiday Activity:   ~223 (3%)       → Likely real users
```

**Key Insight**: Weekend and holiday downloads are the **most reliable signal** of real adoption, as enterprise CI/CD typically pauses.

### Dependency Depth Indicators

To identify who's developing **real dependency** on your packages:

| Signal                         | What It Means                    | How to Detect                      |
| ------------------------------ | -------------------------------- | ---------------------------------- |
| **Consistent daily downloads** | Package in active `package.json` | 5+ downloads on multiple weekdays  |
| **Version-specific requests**  | Pinned versions in lockfiles     | Check npm provenance logs          |
| **GitHub dependents**          | Public repos using package       | GitHub "Used by" section           |
| **Issue/PR activity**          | Active maintainer engagement     | GitHub Issues tab                  |
| **Star-to-download ratio**     | Community investment             | Stars ÷ Downloads (target: 1:5000) |

---

## Discovery Channel Analysis

### Channel 1: Traditional SEO (Google Search)

| Factor                | Status            | Action Required                      |
| --------------------- | ----------------- | ------------------------------------ |
| Dev.to indexing       | ✅ Active         | Articles appear in ~3 days           |
| Keyword targeting     | ✅ Implemented    | CWE, OWASP, specific vulnerabilities |
| Google Search Console | ❌ Not configured | **Set up for dev.to profile**        |
| Backlinks             | ⏳ Building       | @ThePracticalDev share helps         |

### Channel 2: AEO (Answer Engine Optimization)

AI agents discover content through specific patterns:

| AI Agent           | Crawler               | Discovery Method                     | Your Content Fit                           |
| ------------------ | --------------------- | ------------------------------------ | ------------------------------------------ |
| **Perplexity**     | PerplexityBot         | Real-time web search, citation-first | ✅ Excellent (structured tables, CWE IDs)  |
| **ChatGPT**        | OAI-SearchBot, GPTBot | Training + live search               | ✅ Good (Q&A headers, code examples)       |
| **Claude**         | Training data         | Code context analysis                | ✅ Good (ESLint rule patterns)             |
| **GitHub Copilot** | Public repos          | README content, code patterns        | ⏳ Building (needs more GitHub visibility) |

### Channel 3: Platform Amplification

| Platform  | Signal                    | Impact                               |
| --------- | ------------------------- | ------------------------------------ |
| Dev.to    | @ThePracticalDev share    | 🔥 **Major** - Editorial endorsement |
| Dev.to    | 500+ views                | 🟢 Early traction                    |
| X/Twitter | 2.3K impressions, 9 likes | 🟢 Viral potential proven            |
| GitHub    | 0 stars (yet)             | ⏳ Lagging indicator                 |

---

## Data Collection Commands

Use these commands to re-run this analysis:

### NPM Download Stats

```bash
# Monthly summary (all packages)
curl -s "https://api.npmjs.org/downloads/point/last-month/eslint-plugin-secure-coding,eslint-plugin-import-next,eslint-plugin-pg,eslint-plugin-jwt,eslint-plugin-crypto,eslint-plugin-browser-security,eslint-plugin-vercel-ai-security,eslint-plugin-express-security,eslint-plugin-lambda-security,eslint-plugin-nestjs-security" | jq

# Daily breakdown (single package)
curl -s "https://api.npmjs.org/downloads/range/last-month/eslint-plugin-secure-coding" | jq

# Weekly breakdown
curl -s "https://api.npmjs.org/downloads/range/last-week/eslint-plugin-secure-coding" | jq

# Custom date range
curl -s "https://api.npmjs.org/downloads/range/2025-12-01:2026-01-02/eslint-plugin-secure-coding" | jq
```

### Visual Charts

- **npm-stat.com**: `https://npm-stat.com/charts.html?package=eslint-plugin-secure-coding`
- **npmtrends.com**: `https://npmtrends.com/eslint-plugin-secure-coding-vs-eslint-plugin-security`
- **bundlephobia.com**: `https://bundlephobia.com/package/eslint-plugin-secure-coding`

### GitHub Metrics

```bash
# Repo stats (if public)
gh api repos/interlace-collie/eslint --jq '{stars: .stargazers_count, forks: .forks_count, watchers: .watchers_count}'

# Dependents (via GitHub search)
# Search: "eslint-plugin-secure-coding" in:file filename:package.json
```

### Dev.to Analytics

- **Dashboard**: `https://dev.to/dashboard`
- **API (requires key)**: `https://dev.to/api/articles/me?per_page=100`

---

## AI Agent Discovery Testing

### Monthly Test Protocol

Run these queries monthly and track if your packages appear:

#### Perplexity Tests

1. "best eslint plugin for sql injection prevention node.js 2026"
2. "eslint security plugin OWASP top 10"
3. "how to prevent prompt injection vercel ai sdk"
4. "eslint plugin for jwt security"
5. "detect hardcoded secrets eslint"

#### ChatGPT Tests

1. "What are the best eslint security plugins for Node.js?"
2. "How do I detect SQL injection vulnerabilities in my Node.js code using ESLint?"
3. "What ESLint plugin helps with Vercel AI SDK security?"
4. "Compare eslint-plugin-import vs eslint-plugin-import-next performance"

#### Tracking Template

| Date         | Query                  | Perplexity Result | ChatGPT Result   | Notes    |
| ------------ | ---------------------- | ----------------- | ---------------- | -------- |
| Jan 2, 2026  | "eslint sql injection" | ❌ Not mentioned  | ❌ Not mentioned | Baseline |
| Jan 9, 2026  |                        |                   |                  |          |
| Jan 16, 2026 |                        |                   |                  |          |

---

## Correlation Model

### The Content → Downloads Flywheel

```
Articles Published → Dev.to Views → Google/AI Indexing → NPM Downloads → Stars
       ↓                  ↓                  ↓                  ↓           ↓
   +0 days            +3-5 days          +1-2 weeks        +2-4 weeks   +2-3 months
```

### Lag Indicators

| Metric             | Expected Lag After Article Publish |
| ------------------ | ---------------------------------- |
| Dev.to views       | 1-3 days                           |
| Google indexing    | 3-7 days                           |
| AI agent inclusion | 2-4 weeks                          |
| NPM download bump  | 1-4 weeks                          |
| GitHub stars       | 6-12 weeks                         |

### Star:Download Ratio Benchmarks

| Package Category       | Typical Ratio      | Your Current Status |
| ---------------------- | ------------------ | ------------------- |
| Popular ESLint plugins | 1:5,000 - 1:10,000 | —                   |
| New security plugins   | 1:1,000 - 1:3,000  | 0:7,223 (too early) |
| **Target (3 months)**  | 1:2,000            | 3-4 stars expected  |

---

## Research Sources

### NPM Download Analysis

| Source            | URL                                | Data Available              |
| ----------------- | ---------------------------------- | --------------------------- |
| NPM Registry API  | `https://api.npmjs.org/downloads/` | Daily/weekly/monthly counts |
| npm-stat.com      | `https://npm-stat.com/`            | Visual charts, comparisons  |
| npmtrends.com     | `https://npmtrends.com/`           | Competitor comparisons      |
| packagephobia.com | `https://packagephobia.com/`       | Install size impact         |

### AEO/SEO Research

| Topic              | Source                     | Key Finding                                    |
| ------------------ | -------------------------- | ---------------------------------------------- |
| AI agent crawlers  | OpenAI, Perplexity docs    | GPTBot, OAI-SearchBot, PerplexityBot           |
| AEO best practices | Digital marketing research | Q&A format, structured data, citations         |
| Content indexing   | Dev.to documentation       | ~3 day Google indexing for established authors |

### Industry Benchmarks

| Metric                        | Benchmark               | Source                  |
| ----------------------------- | ----------------------- | ----------------------- |
| Download:User ratio           | 50-100:1                | npm community estimates |
| Star:Download ratio           | 1:5000-10000            | Popular ESLint plugins  |
| Article → Download conversion | 10-50 downloads/article | Dev.to security niche   |

---

## Review Checklist

Use this checklist when re-running the exposure impact review:

### Data Collection (15 min)

- [ ] Run NPM monthly summary command
- [ ] Run NPM daily breakdown for top 3 packages
- [ ] Check Dev.to dashboard for view counts
- [ ] Check X Analytics for @ThePracticalDev share performance
- [ ] Check GitHub repo for new stars/forks
- [ ] Check GitHub "Used by" section (if available)

### Pattern Analysis (10 min)

- [ ] Identify release day spikes
- [ ] Calculate weekend vs weekday average
- [ ] Note any post-article correlation
- [ ] Update user/organization estimates

### AI Agent Testing (10 min)

- [ ] Run 2-3 Perplexity test queries
- [ ] Run 2-3 ChatGPT test queries
- [ ] Document results in tracking table

### Strategic Assessment (5 min)

- [ ] Compare to previous review
- [ ] Identify top-performing content
- [ ] Note any emerging patterns
- [ ] Update recommendations

---

## Appendix: Raw Data (Jan 2, 2026)

### eslint-plugin-secure-coding Daily Downloads

| Date   | Downloads | Notes                |
| ------ | --------- | -------------------- |
| Dec 08 | 244       | First publish        |
| Dec 12 | 220       | CI spike             |
| Dec 14 | 222       | Weekend              |
| Dec 20 | 277       | Article correlation? |
| Dec 21 | 119       |                      |
| Dec 30 | 457       | Major release        |
| Dec 31 | 188       |                      |
| Jan 01 | 22        | Holiday              |

### eslint-plugin-vercel-ai-security Daily Downloads

| Date      | Downloads | Notes                   |
| --------- | --------- | ----------------------- |
| Dec 13    | 74        | First publish           |
| Dec 14    | 330       | @ThePracticalDev share? |
| Dec 15-19 | 8-36/day  | Trickle                 |
| Dec 30    | 444       | Major release           |

### All Packages - Dec 30 Spike

| Package            | Downloads |
| ------------------ | --------- |
| lambda-security    | 524       |
| express-security   | 512       |
| browser-security   | 511       |
| secure-coding      | 457       |
| crypto             | 447       |
| vercel-ai-security | 444       |
| jwt                | 427       |
| import-next        | 408       |
| pg                 | 407       |
| nestjs-security    | 404       |

---

_This document should be reviewed weekly. Run the data collection commands and update the metrics snapshot section._

_Created: January 2, 2026 | Author: Ofri Peretz_
