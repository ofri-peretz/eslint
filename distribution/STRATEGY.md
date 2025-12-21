# 🚀 The "Agentic-First" Distribution Strategy

## 1. The Core Differentiator: "Rules that Fix Themselves"

Stop competing on "detection". `eslint-plugin-import` detects cycles. You differentiate on **remediation**.

- **Legacy (2020):** "Error: Cycle detected between A and B." (Dev: "Great, now what?")
- **Agentic (2025):** "Error: Cycle detected. **Fix: Extract shared types to `types.ts`** or **Use Dependency Injection**."

**Tagline:** "_The first ESLint plugins designed for AI Agents, not just Humans._"

## 2. Product-Specific Strategies

### A. `eslint-plugin-dependencies` (The "Trojan Horse")

This is your entry point into mass adoption because _everyone_ hates `eslint-plugin-import` performance.

- **The Problem:** `import/no-cycle` is notoriously slow and crashes CI on large monorepos.
  - _Validation: The Performance Gap_
    - "import/no-cycle takes 70% of lint time" ([benmosher/eslint-plugin-import#2182](https://github.com/import-js/eslint-plugin-import/issues/2182))
    - "OOM checking circular dependencies" ([StackOverflow](https://stackoverflow.com/questions/67923056/eslint-plugin-import-memory-leak))
    - "Minutes to lint a monorepo" ([Reddit Discussion](https://www.reddit.com/r/javascript/comments/11xyz5d/eslint_performance_in_monorepos/))
- **Your Solution:** `no-circular-dependencies` with **shared caching** and **incremental analysis**.
- **Launch Tactic:**
  - **Benchmark:** "Linting 10k files: `import` took 45s, `dependencies` took 0.4s."
  - **Blog Post:** "Why we rewrote `no-cycle` for 2025."
  - **Migration:** "Drop-in replacement" guide.

### B. `eslint-plugin-vercel-ai-security` (The "Vertical Specialist")

- **Target:** AI Engineers building with Vercel AI SDK.
- **The Fear:** Prompt Injection & Data Exfiltration.
- **Tactic:**
  - **"The Vercel Tax":** Position it as the mandatory "Seatbelt" for Vercel AI SDK.
  - **Templates:** Submit a PR to Vercel's template gallery (or create your own "Secure Vercel AI Starter") that includes this plugin pre-configured.
  - **Content:** "3 lines of code to hack your Vercel AI App (and 1 line to fix it)."

### C. `eslint-plugin-secure-coding` (The "Enterprise Play")

- **Target:** Security teams, CTOs, and Compliance Officers.
- **Tactic:** Focus on **compliance mapping** (SOC2, PCI-DSS).
- **Growth:** "The Badge". Encourage users to put the Security Badge in their README. It signals safety to _their_ users and drives traffic back to you.

### D. `eslint-plugin-pg` (The "Niche Expert")

- **Status:** ✅ **Ready for release.**
- **13 Rules** with 6 pg-specific "killer rules" that go beyond generic SQL:
  - `no-transaction-on-pool` - pg pool client affinity gotcha (CWE-362)
  - `no-missing-client-release` - pg pool.connect() specific (CWE-772)
  - `prevent-double-release` - pg client.release() specific (CWE-415)
  - `prefer-pool-query` - pg pool pattern optimization (CWE-400)
  - `no-unsafe-copy-from` - PostgreSQL COPY FROM (CWE-22)
  - `no-unsafe-search-path` - PostgreSQL search_path hijacking (CWE-426)
- **Benchmark:** 100% precision (0 false positives), ~785ms execution

## 3. The "Bundle" Ecosystem

Instead of just loose plugins, position them as a **Standard Library** for Agentic Engineering.

- **Future Goal:** `@forge-js/eslint-plugin-all` - A single install for full coverage.
- **Documentation:** Centralize docs. A single searchable site for all rules.

## 4. Viral "Growth Engineering" Tactics

- **Interactive Polling:** On Twitter/LinkedIn, post a code snippet. "What's wrong with this?" (Poll). Next day, reveal the answer and the plugin that catches it.
- **"Fix It For Me" Button:** In docs, link to a StackBlitz template where the error is ALREADY happening, and the user can click "Auto-Fix" to see the magic.

## 5. Documentation Strategy: The "AI-Native" Standard

Every plugin must signal that it is built for the **2025 AI Workflow** (Agents resolving issues without human intervention).

### A. The `README.md` Standard

Every README must answer: "How does this help my Agent?"

- **Badge:** `[![AI-Native: Agent Ready](https://img.shields.io/badge/AI--Native-Agent%20Ready-success)]`
- **Section: "🤖 For AI Agents"**
  - Explicit instructions on how to configure MCP (Model Context Protocol).
  - Example: "Add this to `.cursor/mcp.json` to allow Cursor to auto-fix these issues."
- **The "Structured Output" Promise:**
  - Show a comparison:
    - _Before (Legacy):_ "Error: SQL Injection."
    - _After (Yours):_ "Error: SQL Injection (CWE-89). Fix: Use parameterized query. Context: `db.query(..., [input])`."

### B. The `AGENTS.md` Standard

Each plugin root MUST have an `AGENTS.md` file. This file is **not for humans**, it is for the Agent to read (via MCP or context retrieval) to understand how to behave.

**`AGENTS.md` Content Structure:**

1.  **Rule Resolution Strategy:**
    - Map `rule-id` -> `fix-strategy`.
    - _Example:_ "If `no-circular-dependencies` triggers, PREFER `dependency-injection` pattern over `module-split` if the class is a Service."
2.  **False Positive Heuristics:**
    - "If `detect-secrets` triggers on a variable named `EXAMPLE_KEY` or `TEST_TOKEN`, IGNORE it. These are safe patterns."
3.  **Code Style Preferences:**
    - "When fixing `no-unsafe-deserialization`, prefer `JSON.parse` with schema validation (Zod) over custom parsers."

**Why this wins:**
If an Agent reads this file, it becomes **smarter** than a generic LLM. It knows your specific remediation strategies. This makes your plugin the "Best friend" of Cursor/Copilot users.

## 6. Competitive Strategy: The "Unicorn Killer" 🦄💀

You asked: _"How do I fight eslint-plugin-unicorn?"_
**Answer:** You don't fight them on "Style". You fight them on **Engineering Rigor**.

### The Insight

`eslint-plugin-unicorn` is the "Kitchen Sink" of opinionated JavaScript. It mixes useful modernization (good) with subjective style preferences (bad/annoying).

- **Unicorn's Brand:** "Make your code pretty and modern (according to Sindre)."
- **Your Brand:** "Make your code strictly correct and effectively architectural."

### The Weapon: `eslint-plugin-quality`

You already have this package. Rebrand/Refine it to be the **"Enterprise Alternative to Unicorn"**.

1.  **Strictness > Style**
    - _Unicorn:_ `prefer-array-flat` (Syntax sugar).
    - _Quality:_ `no-complexity-hotspots` (Maintainability).
    - **Pitch:** "Unicorn makes your code look nice. Quality makes your code work at scale."

2.  **The "Modern" Ruleset**
    - Port the _best_ conceptual rules from Unicorn (like `no-for-loop`) but implement them using your **performance-first** and **type-aware** patterns.
    - Market it as: "The Modern JS Presets for 2025 (without the stylistic bloat)."

3.  **Agent-Relevant**
    - Agents don't care if you use `for..of` or `.forEach` (Unicorn cares).
    - Agents DO care if you have deeply nested complexity or swallowed errors.
    - **Positioning:** "The Linter for semantic correctness, not just syntax sugar."
