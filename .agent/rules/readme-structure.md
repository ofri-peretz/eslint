# Package README Structure Standard

Single source of truth for the structure of every `packages/eslint-plugin-*/README.md`. The docs site renders these READMEs verbatim through [`<RemoteReadme>`](../../apps/docs/src/components/docs/remote-readme.tsx) — drift from this standard surfaces as broken or empty sections in production docs.

_Last refreshed: 2026-05-10. Aligned with the actual rendering pipeline + the type-awareness audit._

---

## Canonical section order

```
PRELUDE  (everything above the first `## ` heading — uses HTML, not markdown)
  1. Logo (centered <p>, HTML <img>)
  2. Tagline (centered <p>, plain text, 1–2 sentences)
  3. Header badges row (centered <p>, HTML <a><img>)

BODY  (markdown, may contain shields.io badges in tables)
  4.  ## Description
  5.  ## Philosophy                       (verbatim "Interlace" block)
  6.  ## Getting Started                  (multilingual links + npm install)
  7.  ## ⚙️ Configuration Presets
  8.  ## 📚 Supported Libraries           (lib-specific plugins only)
  9.  ## 🤖 AI-Optimized Messages         (security plugins only)
  10. ## Rules                            (legend + unified table with 🧠 column)
  11. ## 🔗 Related ESLint Plugins
  12. ## 📦 Compatibility
  13. ## 📄 License
  14. Footer image (centered <p>, HTML <a><img>)
```

Optional sections (`## 🙋 FAQ`, `## 💡 What You Get`, `## ⚡ Performance`, `## 🏢 Usage Example`, `## Why These Rules?`, `## 📊 Test Coverage`) live **between Configuration Presets (7) and Rules (10)**. Never below Rules. Never between Rules and Related Plugins.

---

## Why this order matters — the prelude/body split

