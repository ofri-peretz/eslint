# 📅 Article Publishing Queue

> **Goal**: Publish **100 articles** across the Interlace ESLint ecosystem.
> **Started**: December 31, 2025
> **Current Count**: 25 / 100

---

## 📊 Progress Dashboard

| Status              | Count | Percentage |
| ------------------- | ----- | ---------- |
| ✅ Published        | 25    | 25%        |
| ⏳ Ready to Publish | 75    | 75%        |
| 🔮 Planned (Future) | ~15   | Bonus      |

---

## 🎯 Publishing Strategy

Articles are organized into **3 phases** for maximum impact:

1. **Phase 1: Getting Started Series** — Establish each plugin with intro articles
2. **Phase 2: Deep Dives** — Follow up with technical deep-dives
3. **Phase 3: Strategic & Cross-Cutting** — Broader topics, career, compliance

---

## ✅ COMPLETED (17 Articles)

| #   | Date         | Article                                                     | Series        |
| --- | ------------ | ----------------------------------------------------------- | ------------- |
| 1   | Dec 19, 2025 | Your Vercel AI SDK App Has a Prompt Injection Vulnerability | vercel-ai     |
| 2   | Dec 19, 2025 | 100% OWASP LLM Top 10 Coverage for Vercel AI SDK            | vercel-ai     |
| 3   | Dec 20, 2025 | Securing AI Agents in the Vercel AI SDK                     | vercel-ai     |
| 4   | Dec 20, 2025 | Your ESLint Security Plugin is Missing 80%                  | strategic     |
| 5   | Dec 31, 2025 | Why eslint-plugin-import Takes 45 Seconds                   | import-next   |
| 6   | Dec 31, 2025 | Hardcoded Secrets: Auto-Fix Vulnerability                   | secure-coding |
| 7   | Dec 31, 2025 | SQL Injection in node-postgres                              | pg            |
| 8   | Dec 31, 2025 | 3 Lines of Code to Hack Your Vercel AI App                  | vercel-ai     |
| 9   | Dec 31, 2025 | The JWT Algorithm "none" Attack                             | jwt           |
| 10  | Dec 31, 2025 | Security Engineer Interview Cheat Sheet                     | career        |
| 11  | Dec 31, 2025 | The 30-Minute Security Audit                                | strategic     |
| 12  | Dec 31, 2025 | Mapping Your Codebase to OWASP Top 10                       | strategic     |
| 13  | Dec 31, 2025 | Getting Started with eslint-plugin-pg                       | pg            |
| 14  | Dec 31, 2025 | Getting Started with eslint-plugin-secure-coding            | secure-coding |
| 15  | Dec 31, 2025 | The Connection Leak That Took Down Production               | pg            |
| 16  | Dec 31, 2025 | Transaction Race Conditions                                 | pg            |
| 17  | Dec 31, 2025 | Getting Started with eslint-plugin-vercel-ai-security       | vercel-ai     |
| 18  | Jan 2, 2026  | Getting Started with eslint-plugin-import-next              | import-next   |
| 19  | Jan 2, 2026  | eslint-plugin-import vs import-next: Up to 100x Faster      | benchmarks    |
| 20  | Jan 2, 2026  | Getting Started with eslint-plugin-crypto                   | crypto        |
| 21  | Jan 2, 2026  | Getting Started with eslint-plugin-jwt                      | jwt           |
| 22  | Jan 2, 2026  | Getting Started with eslint-plugin-browser-security         | browser       |
| 23  | Jan 2, 2026  | Getting Started with eslint-plugin-express-security         | express       |
| 24  | Jan 2, 2026  | Getting Started with eslint-plugin-lambda-security          | lambda        |
| 25  | Jan 2, 2026  | Getting Started with eslint-plugin-nestjs-security          | nestjs        |

---

## 📋 PHASE 1: Getting Started Series (Establish All Plugins)

_Publish all "Getting Started" guides first to establish the ecosystem foundation._

