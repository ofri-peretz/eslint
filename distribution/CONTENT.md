# 📊 Content Publication Tracker

## Published Articles

### DEV.to

| Date         | Title                                                                            | Plugin               | Views | Reactions | Status       |
| ------------ | -------------------------------------------------------------------------------- | -------------------- | ----- | --------- | ------------ |
| Dec 20, 2024 | [Your ESLint Security Plugin is Missing 80% of Vulnerabilities](https://dev.to/) | `secure-coding`      | <25   | 0         | ✅ Published |
| Dec 20, 2024 | [Securing AI Agents in the Vercel AI SDK](https://dev.to/)                       | `vercel-ai-security` | 40    | 0         | ✅ Published |
| Dec 19, 2024 | [100% OWASP LLM Top 10 Coverage for Vercel AI SDK](https://dev.to/)              | `vercel-ai-security` | 39    | 0         | ✅ Published |
| Dec 19, 2024 | [Your Vercel AI SDK App Has a Prompt Injection Vulnerability](https://dev.to/)   | `vercel-ai-security` | —     | 0         | ✅ Published |

### Medium

| Date         | Title                                                                                | Plugin          | Views | Claps | Status       |
| ------------ | ------------------------------------------------------------------------------------ | --------------- | ----- | ----- | ------------ |
| Dec 20, 2024 | [The 30-Minute Security Audit: Onboarding a New Codebase](https://medium.com/)       | `secure-coding` | —     | —     | ✅ Published |
| Dec 20, 2024 | [Your ESLint Security Plugin is Missing 80% of Vulnerabilities](https://medium.com/) | `secure-coding` | —     | —     | ✅ Published |
| Dec 19, 2024 | [The Dev-Sec Friction Problem (And How to Eliminate It)](https://medium.com/)        | `secure-coding` | —     | —     | ✅ Published |
| Dec 18, 2024 | [How to Automate Your SOC2 Evidence Collection](https://medium.com/)                 | `secure-coding` | —     | —     | ✅ Published |
| Dec 18, 2024 | [The 100x Engineer is a Myth. The 100x Process is Real.](https://medium.com/)        | `secure-coding` | —     | 10    | ✅ Published |

### LinkedIn

| Date | Title | Plugin | Impressions | Engagement | Status      |
| ---- | ----- | ------ | ----------- | ---------- | ----------- |
| —    | —     | —      | —           | —          | 📝 None yet |

---

## Draft Pipeline

### Ready to Publish

| Source File                   | Target Platform | Topic                        | Notes                          |
| ----------------------------- | --------------- | ---------------------------- | ------------------------------ |
| `09_error_messages_for_ai.md` | DEV.to/Medium   | Designing for AI Assistants  | Key differentiator for Agentic |
| `08_file_upload_risks.md`     | Medium          | Hidden File Upload Risks     | Deep security dive             |
| `07_5min_node_security.md`    | DEV.to          | 5-Min Node.js Security Setup | Beginner-friendly quick wins   |

### High Priority (Launch Posts)

| Plugin         | Target Platform | Topic                                | Status     |
| -------------- | --------------- | ------------------------------------ | ---------- |
| `dependencies` | DEV.to/Medium   | "Why We Rewrote `no-cycle` for 2025" | 📝 Draft   |
| `pg`           | DEV.to          | "13 ESLint Rules for PostgreSQL"     | 📝 Draft   |
| `quality`      | Medium          | "Enterprise Alternative to Unicorn"  | 📝 Planned |

### In Progress

| Source File                | Target Platform | Notes              |
| -------------------------- | --------------- | ------------------ |
| `10_mobile_security_js.md` | Medium          | OWASP Mobile in JS |

---

## Content Calendar (Upcoming)

| Week      | Platform | Topic                                        | Plugin               |
| --------- | -------- | -------------------------------------------- | -------------------- |
| Jan 6-10  | Medium   | Benchmark Results Article                    | `secure-coding`      |
| Jan 13-17 | LinkedIn | "3 Lines of Code to Hack Your Vercel AI App" | `vercel-ai-security` |
| Jan 20-24 | DEV.to   | `no-circular-dependencies` Performance Story | `dependencies`       |

---

## 📚 Education Series: Pure Coding Vulnerabilities (Dev.to)

> **Series Goal:** One article per rule category, teaching the vulnerability AND the ESLint fix.  
> **Package:** [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)  
> **Docs Base:** `https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-secure-coding/docs/rules`

### Secrets & Credentials (3 articles)

| #   | Title                                                                | Rules                            | Docs                                                                                                                                      | Status     |
| --- | -------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | **"Hardcoded Secrets: The #1 Vulnerability AI Agents Can Auto-Fix"** | `no-hardcoded-credentials`       | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-hardcoded-credentials.md)       | 📝 Planned |
| 2   | **"Stop Storing Credentials in localStorage"**                       | `no-credentials-in-storage-api`  | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-credentials-in-storage-api.md)  | 📝 Planned |
| 3   | **"Why Query Params Are the Worst Place for Secrets"**               | `no-credentials-in-query-params` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-credentials-in-query-params.md) | 📝 Planned |

### Injection Prevention (4 articles)

| #   | Title                                                            | Rules                         | Docs                                                                                                                                   | Status     |
| --- | ---------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 4   | **"3 eval() Patterns That Still Ship to Production"**            | `detect-eval-with-expression` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-eval-with-expression.md) | 📝 Planned |
| 5   | **"Command Injection in Node.js: Beyond child_process"**         | `detect-child-process`        | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-child-process.md)        | 📝 Planned |
| 6   | **"Dynamic require() is a Security Hole"**                       | `no-unsafe-dynamic-require`   | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unsafe-dynamic-require.md)   | 📝 Planned |
| 7   | **"Format String Injection: The C Vulnerability in JavaScript"** | `no-format-string-injection`  | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-format-string-injection.md)  | 📝 Planned |

### Regex & ReDoS (3 articles)

| #   | Title                                                       | Rules                          | Docs                                                                                                                                    | Status     |
| --- | ----------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 8   | **"ReDoS: The Regex Attack Nobody Talks About"**            | `detect-non-literal-regexp`    | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-non-literal-regexp.md)    | 📝 Planned |
| 9   | **"Detecting ReDoS-Vulnerable Patterns Before Production"** | `no-redos-vulnerable-regex`    | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-redos-vulnerable-regex.md)    | 📝 Planned |
| 10  | **"User Input in RegExp: A Recipe for Disaster"**           | `no-unsafe-regex-construction` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unsafe-regex-construction.md) | 📝 Planned |

