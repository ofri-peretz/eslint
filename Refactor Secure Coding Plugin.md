# Chat Conversation

Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### Planner Response

I have completed a comprehensive review of the `eslint-plugin-secure-coding` rule set.

Based on your request to keep this plugin restricted to **"pure coding security rules"** (logic, AST patterns, and generic vulnerabilities independent of environment), I have identified several categories of rules that are currently "polluting" the core plugin and should be migrated to specialized plugins like `browser-security`, `node-security`, or a potential `mobile-security` plugin.

### 1. Pure Coding Security Rules (Keep in `secure-coding`)

These rules are platform-agnostic and focus on general logic flaws and injection patterns at the language level:

- **Injection**: `no-graphql-injection`, `no-xxe-injection`, `no-xpath-injection`, `no-ldap-injection`, `no-format-string-injection`, `no-directive-injection`.
- **Regex Stability**: `detect-non-literal-regexp`, `no-redos-vulnerable-regex`, `no-unsafe-regex-construction`.
- **Logic/State**: `detect-object-injection`, `no-unsafe-deserialization`, `no-insecure-comparison`.
- **Secrets**: `no-hardcoded-credentials`, `no-hardcoded-session-tokens`.
- **Input/Output**: `no-unvalidated-user-input`, `no-improper-sanitization`, `no-improper-type-validation`.
- **Resource Management**: `no-unlimited-resource-allocation`, `no-unchecked-loop-condition`.

---

### 2. Environment-Specific Rules (Candidates for Migration)

I recommend moving the following rules to ensure `secure-coding` remains pure.

#### Move to `eslint-plugin-browser-security`

These are specifically related to the Web/DOM or Browser APIs:

- `no-clickjacking` (Browser/Headers)
- `require-csp-headers` (Browser/Network)
- `detect-mixed-content` (Browser security context)
- `no-credentials-in-query-params` (Web/URL specific)
- `no-password-in-url` (Web/URL specific)
- `no-http-urls` / `require-https-only` (Web protocol specific)
- `no-insecure-websocket` (Web protocol specific)
- `no-unescaped-url-parameter` (Web/URL specific)
- `no-insecure-redirects` (Web/Navigation specific)
- `no-missing-security-headers` / `no-missing-cors-check` (Web/Server headers)
- `no-unvalidated-deeplinks` (Strictly Mobile/Browser deep-linking)
- `no-pii-in-logs` (While generic, often relates to Web/Analytics)
- `no-sensitive-data-in-analytics` (Web/Analytics)
- `no-tracking-without-consent` (Web Privacy/GDPR)
- `no-allow-arbitrary-loads` (Browser/Mobile WebView)

#### Move to `eslint-plugin-node-security` (or specialized dev/cloud plugins)

- `no-exposed-debug-endpoints` (Environment/Server specific)
- `no-data-in-temp-storage` (Environment/Storage specific)
- `no-pii-in-logs` (If targeting server logs)
- `no-verbose-error-messages` (Often a Node/Express concern)
- `require-package-lock` / `require-dependency-integrity` (Supply chain/Node specific)

#### Specialized Plugin Needed (or `browser-security`)

- `no-electron-security-issues` (Specifically for Electron framework)

---

### Suggested Action Plan

If you would like to proceed, I can perform the following:

1.  **Relocate the rule directories** and tests to their new homes.
2.  **Update the [index.ts](cci:7://file:///Users/ofri/repos/ofriperetz.dev/eslint/packages/eslint-plugin-pg/src/index.ts:0:0-0:0) barrels** for each plugin.
3.  **Update the interface tests** I just created to reflect the new counts and rule names.

How would you like to handle the **OWASP Mobile** rules? They take up a large portion of `secure-coding` currently. Should we create a dedicated `eslint-plugin-mobile-security` or fold them into `browser-security`?

### User Input

According to your analysis, how many rules will the secure-coding remain ?

### Planner Response

Based on my analysis, `eslint-plugin-secure-coding` currently has **61** rules. After removing all framework, protocol, and environment-specific rules, it will be reduced to **23 core high-fidelity rules**.

Here is the breakdown of what remains in the "Pure" category:

### The "Pure" 23 Rules

These rules focus strictly on language-level logic, AST patterns, and fundamental security flaws that apply whether you are in Node.js, a Browser, or even a Desktop app:

1.  **Fundamental Injection (6 rules)**:
    - `no-graphql-injection`, `no-xxe-injection`, `no-xpath-injection`, `no-ldap-injection`, `no-format-string-injection`, `no-directive-injection`.
2.  **Regex Safety & Stability (3 rules)**:
    - `detect-non-literal-regexp`, `no-redos-vulnerable-regex`, `no-unsafe-regex-construction`.
3.  **Data & Logic Integrity (5 rules)**:
    - `detect-object-injection`, `no-unsafe-deserialization`, `no-insecure-comparison`, `no-improper-sanitization`, `no-improper-type-validation`.
4.  **Auth/Access Logic (5 rules)**:
    - `no-missing-authentication`, `no-privilege-escalation`, `no-weak-password-recovery`, `no-client-side-auth-logic`, `require-backend-authorization`.
5.  **Secrets & Exposure (2 rules)**:
    - `no-hardcoded-credentials`, `no-sensitive-data-exposure`.
6.  **Resource Handling (2 rules)**:
    - `no-unlimited-resource-allocation`, `no-unchecked-loop-condition`.

---

### What will be migrated (38 rules)?

To reach this "pure" state, we would move **38 rules** to more appropriate homes:

- **To `browser-security` (25 rules)**: All protocol-specific rules like CSRF, CORS, CSP, XSS (innerHTML), WebSockets, and Privacy/Tracking rules.
- **To `node-security` (8 rules)**: Supply chain rules (`package-lock`, `dependency-integrity`) and local storage/path rules.
- **To `quality` (4 rules)**: Best practices that aren't strictly security holes but relate to production readiness (minification, verbose error messages, debug code).
- **To specialized framework plugins (1 rule)**: `no-electron-security-issues`.

**Would you like me to start the migration process to clean up `secure-coding`?**