| Queue # | File                                       | Title                                                  | Series            | Status |
| ------- | ------------------------------------------ | ------------------------------------------------------ | ----------------- | ------ |
| 2       | `secure-coding/00-getting-started.md`      | Getting Started with eslint-plugin-secure-coding       | secure-coding     | ✅     |
| 3       | `vercel-ai-security/00-getting-started.md` | Getting Started with eslint-plugin-vercel-ai-security  | vercel-ai         | ✅     |
| 4       | `import-next/00-getting-started.md`        | Getting Started with eslint-plugin-import-next         | import-next       | ✅     |
| 5       | `import-next/02-benchmark-showdown.md`     | eslint-plugin-import vs import-next: Up to 100x Faster | ESLint Benchmarks | ✅     |
| 6       | `crypto/00-getting-started.md`             | Getting Started with eslint-plugin-crypto              | crypto            | ✅     |
| 7       | `jwt/00-getting-started.md`                | Getting Started with eslint-plugin-jwt                 | jwt               | ✅     |
| 8       | `browser-security/00-getting-started.md`   | Getting Started with eslint-plugin-browser-security    | browser           | ✅     |
| 9       | `express-security/00-getting-started.md`   | Getting Started with eslint-plugin-express-security    | express           | ✅     |
| 10      | `lambda-security/00-getting-started.md`    | Getting Started with eslint-plugin-lambda-security     | lambda            | ✅     |
| 11      | `nestjs-security/00-getting-started.md`    | Getting Started with eslint-plugin-nestjs-security     | nestjs            | ✅     |

### 🔮 Deferred (Plugins Not Yet Published)

| File                                   | Title                                             | Reason                   |
| -------------------------------------- | ------------------------------------------------- | ------------------------ |
| `quality/00-getting-started.md`        | Getting Started with eslint-plugin-quality        | Plugin not published yet |
| `react-features/00-getting-started.md` | Getting Started with eslint-plugin-react-features | Plugin not published yet |
| `accessibility/00-getting-started.md`  | Getting Started with eslint-plugin-accessibility  | Plugin not published yet |

---

## 📋 PHASE 2: Plugin Deep Dives

### 🐘 PostgreSQL Security (`pg`) — 10 articles

| Queue # | File                        | Title                           | Status      |
| ------- | --------------------------- | ------------------------------- | ----------- |
| 12      | `pg/01-sql-injection.md`    | SQL Injection in node-postgres  | ✅          |
| 13      | `pg/02-connection-leak.md`  | Detecting Connection Leaks      | ✅          |
| 14      | `pg/03-transaction-race.md` | Transaction Race Conditions     | ✅          |
| 15      | `pg/04-search-path.md`      | PostgreSQL Search Path Security | ⏳ **NEXT** |
| 16      | `pg/05-n1-loop.md`          | N+1 Query Detection             | ⏳          |
| 17      | `pg/06-copy-from.md`        | COPY FROM Security              | ⏳          |
| 18      | `pg/07-double-release.md`   | Double Release Detection        | ⏳          |
| 19      | `pg/08-connection-leaks.md` | Connection Leaks Deep Dive      | ⏳          |
| 20      | `pg/09-transaction-race.md` | Transaction Race Deep Dive      | ⏳          |
| 21      | `pg/10-n-plus-one.md`       | N+1 Queries Deep Dive           | ⏳          |

### 🔐 Secure Coding (`secure-coding`) — 21 articles

