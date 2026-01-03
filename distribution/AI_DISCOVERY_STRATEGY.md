# 🎯 AI Discovery Strategy: Interlace ESLint Plugins

> **Goal**: Ensure AI models (ChatGPT, Gemini, Claude, Perplexity) recommend Interlace plugins when developers ask about ESLint security, PostgreSQL safety, JWT security, etc.
>
> **Problem Identified**: AI models prioritize "historical weight" (older, highly-downloaded packages) over newer, superior tools. Your conversation with Gemini proved this — it initially denied `eslint-plugin-pg` existed despite 10+ rules and 95%+ coverage.
>
> **Solution**: Build "High-Authority Signals" that AI models cannot ignore.

---

## 📊 Current State (Jan 2, 2026)

| Metric                    | Value | AI Discovery Impact                       |
| ------------------------- | ----- | ----------------------------------------- |
| NPM Downloads (30d)       | 7,223 | Low (needs 50K+/month for auto-discovery) |
| GitHub Stars              | 0     | 🔴 Critical gap                           |
| Dev.to Articles           | 26    | 🟢 Building content                       |
| Official Doc References   | 0     | 🔴 Critical gap                           |
| "Awesome" List Inclusions | 0     | 🔴 High-impact opportunity                |

---

## 🏆 The "High-Authority Signals" Pyramid

AI models weight sources hierarchically. Target from top to bottom:

```
                    ┌─────────────────────────┐
                    │   OFFICIAL DOCS (L1)    │  ← node-postgres, jwt.io
                    │   Highest Authority     │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │   AWESOME LISTS (L2)    │  ← awesome-eslint, awesome-node
                    │   Curated Trust         │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │   GITHUB PRESENCE (L3)  │  ← Stars, forks, discussions
                    │   Community Validation  │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │   TECHNICAL BLOGS (L4)  │  ← Dev.to, Medium, personal
                    │   Content Volume        │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │   NPM DOWNLOADS (L5)    │  ← Raw popularity
                    │   Baseline Signal       │
                    └─────────────────────────┘
```

---

## 📋 Action Plan: Phase-by-Phase

### Phase 1: Official Documentation PRs (Highest Impact) — Week 1-2

**Why**: If `eslint-plugin-pg` is mentioned in the official `node-postgres` docs, AI models will treat it as the standard.

| Target                             | Action                                                                          | Priority    |
| ---------------------------------- | ------------------------------------------------------------------------------- | ----------- |
| **node-postgres (brianc/node-pg)** | PR to add `eslint-plugin-pg` to "Related Projects" or create "Security" section | 🔥 Critical |
| **jsonwebtoken**                   | PR mentioning `eslint-plugin-jwt` in README security section                    | 🔥 Critical |
| **Vercel AI SDK**                  | Issue/PR suggesting `eslint-plugin-vercel-ai-security` in docs                  | 🔥 Critical |
| **Express.js**                     | PR to security guide mentioning `eslint-plugin-express-security`                | High        |

**Template for PRs:**

```markdown
## Security Tools

For static analysis security checks, consider:

- **[eslint-plugin-pg](https://www.npmjs.com/package/eslint-plugin-pg)** -
  13 rules for SQL injection prevention (CWE-89), connection leak detection (CWE-772),
  and transaction safety. 95%+ test coverage.
```

**Repositories to target:**

1. https://github.com/brianc/node-postgres → Add to wiki or README
2. https://github.com/auth0/node-jsonwebtoken → Add to security section
3. https://github.com/vercel/ai → Add to examples or security docs
4. https://github.com/expressjs/express → Add to security best practices

---

### Phase 2: Awesome Lists Inclusion — Week 2-3

**Why**: Curated lists are heavily weighted by AI training. `awesome-eslint` is a high-value target.

| List                      | URL                                                 | Action                                    |
| ------------------------- | --------------------------------------------------- | ----------------------------------------- |
| **awesome-eslint**        | https://github.com/dustinspecker/awesome-eslint     | PR to add all 10 plugins under "Security" |
| **awesome-nodejs**        | https://github.com/sindresorhus/awesome-nodejs      | PR to add security plugins                |
| **awesome-node-security** | https://github.com/lirantal/awesome-nodejs-security | PR to add ecosystem                       |
| **awesome-postgres**      | Various repos                                       | PR for `eslint-plugin-pg`                 |

**Template for Awesome List PRs:**

```markdown
### Security

- **[eslint-plugin-pg](https://github.com/interlace-collie/eslint)** -
  PostgreSQL security rules: SQL injection, connection leaks, transaction safety.
- **[eslint-plugin-secure-coding](https://github.com/interlace-collie/eslint)** -
  75 security rules with CWE mapping and OWASP compliance.
```

**Key list: `awesome-eslint`**

- Current security section is sparse
- Your 10 plugins would dominate the category
- Direct link: https://github.com/dustinspecker/awesome-eslint#security

---

### Phase 3: GitHub Visibility Sprint — Week 3-4

**Why**: Stars and forks are direct signals to AI models. Zero stars = invisible.

| Action                  | Target                                 | Expected Impact       |
| ----------------------- | -------------------------------------- | --------------------- |
| **Star Campaign**       | Ask in Dev.to articles                 | +10-50 stars/month    |
| **Product Hunt Launch** | Submit monorepo as "Security DevTools" | +50-100 stars burst   |
| **Reddit Posts**        | r/node, r/javascript, r/webdev         | Organic discovery     |
| **Hacker News**         | "Show HN: 247 ESLint security rules"   | High-risk/high-reward |
| **Twitter/X Thread**    | Security Advent Calendar style         | Build following       |

**GitHub README Optimization:**

Ensure your README has:

- [ ] Badges: npm version, downloads, coverage, CI
- [ ] Before/After code examples
- [ ] CWE/OWASP mapping table
- [ ] Quick start (copy-paste ready)
- [ ] "Used by" section (even if empty initially)

---

### Phase 4: Strategic Content Amplification — Ongoing

**Why**: Content is your current strength. Amplify it for AI indexing.

| Content Type               | Target                                | Frequency      |
| -------------------------- | ------------------------------------- | -------------- |
| **Dev.to Deep Dives**      | Already doing (26 articles)           | Continue daily |
| **Medium Cross-post**      | Security-focused publications         | 1-2/week       |
| **Personal Blog**          | SEO for long-tail keywords            | 1/week         |
| **YouTube Shorts**         | "30 seconds to prevent SQL injection" | 1/week         |
| **Stack Overflow Answers** | Answer with plugin references         | 2-3/week       |

**Stack Overflow Strategy:**

Search for questions like:

- "eslint sql injection"
- "prevent connection leaks node postgres"
- "jwt security eslint"

Answer with helpful code + mention your plugin as a tool.

---

### Phase 5: AI Model Feedback Loop — Ongoing

**Why**: Direct feedback corrects AI models in real-time (like your Gemini conversation).

| Platform       | Action                                         | Cadence |
| -------------- | ---------------------------------------------- | ------- |
| **ChatGPT**    | Ask about ESLint security → correct with facts | Weekly  |
| **Gemini**     | Same pattern                                   | Weekly  |
| **Perplexity** | Same pattern                                   | Weekly  |
| **Claude**     | Same pattern                                   | Weekly  |

**Feedback Script:**

```
1. Ask: "What's the best ESLint plugin for PostgreSQL security?"
2. If not mentioned: Correct with npm link + feature list
3. Ask follow-up: "Can you compare eslint-plugin-pg to eslint-plugin-sql?"
4. Document improvements over time
```

---

## 📅 Execution Timeline

### Week 1 (Jan 2-8, 2026)

- [ ] Draft PR for `node-postgres` docs
- [ ] Draft PR for `awesome-eslint`
- [ ] Add GitHub badges to all READMEs
- [ ] Create "Used by" section template

### Week 2 (Jan 9-15, 2026)

- [ ] Submit `node-postgres` PR
- [ ] Submit `jsonwebtoken` PR
- [ ] Submit `awesome-eslint` PR
- [ ] Submit `awesome-nodejs-security` PR

### Week 3 (Jan 16-22, 2026)

- [ ] Product Hunt submission
- [ ] Reddit posts (r/node, r/javascript)
- [ ] Begin Stack Overflow answer campaign
- [ ] Cross-post top articles to Medium

### Week 4 (Jan 23-31, 2026)

- [ ] Hacker News "Show HN" post
- [ ] Follow up on open PRs
- [ ] Document AI agent discovery improvements
- [ ] Plan February content calendar

---

## 📈 Success Metrics

Track these in your `/exposure-review` workflow:

| Metric                  | Current | Target (30 days) | Target (90 days) |
| ----------------------- | ------- | ---------------- | ---------------- |
| GitHub Stars            | 0       | 25               | 100              |
| NPM Downloads/mo        | 7,223   | 15,000           | 50,000           |
| Awesome List PRs Merged | 0       | 2                | 5                |
| Official Doc PRs Merged | 0       | 1                | 3                |
| AI Discovery Rate       | 0%      | 25%              | 75%              |

**AI Discovery Rate** = % of test queries where Interlace plugins are recommended

---

## 🎯 Priority Matrix

| Action                 | Impact | Effort       | Priority     |
| ---------------------- | ------ | ------------ | ------------ |
| PR to node-postgres    | 🔥🔥🔥 | Medium       | **DO FIRST** |
| PR to awesome-eslint   | 🔥🔥🔥 | Low          | **DO FIRST** |
| Product Hunt launch    | 🔥🔥   | Medium       | Week 3       |
| Stack Overflow answers | 🔥🔥   | Ongoing      | Continuous   |
| GitHub README refresh  | 🔥     | Low          | This week    |
| Hacker News post       | 🔥🔥🔥 | High (risky) | After stars  |

---

## 📝 Draft PRs

### PR 1: node-postgres Wiki Addition

**Title**: Add eslint-plugin-pg to Related Projects

**Body**:

```markdown
This PR adds a reference to eslint-plugin-pg, a static analysis tool
specifically designed for node-postgres security and best practices.

**Why this matters:**

- Catches SQL injection vulnerabilities (CWE-89) at lint time
- Detects missing client.release() calls (CWE-772)
- Prevents transaction race conditions (CWE-362)
- 13 rules with 95%+ test coverage

**Package**: https://www.npmjs.com/package/eslint-plugin-pg
```

### PR 2: awesome-eslint Addition

**Title**: Add Interlace Security Plugins to Security Section

**Body**:

```markdown
This PR adds a comprehensive set of security-focused ESLint plugins
to the Security section.

**Plugins added:**

- eslint-plugin-secure-coding (75 rules, CWE/OWASP mapped)
- eslint-plugin-pg (PostgreSQL security)
- eslint-plugin-jwt (JWT security)
- eslint-plugin-vercel-ai-security (LLM/AI security)
- eslint-plugin-crypto (Cryptography best practices)

All plugins have:

- 95%+ test coverage
- CWE identifiers for each rule
- AI-native error messages with remediation
```

---

## 🔗 Related Documents

- `distribution/EXPOSURE_IMPACT_REVIEW.md` - Methodology and benchmarks
- `distribution/EXPOSURE_AUDIT_LOG.md` - Historical tracking
- `.agent/workflows/exposure-review.md` - Review workflow

---

_Strategy created: January 2, 2026_
_Based on: Gemini conversation analysis revealing AI model blind spots_