### Object & Prototype Security (2 articles)

| #   | Title                                                          | Rules                       | Docs                                                                                                                                 | Status     |
| --- | -------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 11  | **"Prototype Pollution: Why obj[key] is Dangerous"**           | `detect-object-injection`   | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-object-injection.md)   | 📝 Planned |
| 12  | **"Unsafe Deserialization: Why JSON.parse Isn't Always Safe"** | `no-unsafe-deserialization` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unsafe-deserialization.md) | 📝 Planned |

### Cryptography (6 articles)

| #   | Title                                                    | Rules                         | Docs                                                                                                                                   | Status     |
| --- | -------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 13  | **"Weak Crypto Still Ships in 2025"**                    | `no-weak-crypto`              | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-weak-crypto.md)              | 📝 Planned |
| 14  | **"Math.random() is Not Random Enough"**                 | `no-insufficient-random`      | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-insufficient-random.md)      | 📝 Planned |
| 15  | **"Timing Attacks: The Side-Channel You're Ignoring"**   | `no-timing-attack`            | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-timing-attack.md)            | 📝 Planned |
| 16  | **"String Comparison is Insecure for Secrets"**          | `no-insecure-comparison`      | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-insecure-comparison.md)      | 📝 Planned |
| 17  | **"JWT Security Anti-Patterns"**                         | `no-insecure-jwt`             | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-insecure-jwt.md)             | 📝 Planned |
| 18  | **"Hardcoded Session Tokens: A Critical Vulnerability"** | `no-hardcoded-session-tokens` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-hardcoded-session-tokens.md) | 📝 Planned |

### Input Validation & XSS (5 articles)

| #   | Title                                                    | Rules                         | Docs                                                                                                                                   | Status     |
| --- | -------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 19  | **"XSS via innerHTML: The Classic That Won't Die"**      | `no-unsanitized-html`         | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unsanitized-html.md)         | 📝 Planned |
| 20  | **"URL Parameters Are User Input"**                      | `no-unescaped-url-parameter`  | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unescaped-url-parameter.md)  | 📝 Planned |
| 21  | **"Improper Sanitization: When DOMPurify Isn't Enough"** | `no-improper-sanitization`    | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-improper-sanitization.md)    | 📝 Planned |
| 22  | **"Type Confusion Vulnerabilities in JavaScript"**       | `no-improper-type-validation` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-improper-type-validation.md) | 📝 Planned |
| 23  | **"Unvalidated User Input: The Root of All Evil"**       | `no-unvalidated-user-input`   | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unvalidated-user-input.md)   | 📝 Planned |

