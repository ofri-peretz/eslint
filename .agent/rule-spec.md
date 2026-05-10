# RuleSpec — Canonical Machine-Readable Rule Contract

> **Purpose**: Define a single, stable, agent-readable JSON shape that represents one ESLint rule across all consumers — the docs site renderer, `llms.txt`, OG card generator, future MCP server, IDE integrations, and external automation. One source, many surfaces. This spec is the contract those consumers depend on.

_Last updated: 2026-05-10_  
_Spec version: `1.0.0` (draft)_  
_Tracking: Wave 1, action #2 of [DOCS_PHILOSOPHY.md](../DOCS_PHILOSOPHY.md)_

---

## Why this exists

Per [DOCS_PHILOSOPHY.md](../DOCS_PHILOSOPHY.md), our strategic moat is **agent-native docs** — Claude/Cursor/Copilot/Cline can consume our rule corpus as structured data, not scraped HTML. The docs site already projects rule metadata (`meta.schema`, `meta.docs`) into MDX at build time; what's missing is the parallel projection into JSON at deterministic URLs, with a stable contract agents and external automation can rely on across versions.

Without RuleSpec, every consumer (the renderer, the OG generator, the future MCP server) re-derives "what does this rule look like" from raw rule modules, drifts, and duplicates logic. With RuleSpec, the projection happens once and every consumer reads the same shape.

## Design principles