| Queue # | File                                           | Title                            | Status |
| ------- | ---------------------------------------------- | -------------------------------- | ------ |
| 22      | `secure-coding/01-hardcoded-secrets.md`        | Detecting Hardcoded Secrets      | ✅     |
| 23      | `secure-coding/02-eval-patterns.md`            | Dangerous eval() Patterns        | ⏳     |
| 24      | `secure-coding/03-redos-attack.md`             | ReDoS Attack Prevention          | ⏳     |
| 25      | `secure-coding/04-prototype-pollution.md`      | Prototype Pollution              | ⏳     |
| 26      | `secure-coding/05-xss-innerhtml.md`            | XSS via innerHTML                | ⏳     |
| 27      | `secure-coding/06-cookie-security.md`          | Cookie Security Flags            | ⏳     |
| 28      | `secure-coding/07-weak-crypto.md`              | Weak Cryptography Detection      | ⏳     |
| 29      | `secure-coding/08-pii-in-logs.md`              | PII in Logs Detection            | ⏳     |
| 30      | `secure-coding/09-command-injection.md`        | Command Injection Prevention     | ⏳     |
| 31      | `secure-coding/10-jwt-security.md`             | JWT Security Patterns            | ⏳     |
| 32      | `secure-coding/11-zip-slip.md`                 | Zip Slip Vulnerability           | ⏳     |
| 33      | `secure-coding/12-debug-code.md`               | Debug Code Detection             | ⏳     |
| 34      | `secure-coding/13-math-random.md`              | Math.random() Insecurity         | ⏳     |
| 35      | `secure-coding/14-localstorage-credentials.md` | LocalStorage Credential Exposure | ⏳     |
| 36      | `secure-coding/15-path-traversal.md`           | Path Traversal Prevention        | ⏳     |
| 37      | `secure-coding/16-timing-attacks.md`           | Timing Attack Prevention         | ⏳     |
| 38      | `secure-coding/17-redos-deep-dive.md`          | ReDoS Deep Dive                  | ⏳     |
| 39      | `secure-coding/18-eval-is-evil.md`             | Why eval() is Evil               | ⏳     |
| 40      | `secure-coding/19-prototype-pollution.md`      | Prototype Pollution Deep Dive    | ⏳     |
| 41      | `secure-coding/20-path-traversal.md`           | Path Traversal Deep Dive         | ⏳     |
| 42      | `secure-coding/21-command-injection.md`        | Command Injection Deep Dive      | ⏳     |

### 🤖 Vercel AI Security (`vercel-ai-security`) — 6 articles

| Queue # | File                                          | Title                       | Status |
| ------- | --------------------------------------------- | --------------------------- | ------ |
| 43      | `vercel-ai-security/01-prompt-injection.md`   | Prompt Injection Prevention | ✅     |
| 44      | `vercel-ai-security/02-owasp-llm-top-10.md`   | OWASP LLM Top 10 Coverage   | ✅     |
| 45      | `vercel-ai-security/03-tool-confirmation.md`  | Tool Confirmation Security  | ✅     |
| 46      | `vercel-ai-security/04-system-prompt-leak.md` | System Prompt Leakage       | ⏳     |
| 47      | `vercel-ai-security/05-rag-security.md`       | RAG Security Patterns       | ⏳     |
| 48      | `vercel-ai-security/06-token-limits.md`       | Token Limit Security        | ⏳     |

### 📦 Import Next (`import-next`) — 6 articles

| Queue # | File                                         | Title                       | Status |
| ------- | -------------------------------------------- | --------------------------- | ------ |
| 49      | `import-next/01-performance-gap.md`          | The Performance Gap         | ✅     |
| 50      | `import-next/02-no-cycle-rewrite.md`         | No-Cycle Algorithm Rewrite  | ⏳     |
| 51      | `import-next/03-barrel-file-antipatterns.md` | Barrel File Antipatterns    | ⏳     |
| 52      | `import-next/04-flat-config-migration.md`    | Flat Config Migration       | ⏳     |
| 53      | `import-next/05-team-boundaries.md`          | Team Boundaries Enforcement | ⏳     |
| 54      | `import-next/06-legacy-imports.md`           | Legacy Import Detection     | ⏳     |

### 🔑 Cryptography (`crypto`) — 5 articles

| Queue # | File                          | Title                       | Status |
| ------- | ----------------------------- | --------------------------- | ------ |
| 55      | `crypto/01-stop-using-md5.md` | Stop Using MD5              | ⏳     |
| 56      | `crypto/02-math-random.md`    | Math.random() is Not Secure | ⏳     |
| 57      | `crypto/03-timing-attacks.md` | Timing Attack Prevention    | ⏳     |
| 58      | `crypto/04-ecb-mode.md`       | ECB Mode is Dangerous       | ⏳     |
| 59      | `crypto/05-static-iv.md`      | Static IV Detection         | ⏳     |