### Path & File Security (3 articles)

| #   | Title                                                | Rules                            | Docs                                                                                                                                      | Status     |
| --- | ---------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 24  | **"Path Traversal Beyond ../"**                      | `detect-non-literal-fs-filename` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-non-literal-fs-filename.md) | 📝 Planned |
| 25  | **"Zip Slip: The Archive Extraction Vulnerability"** | `no-zip-slip`                    | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-zip-slip.md)                    | 📝 Planned |
| 26  | **"TOCTOU: The Race Condition in Your File System"** | `no-toctou-vulnerability`        | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-toctou-vulnerability.md)        | 📝 Planned |

### Cookie & Session Security (3 articles)

| #   | Title                                         | Rules                         | Docs                                                                                                                                   | Status     |
| --- | --------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 27  | **"The Cookie Security Checklist"**           | `no-insecure-cookie-settings` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-insecure-cookie-settings.md) | 📝 Planned |
| 28  | **"CSRF Protection: Still Relevant in 2025"** | `no-missing-csrf-protection`  | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-missing-csrf-protection.md)  | 📝 Planned |
| 29  | **"document.cookie is a Security Smell"**     | `no-document-cookie`          | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-document-cookie.md)          | 📝 Planned |

### Auth & Access Control (3 articles)

| #   | Title                                                 | Rules                       | Docs                                                                                                                                 | Status     |
| --- | ----------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 30  | **"Missing Authentication Checks in Express"**        | `no-missing-authentication` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-missing-authentication.md) | 📝 Planned |
| 31  | **"Privilege Escalation Patterns to Avoid"**          | `no-privilege-escalation`   | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-privilege-escalation.md)   | 📝 Planned |
| 32  | **"Client-Side Auth Logic is Still a Security Hole"** | `no-client-side-auth-logic` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-client-side-auth-logic.md) | 📝 Planned |

### Network & Headers (5 articles)

| #   | Title                                                  | Rules                                         | Docs                                                                                                                                   | Status     |
| --- | ------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 33  | **"CORS Misconfigurations: The Silent Vulnerability"** | `no-missing-cors-check`, `no-permissive-cors` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-missing-cors-check.md)       | 📝 Planned |
| 34  | **"Security Headers Every App Needs"**                 | `no-missing-security-headers`                 | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-missing-security-headers.md) | 📝 Planned |
| 35  | **"Open Redirects: The Phishing Enabler"**             | `no-insecure-redirects`                       | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-insecure-redirects.md)       | 📝 Planned |
| 36  | **"Clickjacking Prevention with X-Frame-Options"**     | `no-clickjacking`                             | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-clickjacking.md)             | 📝 Planned |
| 37  | **"HTTP vs HTTPS: Why It Still Matters"**              | `no-http-urls`, `require-https-only`          | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-http-urls.md)                | 📝 Planned |

### Error Handling & Logging (4 articles)

| #   | Title                                                       | Rules                         | Docs                                                                                                                                   | Status     |
| --- | ----------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 38  | **"Stop Leaking PII in Your Logs"**                         | `no-pii-in-logs`              | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-pii-in-logs.md)              | 📝 Planned |
| 39  | **"Stack Traces Are Information Leaks"**                    | `no-verbose-error-messages`   | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-verbose-error-messages.md)   | 📝 Planned |
| 40  | **"Debug Code That Made It to Production"**                 | `no-debug-code-in-production` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-debug-code-in-production.md) | 📝 Planned |
| 41  | **"Exposed Debug Endpoints: A Penetration Tester's Dream"** | `no-exposed-debug-endpoints`  | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-exposed-debug-endpoints.md)  | 📝 Planned |

### Buffer, Memory & DoS (3 articles)

| #   | Title                                                | Rules                              | Docs                                                                                                                                        | Status     |
| --- | ---------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 42  | **"Buffer Over-read in Node.js"**                    | `no-buffer-overread`               | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-buffer-overread.md)               | 📝 Planned |
| 43  | **"Unbounded Resource Allocation: The DoS Pattern"** | `no-unlimited-resource-allocation` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unlimited-resource-allocation.md) | 📝 Planned |
| 44  | **"Infinite Loop Detection in ESLint"**              | `no-unchecked-loop-condition`      | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unchecked-loop-condition.md)      | 📝 Planned |

### Platform-Specific (2 articles)

| #   | Title                                                      | Rules                                    | Docs                                                                                                                                              | Status     |
| --- | ---------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 45  | **"Electron Security: The Desktop Vulnerability Surface"** | `no-electron-security-issues`            | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-electron-security-issues.md)            | 📝 Planned |
| 46  | **"postMessage Origin Validation: The iframe Attack"**     | `no-insufficient-postmessage-validation` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-insufficient-postmessage-validation.md) | 📝 Planned |