1. **One source, many surfaces.** RuleSpec is *the* contract. Renderer, OG, llms.txt, MCP server, external tools all read the same shape.
2. **Derive from `packages/*`, never re-author.** Every field traces to a source file in a plugin package — see [field provenance](#field-provenance). Hand-edits to the projection are a build error.
3. **Stable across plugin versions.** Field semantics, names, and types are versioned via `specVersion`. Breaking the contract requires bumping it.
4. **Two granularities.** A heavy per-rule shape (`RuleSpec`) and a light index shape (`RuleSpecSummary`). Agents that scan the catalog use the index; agents that resolve a specific rule use the full spec.
5. **Cacheable and dated.** Every response carries `lastModified` and an `ETag`; clients (including LLMs) can cache safely.
6. **Forward-compatible.** Unknown future fields land under `extensions.*`. Consumers ignore unknown fields; producers never repurpose existing names.

## The schemas

### `RuleSpec` (full)

```ts
interface RuleSpec {
  // ── Identity ──────────────────────────────────────────────────────────────
  /** Globally unique: `<plugin>/<name>`, e.g. `pg/no-unsafe-query`. */
  id: string;
  /** Plugin name without the `eslint-plugin-` prefix, e.g. `pg`. */
  plugin: string;
  /** Rule name within the plugin, e.g. `no-unsafe-query`. */
  name: string;
  /** Plugin version this spec was generated from. */
  pluginVersion: string;

  // ── Documentation ─────────────────────────────────────────────────────────
  /** Human title (defaults to `id`). */
  title: string;
  /** One-line summary from `meta.docs.description`. */
  description: string;
  /** Logical grouping from `meta.docs.category` (e.g. `security`, `quality`). */
  category: string | null;
  /** Canonical docs URL (must resolve — enforced in CI). */
  url: string;
  /** Markdown URL for agent consumption (`<url>.md`). */
  markdownUrl: string;

  // ── Behavior ──────────────────────────────────────────────────────────────
  /** `'problem' | 'suggestion' | 'layout'` from `meta.type`. */
  type: 'problem' | 'suggestion' | 'layout';
  /** Whether the rule provides an autofix and what scope. */
  fixable: 'code' | 'whitespace' | null;
  /** Whether the rule provides editor suggestions. */
  hasSuggestions: boolean;
  /** Marked deprecated; `replacedBy` lists successor rule IDs. */
  deprecated: boolean;
  replacedBy: string[];

  // ── Recommendation & severity ─────────────────────────────────────────────
  /** Presets that include this rule (e.g. `['recommended', 'security']`). */
  presets: string[];
  /** Default severity when included via a preset. */
  severityDefault: 'error' | 'warn' | 'off' | null;

  // ── Configuration contract ────────────────────────────────────────────────
  /** The rule's JSON Schema for options (mirrors `meta.schema`). */
  schema: object | null;
  /** Default options applied when consumer passes none. */
  defaultOptions: unknown[];

  // ── Quality signals (our differentiators) ─────────────────────────────────
  /**
   * Whether the rule needs the TypeScript type checker.
   * Per `.agent/type-awareness-philosophy.md`: prefer false; only true when
   * type-awareness genuinely improves precision.
   */
  typeAware: boolean;
  /** Whether the rule is one of the 10 flagship rules per `.agent/flagship-rules.md`. */
  flagship: boolean;
  /**
   * Oxlint compatibility tier:
   *   'parity'      — fully reproducible in oxlint's JS-plugin tier
   *   'js-only'     — runs only via JS plugin (slower path)
   *   'eslint-only' — incompatible with oxlint
   *   null          — not yet evaluated
   */
  oxlintParity: 'parity' | 'js-only' | 'eslint-only' | null;
  /** Mapped CWE identifiers (e.g. `['CWE-89']` for SQL injection). */
  cweMapping: string[];
  /** Mapped OWASP categories (e.g. `['A03:2021-Injection']`). */
  owaspMapping: string[];

  // ── Examples ──────────────────────────────────────────────────────────────
  /** Code that should trigger the rule, with expected diagnostics. */
  examples: {
    bad: Array<{
      code: string;
      languageId: 'js' | 'jsx' | 'ts' | 'tsx';
      errors: Array<{ messageId: string; line?: number; column?: number }>;
    }>;
    good: Array<{
      code: string;
      languageId: 'js' | 'jsx' | 'ts' | 'tsx';
    }>;
    /** Pairs of (incorrect input, fixer output) when `fixable !== null`. */
    fixed: Array<{
      input: string;
      output: string;
      languageId: 'js' | 'jsx' | 'ts' | 'tsx';
    }>;
  };

  // ── Relations ─────────────────────────────────────────────────────────────
  /** Other rules in our ecosystem that overlap or complement this one. */
  relatedRules: string[];
  /**
   * Competitor rules this replaces or improves on.
   * Shape: `{ source: 'eslint-plugin-foo', rule: 'no-bar', relation: 'replaces' | 'extends' | 'narrower' }`
   */
  comparableRules: Array<{
    source: string;
    rule: string;
    relation: 'replaces' | 'extends' | 'narrower';
  }>;

  // ── Metadata ──────────────────────────────────────────────────────────────
  /** ISO 8601 timestamp the projection was generated. */
  lastModified: string;
  /** Spec version this object conforms to (this document's version). */
  specVersion: string;
  /** Reserved bag for future fields without breaking the contract. */
  extensions: Record<string, unknown>;
}
```

### `RuleSpecSummary` (index)

```ts
interface RuleSpecSummary {
  id: string;
  plugin: string;
  name: string;
  description: string;
  category: string | null;
  url: string;
  type: RuleSpec['type'];
  fixable: RuleSpec['fixable'];
  hasSuggestions: boolean;
  deprecated: boolean;
  presets: string[];
  typeAware: boolean;
  flagship: boolean;
  oxlintParity: RuleSpec['oxlintParity'];
}

interface RuleIndexResponse {
  /** Catalog version: monorepo version or git SHA. */
  catalogVersion: string;
  /** ISO 8601 timestamp of catalog generation. */
  generatedAt: string;
  /** Total rules in the catalog. */
  count: number;
  /** Plugins covered. */
  plugins: Array<{ name: string; version: string; ruleCount: number }>;
  /** All rules, sorted by `id`. */
  rules: RuleSpecSummary[];
}
```

## Endpoint contract

| URL | Returns | Cache |
|---|---|---|
| `GET /api/rules/index.json` | `RuleIndexResponse` | `public, max-age=3600, stale-while-revalidate=86400`; ETag = sha256 of body |
| `GET /api/rules/[plugin]/[rule].json` | `RuleSpec` | same as above |
| `GET /api/rules/index.json?preset=recommended` | filtered `RuleIndexResponse` | per-query ETag |
| `GET /api/rules/index.json?plugin=pg` | filtered `RuleIndexResponse` | per-query ETag |
| `GET /api/rules/index.json?flagship=true` | filtered `RuleIndexResponse` | per-query ETag |

**Headers (all endpoints):**
- `Content-Type: application/json; charset=utf-8`
- `X-Spec-Version: 1.0.0`
- `Access-Control-Allow-Origin: *` (public, read-only data)
- `Vary: Accept-Encoding`

**404 contract:** unknown `plugin` or `rule` returns `{ "error": "not_found", "id": "<requested>" }` with HTTP 404.

**Versioning:** breaking changes bump `specVersion` major. Old major versions stay live at `/api/v<N>/rules/...` for at least 6 months after deprecation announcement.

## Field provenance

Every RuleSpec field traces to a source location in `packages/*` so the projection is mechanical and auditable:

| RuleSpec field | Source |
|---|---|
| `id`, `plugin`, `name` | filesystem: `packages/<plugin>/src/rules/<name>.ts` |
| `pluginVersion` | `packages/<plugin>/package.json` `version` |
| `description`, `category` | `meta.docs.description`, `meta.docs.category` in rule module |
| `url` | derived: `https://eslint.ofriperetz.dev/docs/<plugin>/rules/<name>` |
| `markdownUrl` | derived: `<url>.md` |
| `type` | `meta.type` |
| `fixable` | `meta.fixable` |
| `hasSuggestions` | `meta.hasSuggestions` |
| `deprecated`, `replacedBy` | `meta.deprecated`, `meta.replacedBy` |
| `presets` | scan `packages/<plugin>/src/configs/*.ts` for which configs include the rule |
| `severityDefault` | severity used in the first preset that includes it (`recommended` wins) |
| `schema` | `meta.schema` (JSON Schema) |
| `defaultOptions` | static analysis of rule body or explicit `meta.defaultOptions` if added |
| `typeAware` | scan rule module for `parserServices.program` / `getTypeChecker()` references; cross-check with `.agent/type-awareness-scan.tsv` |
| `flagship` | look up in `.agent/flagship-rules.md` flagship list |
| `oxlintParity` | look up in `.agent/oxlint-parity-cache.json` |
| `cweMapping`, `owaspMapping` | `meta.docs.cwe[]`, `meta.docs.owasp[]` (new convention — see [open questions](#open-questions)) |
| `examples.{bad,good,fixed}` | `packages/<plugin>/src/rules/__tests__/<name>.test.ts` — extracted from the rule's `RuleTester` cases |
| `relatedRules` | `meta.docs.related[]` (new convention) |
| `comparableRules` | `meta.docs.comparable[]` (new convention) |
| `lastModified` | git `--format=%cI` of the rule file |

**CI gate:** every rule in `packages/*/src/rules/` must produce a valid `RuleSpec`. A rule whose projection fails fails the package's build. This is the [DOCS_PHILOSOPHY.md](../DOCS_PHILOSOPHY.md) "derive, don't curate" principle enforced as code.

## Sample output

### `GET /api/rules/pg/no-unsafe-query.json`

```json
{
  "id": "pg/no-unsafe-query",
  "plugin": "pg",
  "name": "no-unsafe-query",
  "pluginVersion": "0.4.2",
  "title": "pg/no-unsafe-query",
  "description": "Disallow string-concatenated SQL queries; require parameterized queries",
  "category": "security",
  "url": "https://eslint.ofriperetz.dev/docs/pg/rules/no-unsafe-query",
  "markdownUrl": "https://eslint.ofriperetz.dev/docs/pg/rules/no-unsafe-query.md",
  "type": "problem",
  "fixable": null,
  "hasSuggestions": true,
  "deprecated": false,
  "replacedBy": [],
  "presets": ["recommended", "security-strict"],
  "severityDefault": "error",
  "schema": {
    "type": "array",
    "items": [
      {
        "type": "object",
        "properties": {
          "allowedClients": { "type": "array", "items": { "type": "string" } }
        },
        "additionalProperties": false
      }
    ]
  },
  "defaultOptions": [{ "allowedClients": [] }],
  "typeAware": false,
  "flagship": true,
  "oxlintParity": "js-only",
  "cweMapping": ["CWE-89"],
  "owaspMapping": ["A03:2021-Injection"],
  "examples": {
    "bad": [
      {
        "code": "client.query('SELECT * FROM users WHERE id = ' + userId)",
        "languageId": "ts",
        "errors": [{ "messageId": "unsafeQuery", "line": 1, "column": 1 }]
      }
    ],
    "good": [
      {
        "code": "client.query('SELECT * FROM users WHERE id = $1', [userId])",
        "languageId": "ts"
      }
    ],
    "fixed": []
  },
  "relatedRules": ["secure-coding/no-hardcoded-credentials"],
  "comparableRules": [
    { "source": "eslint-plugin-security", "rule": "detect-non-literal-fs-filename", "relation": "narrower" }
  ],
  "lastModified": "2026-04-22T14:31:08Z",
  "specVersion": "1.0.0",
  "extensions": {}
}
```

### `GET /api/rules/index.json` (truncated)

```json
{
  "catalogVersion": "0.12.0",
  "generatedAt": "2026-05-10T08:00:00Z",
  "count": 272,
  "plugins": [
    { "name": "pg", "version": "0.4.2", "ruleCount": 18 },
    { "name": "secure-coding", "version": "0.7.1", "ruleCount": 41 }
  ],
  "rules": [
    {
      "id": "pg/no-unsafe-query",
      "plugin": "pg",
      "name": "no-unsafe-query",
      "description": "Disallow string-concatenated SQL queries; require parameterized queries",
      "category": "security",
      "url": "https://eslint.ofriperetz.dev/docs/pg/rules/no-unsafe-query",
      "type": "problem",
      "fixable": null,
      "hasSuggestions": true,
      "deprecated": false,
      "presets": ["recommended", "security-strict"],
      "typeAware": false,
      "flagship": true,
      "oxlintParity": "js-only"
    }
  ]
}
```

## What this enables

Each downstream consumer becomes a thin projection over RuleSpec rather than a separate scraper:

- **Docs renderer** — the rule page reads `RuleSpec` and renders `<RuleMeta>`, `<RuleOptions>`, `<RuleExample>` from it. Hand-written prose lives in a sibling `<rule>.notes.mdx` (see [DOCS_PHILOSOPHY.md topic 1](../DOCS_PHILOSOPHY.md)).
- **`llms.txt` index** — generated by mapping `RuleIndexResponse.rules` to one Markdown line per rule, grouped by plugin. Filtered variants (`/llms-flagship.txt`, `/llms-security.txt`) are query-params over the index.
- **OG card generator** — Satori template reads `description`, `plugin`, `category`, `fixable`, `hasSuggestions` to render a per-rule card.
- **MCP server** — exposes tools `search_rules(query)`, `get_rule(id)`, `lint_snippet(code, ruleIds)` that internally call the RuleSpec endpoints. No model access to plugin source needed.
- **Agent-trust link check** — for every rule, fetch its `url` and assert HTTP 200. CI gate.
- **External automation** — anyone writing a "is my codebase covered by Interlace" tool reads `index.json`, no scraping.

## Out of scope for v1

- Localized strings (per [DOCS_PHILOSOPHY.md topic 7](../DOCS_PHILOSOPHY.md), we are English-only).
- Plugin-level metadata beyond `name`/`version`/`ruleCount` (no plugin-level descriptions, plugin authors, etc. — add when needed).
- Cross-rule "playground" run output (separate concern; the [RulePlayground RFC](../DOCS_PHILOSOPHY.md) covers that).
- Versioned per-rule history (`changelog` per rule); v2 candidate.
- WebSub / push notifications when a rule changes; agents poll the index.

## Open questions

These need a call before implementation begins. Defaults proposed in italics.

1. **CWE / OWASP mapping format.** Add `meta.docs.cwe: string[]` and `meta.docs.owasp: string[]` to all security rules, or store mapping out-of-band in `.agent/`? *Default: in-rule (`meta.docs.cwe`) so it travels with the rule and stays under PR review.*
2. **Defaults extraction.** Should `defaultOptions` come from a new `meta.defaultOptions` we'd add, or via static analysis of the rule body? *Default: explicit `meta.defaultOptions` for clarity.*
3. **Examples extraction.** Pull from `RuleTester` test cases automatically, or duplicate into `meta.docs.examples`? *Default: pull from RuleTester so tests and docs cannot drift.*
4. **`relatedRules` curation.** Author-curated in `meta.docs.related[]`, or inferred from co-occurrence in test fixtures? *Default: author-curated for now; revisit when we have inference signal worth trusting.*
5. **MCP server hosting.** Host alongside docs site (Vercel function), or as a separate npm package consumers run locally (`npx @interlace/eslint-mcp`)? *Default: both — Vercel-hosted for pure inference, npm package for IDEs that prefer local.*
6. **Rate limiting.** `/api/rules/*` is read-only public data. Do we need rate limits at all, or rely on Vercel's defaults? *Default: rely on Vercel defaults; add limits if abuse appears.*
7. **Versioning storage.** Where do prior major spec versions live when we bump? *Default: `/api/v1/rules/*`, `/api/v2/rules/*`, etc., all served from the same monorepo.*

## Implementation plan (when unblocked)

Conditioned on the [turborepo migration landing first](../DOCS_PHILOSOPHY.md) (so we don't fork the script files).

1. **Decide open questions 1-7.** ~1 day, mostly async.
2. **Add the three new `meta.docs.*` fields** (`cwe`, `owasp`, `related`) to the rule meta type in `eslint-devkit`. Backfill on flagship rules first, then security rules, then everything else. ~1-2 days.
3. **Build the projection script** at `scripts/build-rule-spec.ts` (monorepo root). Reads each `packages/<plugin>/src/rules/*.ts` + tests, emits `apps/docs/.next/rule-specs/<plugin>/<rule>.json` and an `index.json`. ~2 days.
4. **Wire the API routes** at `apps/docs/src/app/api/rules/index.json/route.ts` and `apps/docs/src/app/api/rules/[plugin]/[rule].json/route.ts` reading the prebuilt JSON. ~half day.
5. **Add CI gate**: every rule must produce a valid `RuleSpec` (validated against this spec's JSON Schema, generated from the TypeScript interfaces above). Fail the build otherwise. ~1 day.
6. **Switch downstream consumers** to read from RuleSpec one at a time: docs renderer → llms.txt → OG cards. Each is a separate PR.

Total: ~1 sprint to first-consumer-using-RuleSpec; ~2 sprints to all-consumers-converted.