[`cleanMarkdown`](../../apps/docs/src/components/docs/remote-readme.tsx#L50) strips badge artefacts from the **prelude** (everything before the first `##` heading) so the centered logo + tagline render cleanly on the docs site. Body sections — Compatibility, Supported Libraries, Related Plugins — are preserved verbatim so their shields.io badge cells render.

Implications for authors:

- **Prelude badges** must use raw HTML (`<a href="..."><img src="..." /></a>`). Markdown linked badges (`[![alt](shield)](url)`) in the prelude get stripped.
- **Body badges** in table cells should use markdown linked badges (`[![alt](shield)](url)`). They render as live shields and are clickable.
- Never put a `##` heading inside the prelude. The first `##` heading defines the prelude/body boundary.

---

## Detailed requirements

### 1. Logo

```markdown
<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>
```

No `# Title` H1 — the logo is the visual anchor.

### 2. Tagline

```markdown
<p align="center">
  One- or two-sentence summary of what the plugin does.
</p>
```

### 3. Header badges row

Required set: NPM Version, NPM Downloads, License, Codecov, Since-date. All centered in one `<p>`, all HTML (because of the prelude rule above).

```markdown
<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-NAME" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-NAME.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-NAME" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-NAME.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-NAME" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-NAME" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-MMM_YYYY-blue?logo=rocket&logoColor=white" alt="Since MMM YYYY" /></a>
</p>
```

### 4. Description

3–5 sentences. State the value proposition; don't repeat the tagline verbatim.

### 5. Philosophy

Identical across all plugins:

```markdown
## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.
```

### 6. Getting Started

Six multilingual doc links (en, zh, ko, ja, es, ar) + a fenced `npm install` block. Pattern in any existing README is the canonical form — copy from a peer.

### 7. ⚙️ Configuration Presets

Strict 2-column table: `Preset` | `Description`. Sourced from `src/configs/*` or `src/index.ts`. Validate that the icons in the Rules table (10) match the exported configs — every rule enabled in `recommended` must show 💼; every `warn`-level rule must show ⚠️.

### 8. 📚 Supported Libraries (conditional)

Include only when the plugin targets specific npm packages (crypto, express, jwt, lambda, mongodb, nestjs, pg, vercel-ai). Skip for general-purpose plugins (browser-security, secure-coding, react-*, conventions, etc.).

```markdown
## 📚 Supported Libraries

| Library | npm | Downloads | Detection |
| ------- | --- | --------- | --------- |
| `lib`   | [![npm](https://img.shields.io/npm/v/lib.svg?style=flat-square)](https://www.npmjs.com/package/lib) | [![downloads](https://img.shields.io/npm/dt/lib.svg?style=flat-square)](https://www.npmjs.com/package/lib) | Coverage area |
```

### 9. 🤖 AI-Optimized Messages (security plugins only)

A fenced example of the structured error format (CWE/OWASP/CVSS/Fix/Link) followed by a 1–2 sentence rationale below the block: structured context lets AI assistants reason about the flaw rather than hallucinate.

### 10. Rules

**Legend** (required, in this exact form — last 3 rows are mandatory across all plugins):

```markdown
**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set to warn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |
| 🟢 | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier. |
| 🟡 | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
| 🟠 | **Type-aware (graceful)**: requires TS program; silent without it. |
```

**Table — Variant A (security plugins):**

```
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
```

**Table — Variant B (architecture / quality plugins):**

```
| Rule | Pattern/Concept | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
```

#### The 🧠 type-aware column

- **Source of truth**: [`.agent/type-awareness-audit.md`](../type-awareness-audit.md). Don't classify by hand.
- **Default**: 🟢 (type-unaware). 393 of 397 rules ship as 🟢.
- **Exceptions** (the only 4 type-aware rules in the entire monorepo):
  - 🟠 `eslint-plugin-import-next/named`
  - 🟠 `eslint-plugin-import-next/namespace`
  - 🟠 `eslint-plugin-import-next/default`
  - 🟡 `eslint-plugin-secure-coding/detect-object-injection`
- Every rule row must populate this column. An empty 🧠 cell means "audit not performed" — fail validation.

#### Other column rules

- Rule name is a markdown link to `https://eslint.interlace.tools/docs/<pillar>/<plugin>/rules/<rule>`.
- One unified table — no sub-tables, no category-header rows, no rule grouping.
- Empty cells stay empty (no `—` placeholder).

### 11. 🔗 Related ESLint Plugins

Standard ecosystem table. Columns: `Plugin` | `Downloads` | `Description`. The Plugin cell is a markdown link to the npm page; the Downloads cell is a markdown linked badge `[![downloads](https://img.shields.io/npm/dt/PKG.svg?style=flat-square)](https://www.npmjs.com/package/PKG)`.

### 12. 📦 Compatibility

Two patterns are valid:

**Pattern A — version table with badges** (preferred for plugins with framework peer deps):

```markdown
| Package | Version |
| :--- | :--- |
| `framework` | [![npm](https://img.shields.io/npm/v/framework.svg?style=flat-square)](https://www.npmjs.com/package/framework) |
| ESLint | [![npm](https://img.shields.io/npm/v/eslint.svg?style=flat-square)](https://www.npmjs.com/package/eslint) |
| Node.js | [![node](https://img.shields.io/badge/node-%5E18.0.0-green?style=flat-square)](https://nodejs.org/) |
```

**Pattern B — semver string table** (when no peer deps):

```markdown
| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |
```

Append a single line linking the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md).

### 13. 📄 License

```markdown
## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
```

### 14. Footer image

```markdown
<p align="center">
  <a href="https://eslint.interlace.tools/docs/<pillar>/plugin-NAME"><img src="https://eslint.interlace.tools/images/og-NAME.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
```

Must be the very last element. No content below.

---

## Exclusions

- No raw reference link dumps — those belong in the docs site.
- No verbose per-rule descriptions or code examples in the README — keep it high-level.
- No dedicated CVE / research-paper sections unless materially relevant.
- No FAQ / Test Coverage / Highlights sections **below** the Rules table.

---

## Governed plugins (20)

Security pillar: `browser-security`, `crypto`, `express-security`, `jwt`, `lambda-security`, `mongodb-security`, `nestjs-security`, `node-security`, `pg`, `secure-coding`, `vercel-ai-security`.

Quality pillar: `conventions`, `maintainability`, `modernization`, `modularity`, `operability`, `reliability`.

Imports: `import-next`.

React: `react-a11y`, `react-features`.

---

## Maintenance

- Validate against this standard with `tools/scripts/fix-readmes.js` (or update the script when this rule changes).
- The 🧠 column derives from `.agent/type-awareness-audit.md`. Re-run the audit (`type-awareness-scan.tsv`) before bulk-editing the column.
- The prelude/body split is enforced by [`cleanMarkdown`](../../apps/docs/src/components/docs/remote-readme.tsx#L50). Keep them in sync.