---

### Series Summary

| Category                 | Articles | Priority  |
| ------------------------ | -------- | --------- |
| Secrets & Credentials    | 3        | 🔴 High   |
| Injection Prevention     | 4        | 🔴 High   |
| Cryptography             | 6        | 🟡 Medium |
| Input Validation & XSS   | 5        | 🔴 High   |
| Cookie & Session         | 3        | 🟡 Medium |
| Path & File Security     | 3        | 🟡 Medium |
| Auth & Access Control    | 3        | 🟡 Medium |
| Network & Headers        | 5        | 🟡 Medium |
| Error Handling & Logging | 4        | 🟢 Low    |
| Regex & ReDoS            | 3        | 🟡 Medium |
| Object & Prototype       | 2        | 🟡 Medium |
| Buffer, Memory & DoS     | 3        | 🟢 Low    |
| Platform-Specific        | 2        | 🟢 Low    |
| **Total**                | **46**   |           |

---

## 🎯 Strategic Articles: secure-coding (Dev.to)

> **Goal:** Position the plugin as the enterprise-grade security standard.  
> **CTA Pattern:** Each article ends with "Install in 30 seconds" + code snippet + npm link.

### Benchmark & Comparison

| #   | Title                                                   | Angle                                  | CTA Focus                               |
| --- | ------------------------------------------------------- | -------------------------------------- | --------------------------------------- |
| S1  | **"89 Security Rules Your Linter is Missing"**          | Gap analysis vs eslint-plugin-security | Show rule count comparison, link to npm |
| S2  | **"We Benchmarked 5 ESLint Security Plugins"**          | Performance + coverage comparison      | Benchmark table, migration guide        |
| S3  | **"100% Precision: How We Eliminated False Positives"** | v2.2.7 technical deep-dive             | Before/after examples, upgrade command  |

### Compliance & Enterprise

| #   | Title                                               | Angle                       | CTA Focus                               |
| --- | --------------------------------------------------- | --------------------------- | --------------------------------------- |
| S4  | **"SOC2 Evidence Collection with ESLint"**          | Compliance automation       | Show CWE/CVSS in output, config example |
| S5  | **"Mapping Your Codebase to OWASP Top 10"**         | Coverage matrix walkthrough | `owasp-top-10` preset config            |
| S6  | **"The Security Audit Report ESLint Can Generate"** | CI/CD output formatting     | JSON reporter + badge example           |

### AI/Agentic Positioning

| #   | Title                                                       | Angle                    | CTA Focus                  |
| --- | ----------------------------------------------------------- | ------------------------ | -------------------------- |
| S7  | **"Why AI Agents Love Structured Error Messages"**          | 2-line format advantage  | Error format comparison    |
| S8  | **"MCP + ESLint: Auto-Fixing Security Issues with Cursor"** | Practical MCP setup      | `.cursor/mcp.json` config  |
| S9  | **"AGENTS.md: Teaching AI How to Fix Your Code"**           | AGENTS.md standard       | Link to AGENTS.md template |
| S10 | **"The First ESLint Plugin Built for AI Agents"**           | Positioning/launch piece | Full install + MCP setup   |

### Adoption & Migration

| #   | Title                                                      | Angle                     | CTA Focus                      |
| --- | ---------------------------------------------------------- | ------------------------- | ------------------------------ |
| S11 | **"Migrating from eslint-plugin-security in 5 Minutes"**   | Drop-in replacement       | Side-by-side config comparison |
| S12 | **"The 30-Minute Security Audit for Any Codebase"**        | Quick wins onboarding     | npx eslint . command           |
| S13 | **"recommended vs strict vs owasp: Choosing Your Preset"** | Configuration guide       | 3 preset examples              |
| S14 | **"Rolling Out Security Linting to 50 Repos"**             | Enterprise adoption story | Shareable config pattern       |

### Framework-Specific

| #   | Title                                                | Angle             | CTA Focus                     |
| --- | ---------------------------------------------------- | ----------------- | ----------------------------- |
| S15 | **"Securing Express.js with 89 ESLint Rules"**       | Express patterns  | Express-specific rules demo   |
| S16 | **"Next.js Security Beyond the Defaults"**           | Next.js patterns  | next.config.js + eslint setup |
| S17 | **"React Native Security with OWASP Mobile Top 10"** | Mobile preset     | `owasp-mobile-top-10` config  |
| S18 | **"Electron Desktop App Security Checklist"**        | Platform-specific | Electron rules demo           |