### 🎫 JWT Security (`jwt`) — 3 articles

| Queue # | File                          | Title                      | Status |
| ------- | ----------------------------- | -------------------------- | ------ |
| 60      | `jwt/01-algorithm-none.md`    | Algorithm None Attack      | ✅     |
| 61      | `jwt/02-expiration.md`        | JWT Expiration Enforcement | ⏳     |
| 62      | `jwt/03-hardcoded-secrets.md` | Hardcoded JWT Secrets      | ⏳     |

### 🌐 Browser Security (`browser-security`) — 5 articles

| Queue # | File                                          | Title                         | Status |
| ------- | --------------------------------------------- | ----------------------------- | ------ |
| 63      | `browser-security/01-innerhtml-xss.md`        | innerHTML XSS Prevention      | ⏳     |
| 64      | `browser-security/02-localstorage-secrets.md` | LocalStorage Secrets Exposure | ⏳     |
| 65      | `browser-security/03-postmessage-origin.md`   | postMessage Origin Validation | ⏳     |
| 66      | `browser-security/04-cookie-flags.md`         | Cookie Security Flags         | ⏳     |
| 67      | `browser-security/05-websocket-security.md`   | WebSocket Security            | ⏳     |

### 🚂 Express Security (`express-security`) — 2 articles

| Queue # | File                                           | Title                 | Status |
| ------- | ---------------------------------------------- | --------------------- | ------ |
| 68      | `express-security/01-beyond-helmet.md`         | Beyond Helmet.js      | ⏳     |
| 69      | `express-security/02-cors-misconfiguration.md` | CORS Misconfiguration | ⏳     |

### ⚡ Lambda Security (`lambda-security`) — 1 article

| Queue # | File                                     | Title                   | Status |
| ------- | ---------------------------------------- | ----------------------- | ------ |
| 70      | `lambda-security/01-owasp-serverless.md` | OWASP Serverless Top 10 | ⏳     |

### 🏰 NestJS Security (`nestjs-security`) — 1 article

| Queue # | File                                | Title                    | Status |
| ------- | ----------------------------------- | ------------------------ | ------ |
| 71      | `nestjs-security/01-five-guards.md` | The Five Security Guards | ⏳     |

### ✨ Quality (`quality`) — 2 articles

| Queue # | File                            | Title                       | Status |
| ------- | ------------------------------- | --------------------------- | ------ |
| 72      | `quality/01-why-not-unicorn.md` | Why Not Unicorn?            | ⏳     |
| 73      | `quality/02-empty-catch.md`     | Empty Catch Block Detection | ⏳     |

---

## 📋 PHASE 3: Strategic & Cross-Cutting Content

### 🎯 Strategic Articles — 17 articles

| Queue # | File                                   | Title                             | Status |
| ------- | -------------------------------------- | --------------------------------- | ------ |
| 74      | `strategic/01-75-rules-missing.md`     | 75 Rules Missing from Your Linter | ⏳     |
| 75      | `strategic/01-89-rules-missing.md`     | 89 Rules Missing from Your Linter | ⏳     |
| 76      | `strategic/02-mcp-cursor.md`           | MCP + Cursor Integration          | ⏳     |
| 77      | `strategic/03-migration-guide.md`      | Migration Guide                   | ⏳     |
| 78      | `strategic/04-owasp-mapping.md`        | OWASP Mapping Masterpiece         | ✅     |
| 79      | `strategic/05-ai-native-errors.md`     | AI-Native Error Messages          | ⏳     |
| 80      | `strategic/05-benchmark-results.md`    | Benchmark Results (80% Missing)   | ✅     |
| 81      | `strategic/06-100x-process.md`         | The 100x Process                  | ⏳     |
| 82      | `strategic/06-soc2-compliance.md`      | SOC2 Compliance Automation        | ⏳     |
| 83      | `strategic/07-30min-security-audit.md` | 30-Minute Security Audit          | ✅     |
| 84      | `strategic/08-file-upload-security.md` | File Upload Security              | ⏳     |
| 85      | `strategic/09-ai-error-messages.md`    | AI Error Messages                 | ⏳     |
| 86      | `strategic/10-mobile-security-js.md`   | Mobile Security for JS            | ⏳     |
| 87      | `strategic/11-cognitive-load.md`       | Cognitive Load Reduction          | ⏳     |
| 88      | `strategic/12-perfect-pr.md`           | The Perfect PR                    | ⏳     |
| 89      | `strategic/13-ai-copilot-security.md`  | AI Copilot Security               | ⏳     |
| 90      | `strategic/14-hybrid-app-security.md`  | Hybrid App Security               | ⏳     |

