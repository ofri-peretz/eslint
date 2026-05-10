# vulnerable-app — Interlace demo target

> A deliberately-vulnerable Express + Postgres app, one fixture per **flagship rule**. Use it for screenshots, blog posts, conference demos, and as the target for `interlace audit` walk-throughs.
>
> **DO NOT DEPLOY THIS.** It's vulnerable on purpose.

## What's in here

Each file demonstrates one **flagship rule** firing. Open any file to see a comment block explaining what's wrong + what fires.

| File | Flagship rule | CWE |
| :--- | :--- | :--- |
| [`src/sql-injection.js`](src/sql-injection.js) | `pg/no-unsafe-query` | CWE-89 |
| [`src/nosql-injection.js`](src/nosql-injection.js) | `mongodb-security/no-unsafe-query` | CWE-943 |
| [`src/hardcoded-credentials.js`](src/hardcoded-credentials.js) | `secure-coding/no-hardcoded-credentials` | CWE-798 |
| [`src/object-injection.js`](src/object-injection.js) | `secure-coding/detect-object-injection` | CWE-915 |
| [`src/jwt-none.js`](src/jwt-none.js) | `jwt/no-algorithm-none` | CWE-327 |
| [`src/innerhtml-xss.js`](src/innerhtml-xss.js) | `browser-security/no-innerhtml` | CWE-79 |
| [`src/circular.js`](src/circular.js) + [`src/circular-helper.js`](src/circular-helper.js) | `import-next/no-cycle` | — |
| [`src/missing-alt.jsx`](src/missing-alt.jsx) | `react-a11y/alt-text` | WCAG 1.1.1 |
| [`src/stale-deps.jsx`](src/stale-deps.jsx) | `react-features/hooks-exhaustive-deps` | — |
| [`src/llm-output.js`](src/llm-output.js) | `vercel-ai-security/no-unsafe-output-handling` | OWASP LLM02 |

## Try it

```bash
# 1. Lint everything
npx @interlace/cli audit src

# 2. Emit SARIF
npx @interlace/cli audit --sarif src > findings.sarif
# → Upload to GitHub Code Scanning Alerts via the GitHub Action

# 3. Get one rule's violations
npx @interlace/cli audit --plugin secure-coding src

# 4. Try the MCP server (from Claude Code, Cursor, or any MCP client)
npx @interlace/secure-coding-mcp
```

## In CI

Drop into any GitHub workflow:

```yaml
- uses: ofri-peretz/eslint/.github/actions/audit@main
  with:
    path: examples/vulnerable-app/src
    plugins: all
    fail-on: error
```

Findings appear in the **Code Scanning Alerts** tab, filterable by CWE.

## Expected output

```
✖ 12 problems (10 errors, 2 warnings)

  src/sql-injection.js
    8:32  error  [CWE-89] SQL string concatenation; use parameterized queries  pg/no-unsafe-query
  src/hardcoded-credentials.js
    3:18  error  [CWE-798] Hardcoded credential detected; use process.env       secure-coding/no-hardcoded-credentials
  ...
```

## Layout

```
vulnerable-app/
├── README.md                     (this file)
├── package.json                  (deps + scripts)
├── eslint.config.mjs             (Interlace recommended preset)
└── src/                          (one file per flagship rule)
```