---

## 🐘 Education Series: PostgreSQL Security (Dev.to)

> **Package:** [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)  
> **Docs Base:** `https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-pg/docs/rules`  
> **CTA Pattern:** Each article shows vulnerable code → fixed code → one-line install.

### Security Rules (6 articles)

| #   | Title                                                                    | Rule                       | Docs                                                                                                                     | CTA Example                                                   |
| --- | ------------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| P1  | **"SQL Injection in node-postgres: The Pattern Everyone Gets Wrong"**    | `no-unsafe-query`          | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-unsafe-query.md)          | `client.query('SELECT * FROM users WHERE id = $1', [userId])` |
| P2  | **"Why You Should Never Disable SSL in PostgreSQL"**                     | `no-insecure-ssl`          | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-insecure-ssl.md)          | `ssl: { rejectUnauthorized: true }`                           |
| P3  | **"Hardcoded Database Passwords: The #1 PostgreSQL Mistake"**            | `no-hardcoded-credentials` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-hardcoded-credentials.md) | `process.env.DATABASE_PASSWORD`                               |
| P4  | **"search_path Hijacking: The PostgreSQL Attack You've Never Heard Of"** | `no-unsafe-search-path`    | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-unsafe-search-path.md)    | Static search_path example                                    |
| P5  | **"COPY FROM Exploits: When PostgreSQL Reads Your Filesystem"**          | `no-unsafe-copy-from`      | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-unsafe-copy-from.md)      | Parameterized COPY example                                    |
| P6  | **"Transaction Race Conditions: Why BEGIN on Pool Breaks Everything"**   | `no-transaction-on-pool`   | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-transaction-on-pool.md)   | `pool.connect()` → transaction pattern                        |

### Resource Management (3 articles)

| #   | Title                                                               | Rule                        | Docs                                                                                                                      | CTA Example                        |
| --- | ------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| P7  | **"The Connection Leak That Took Down Our Production Database"**    | `no-missing-client-release` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-missing-client-release.md) | `try/finally { client.release() }` |
| P8  | **"Double Release: The Silent PostgreSQL Pool Killer"**             | `prevent-double-release`    | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/prevent-double-release.md)    | Release tracking pattern           |
| P9  | **"Floating Queries: The Unhandled Promise in Your Database Code"** | `no-floating-query`         | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-floating-query.md)         | `await client.query()`             |

### Performance & Quality (4 articles)

| #   | Title                                                     | Rule                   | Docs                                                                                                                 | CTA Example                 |
| --- | --------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| P10 | **"Parameter Mismatch: The $1 $2 Bug That Wastes Hours"** | `check-query-params`   | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/check-query-params.md)   | Matching placeholder count  |
| P11 | **"SELECT \* is Killing Your PostgreSQL Performance"**    | `no-select-all`        | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-select-all.md)        | Explicit column selection   |
| P12 | **"pool.query() vs pool.connect(): When to Use Each"**    | `prefer-pool-query`    | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/prefer-pool-query.md)    | Simple query pattern        |
| P13 | **"The N+1 Insert Loop That Slowed Our API to a Crawl"**  | `no-batch-insert-loop` | [docs](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-batch-insert-loop.md) | Bulk insert with `unnest()` |

### Summary

| Category              | Articles |
| --------------------- | -------- |
| Security              | 6        |
| Resource Management   | 3        |
| Performance & Quality | 4        |
| **Total**             | **13**   |

---

## 📊 Complete Article Pipeline Summary

| Series                                 | Plugin          | Articles | Platform |
| -------------------------------------- | --------------- | -------- | -------- |
| Education: Pure Coding Vulnerabilities | `secure-coding` | 46       | Dev.to   |
| Strategic: Benchmark/Compliance/AI     | `secure-coding` | 18       | Dev.to   |
| Education: PostgreSQL Security         | `pg`            | 13       | Dev.to   |
| **Total Planned**                      |                 | **77**   |          |

---

## Performance Summary

| Platform  | Total Posts | Total Views | Total Engagement | Avg Views/Post |
| --------- | ----------- | ----------- | ---------------- | -------------- |
| DEV.to    | 4           | ~104        | 0 reactions      | ~26            |
| Medium    | 5           | —           | 10 claps         | —              |
| LinkedIn  | 0           | 0           | 0                | —              |
| **Total** | **9**       | —           | 10               | —              |

> **Next Actions:**
>
> - Add actual URLs to all published articles
> - Track Medium stats after 7 days
> - Publish `dependencies` launch post (the "Trojan Horse")