### 💼 Career & Leadership — 4 articles

| Queue # | File                                         | Title                         | Status |
| ------- | -------------------------------------------- | ----------------------------- | ------ |
| 91      | `career/01-security-interview-cheatsheet.md` | Security Interview Cheatsheet | ✅     |
| 92      | `career/02-security-champion-roadmap.md`     | Security Champion Roadmap     | ⏳     |
| 93      | `leadership/01-cto-security-checklist.md`    | CTO Security Checklist        | ⏳     |
| 94      | `leadership/02-security-debt.md`             | Managing Security Debt        | ⏳     |

### 📜 Compliance — 3 articles

| Queue # | File                                  | Title                  | Status |
| ------- | ------------------------------------- | ---------------------- | ------ |
| 95      | `compliance/01-soc2-autopilot.md`     | SOC2 on Autopilot      | ⏳     |
| 96      | `compliance/02-pci-dss-developers.md` | PCI-DSS for Developers | ⏳     |
| 97      | `compliance/03-hipaa-javascript.md`   | HIPAA for JavaScript   | ⏳     |

### 🌟 Specialized Topics — 4 articles

| Queue # | File                                            | Title                        | Status |
| ------- | ----------------------------------------------- | ---------------------------- | ------ |
| 98      | `beginners/01-javascript-security-basics.md`    | JavaScript Security Basics   | ⏳     |
| 99      | `devops/01-shift-left-security.md`              | Shift-Left Security          | ⏳     |
| 100     | `opensource/01-maintainer-security-playbook.md` | Maintainer Security Playbook | ⏳     |

---

## 🔮 BONUS: Future Expansion (Post-100)

| Series                                 | Topic                      | Status     |
| -------------------------------------- | -------------------------- | ---------- |
| `trends/01-2025-security-landscape.md` | 2025 Security Landscape    | 🔮 Planned |
| `react-a11y/*`                         | Accessibility Rules Series | 🔮 Planned |
| `react-features/*`                     | React Features Series      | 🔮 Planned |
| `architecture/*`                       | Architecture Rules Series  | 🔮 Planned |

---

## 📝 How to Use This Queue

1. **Pick the next article** from the queue (lowest available #)
2. **Review the article** using `ARTICLE_CHECKLIST.md` standards
3. **Publish to Dev.to**
4. **Update this file**: Move article to "COMPLETED" section with date
5. **Cross-link**: Add links from new article to 2+ existing articles
6. **Distribute**: Follow post-publish checklist in `ARTICLE_CHECKLIST.md`

---

## 📈 Weekly Publishing Targets

| Week                     | Start # | End # | Target Articles |
| ------------------------ | ------- | ----- | --------------- |
| Week 1 (Dec 31 - Jan 6)  | 1       | 25    | 25              |
| Week 2 (Jan 7 - Jan 13)  | 26      | 50    | 25              |
| Week 3 (Jan 14 - Jan 20) | 51      | 75    | 25              |
| Week 4 (Jan 21 - Jan 27) | 76      | 100   | 25              |

---

_Last Updated: December 31, 2025_
_Total Ready Articles: 100_
