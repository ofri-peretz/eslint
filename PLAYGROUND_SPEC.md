# Interactive ESLint Playground — MVP Spec

A scoped engineering plan, not a philosophy. The interactive playground
is the single largest signal of "this site is in the top tier" for a
dev-tool docs site (Tailwind Play, shadcn/ui's preview, the
Babel/SWC/TypeScript playgrounds — every one of them is a category-
defining surface for its tool).

This document fixes scope, architecture, and a phased rollout. It is
not a discussion of *whether* to build it — that decision is made
by UX_PHILOSOPHY.md #9 (the docs site is the showcase) and by
[CODE_EXAMPLE_PHILOSOPHY.md](./CODE_EXAMPLE_PHILOSOPHY.md) (runnable
examples are the strongest illustration of a rule).

---

## What it is

> **Paste code on the left, see our rules' findings on the right, in
> the browser, in under 500ms.** Click a finding, land on the rule
> page. Click the install snippet, copy a configured `eslint.config.js`
> with the rules you just used.

The playground is a single page at `/play`. It is the homepage's
hero CTA. It is the link we paste in Slack when someone asks "what
does your plugin actually do."

---

## The minimum viable cut (MVP)

What ships in the first iteration:

- **Monaco editor** in the left pane, ~50/50 split with the right pane.
- **Findings list** in the right pane: rule name, severity, line:col,
  message, "Fix" button (where the rule is fixable).
- **Built-in canonical examples** — 6 starter snippets, one per
  flagship rule, accessible from a dropdown above the editor:
  - `jwt/no-none-algorithm`
  - `secure-coding/no-hardcoded-credentials`
  - `pg/no-unsafe-query`
  - `node-security/detect-child-process`
  - `react-features/no-cycle`
  - `react-a11y/anchor-is-valid`
- **Plugin toggle strip** — checkboxes for which plugins are enabled
  (default: all flagship). Toggle re-runs lint.
- **Findings link to rule pages** — clicking a finding's rule name
  navigates to `/docs/<plugin>/<rule>` in a new tab.
- **"Copy config" button** — emits the `eslint.config.js` snippet
  with the currently-enabled plugins, copied via the standard
  copy-button primitive (see CODE_EXAMPLE_PHILOSOPHY.md).
- **URL-shareable state** — code goes into URL via base64 +
  compression; plugin selection via shorthand query param.
  `/play?code=...&plugins=jwt,pg`.

Out of scope for MVP:

- File trees / multi-file projects
- TypeScript type-checking (rules only, no type-aware rules)
- Saving to a server
- User accounts
- Custom rule authoring
- Diff view of fix-applied code
- Embedded mode (iframe-able)

---

## Architecture

Three layers, top to bottom:

### 1. Editor — Monaco (lazy-loaded)

- **`@monaco-editor/react`** as the React wrapper.
- **Language: TypeScript / JavaScript** with JSX. Same Monaco config
  Tailwind Play uses — gives us syntax highlighting, autocomplete,
  hover types from the bundled lib.d.ts.
- **Lazy-loaded** via `next/dynamic`. The editor bundle is ~2MB
  pre-compression, ~600KB compressed — too big for first paint.
- **Theme**: matches site dark/light, see COLOR_PHILOSOPHY.md. Two
  Monaco themes pre-built and committed (`monaco-light.json`,
  `monaco-dark.json`).

### 2. Linter — ESLint in the browser

Two viable approaches; recommend (a):

**(a) `eslint-linter-browserify` + plugin bundles.** Maintained
package that ships ESLint's `Linter` class (no filesystem ops, no
CLI) as a browser-ready bundle. We compile each of our flagship
plugins to a UMD bundle for browser use; the playground imports them
dynamically.

- Pros: real ESLint, real rule output, no separate engine to
  maintain.
- Cons: bundle size grows with each plugin enabled (~50KB
  compressed per plugin). Lazy-load.

**(b) Web Worker running a Node-compat ESLint.** Use a
`WebWorker` + `@webcontainer/api` (or similar) to spin a Node-
compat sandbox. Heavy, slow, overkill for our needs.

→ Go with (a). Compatible with `eslint-bundle` patterns shipped by
TypeScript-ESLint, Tailwind Play, etc.

### 3. Renderer — the right pane

- Findings rendered as a list. Each finding row:
  - Rule name (link to `/docs/<plugin>/<rule>`).
  - Severity chip (color from status tokens — see
    COLOR_PHILOSOPHY.md).
  - Line:column locator (monospace, click to jump editor cursor).
  - Message.
  - "Fix" button when `fix` is available — runs the fix, replaces
    editor content, re-lints.
- **Empty state**: no findings yet → "Paste code or pick an example
  to see our rules in action." Plus a one-line keyboard hint.
- **Loading state**: "Linting…" skeleton list (matches finding row
  height) — first lint takes ~300ms (plugin bundle download +
  parse).
- **Error state**: parse error → render the parser error in place of
  findings, styled as a non-actionable finding.

---

## URL state contract

Aligned with URL_PHILOSOPHY.md and the same `?q=`/`?tag=` vocabulary
pattern.

```
/play?code=<lz-string>&plugins=jwt,pg,secure-coding
```

- `code`: LZ-string-compressed, base64url-encoded source text. Yes
  the URL gets long. Yes that's fine — readers share these in PRs,
  not on Twitter.
- `plugins`: comma-joined plugin slugs. Subset of available plugins.
  Empty = all flagship enabled.
- `example`: optional, name of a built-in example. If present, the
  example's code is loaded; `code=` takes precedence over `example=`.

URL writes use `router.replace` (no history pollution per
edit-keystroke; debounced 500ms).

---

## Phased rollout

A four-phase delivery. Each phase ships independently and ships
something usable.

### Phase 1 — Static demo (1 week)

- `/play` exists with Monaco + the 6 canonical examples.
- **No linter yet.** Right pane shows a static, hardcoded findings
  list per example.
- URL state for the *example* selection only.
- Purpose: ship the chrome and visual identity, validate layout
  against COLOR/TYPOGRAPHY/LAYOUT philosophies.

### Phase 2 — Live linting (2 weeks)

- `eslint-linter-browserify` integrated.
- One plugin bundled and linted live (`jwt` first — smallest,
  most-impactful rules).
- Findings link to rule pages.
- "Fix" button for fixable rules.
- Purpose: prove the linting pipeline end-to-end with one plugin
  before expanding to six.

### Phase 3 — All flagship plugins (2 weeks)

- Remaining 5 flagship plugins bundled and toggleable.
- Plugin toggle strip ships.
- URL state for `plugins=` ships.
- "Copy config" button generates the `eslint.config.js` snippet
  using the `<InstallSnippet>` primitive
  (CODE_EXAMPLE_PHILOSOPHY.md).
- Purpose: feature-complete MVP.

### Phase 4 — Embed and homepage hero (1 week)

- Read-only embed mode at `/play/embed` — iframe-friendly, minimal
  chrome, for use in articles and rule pages.
- Homepage hero swaps to a live playground showing
  `secure-coding/no-hardcoded-credentials` firing on a hardcoded
  AWS key. Walk-the-talk per Principle #9.
- "Try this rule" button on every rule page → opens `/play` with
  that rule's canonical example pre-loaded.
- Purpose: surface integration — the playground becomes the showcase
  surface, not a side route.

---

## Performance budget

Inherited from MOTION + LOADING + UX #6:

- **First-paint of `/play`** (chrome only, no editor): ≤ 1.5s LCP.
  The editor lazy-loads after first paint.
- **Editor ready** (Monaco fully mounted, cursor blinking): ≤ 2.5s
  from navigation. Skeleton during the gap (LOADING_PHILOSOPHY.md).
- **First lint result** after editor ready: ≤ 500ms.
- **Subsequent lints** (on keystroke, debounced 200ms): ≤ 100ms.
- **Plugin toggle re-lint**: ≤ 200ms.
- **Bundle size**: Monaco lazy-loaded; ESLint+plugins lazy-loaded.
  First-paint JS bundle ≤ 200KB compressed.

CI gate via the Lighthouse workflow (already wired): `/play` is on
the URL list with the same thresholds, plus a custom budget for
"time to interactive editor" via a Playwright performance test.

---

## Accessibility

- **Keyboard-first**: every action keyboard-accessible. `Cmd+S` /
  `Ctrl+S` triggers a fix-all (intercepted, doesn't save the page).
  `Cmd+K` opens the example picker.
- **Screen reader**: findings list is a real `<ol>` with semantic
  rows; severity announced via `<span class="sr-only">`.
- **Monaco a11y mode**: enabled by default. Includes "a11y help"
  dialog.
- **Reduced motion**: editor's blink and theme transitions respect
  `prefers-reduced-motion` (MOTION_PHILOSOPHY.md).
- **Color contrast**: editor theme tokens audited against
  COLOR_PHILOSOPHY's contrast budget.

---

## Mobile

The playground is a **desktop-first** surface, but mobile must not be
broken.

- < 640px viewport: editor stacks above findings, each at 50vh.
- Pinch-zoom respected (Monaco supports).
- "Copy config" button appears as a sticky bottom-action bar.
- "Pick example" is a real `<select>` on mobile (native picker is
  faster than a custom dropdown).

---

## Telemetry

What we measure (privacy-respecting, aligned with SEARCH_PHILOSOPHY's
telemetry rules):

- **Page-visit funnel**: home → /play → click rule page →
  install-snippet copy. The conversion path the docs site is
  built around (Principle #9).
- **Plugin-toggle counts**: which plugins do readers enable? Tells
  us what to feature.
- **"Fix" button usage rate**: do readers actually try the fixes?
- **"Copy config" rate**: the closest thing to a conversion event
  on the docs site.
- **Top examples**: which built-ins do readers pick most?

No PII; aggregated daily.

---

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Plugin bundle size explodes browsers | Each plugin lazy-loaded only when its toggle is on; tree-shaken at build |
| `eslint-linter-browserify` lags ESLint version | Pin to a known-good ESLint 9 release; refresh quarterly; CI tracks delta |
| Rules that need filesystem access break | Filter at bundle time — rules that read fs are tagged `playgroundSupported: false` in their meta |
| Type-aware rules unsupported | MVP excludes type-aware rules; phase 5+ could add a bundled `tsserverlib` for opt-in |
| Memory leak from repeated lints | Re-lint creates a fresh `Linter` instance per run; old instances GC'd |
| Editor + plugins on same thread cause jank | Run the linter in a Web Worker (phase 3 if not already) |

---

## Out-of-scope decisions deferred

Documented here so they're not re-litigated:

- **Save to gist** — no. We're not a hosting service. Share via URL.
- **Custom rule authoring in-browser** — no. Use the
  `eslint-devkit` package, run locally.
- **Tailwind/Vite-style playground splits** — no. One file, one
  language. Multi-file is a 10x engineering bump for marginal value.
- **Server-side linting fallback** — no. Static + browser-only.
  Keeps the surface free of hosting cost.

---

## Open questions for human decision

These are NOT decided in this doc. The user picks before phase 1
starts:

1. **First-paint hero on homepage**: does the live playground replace
   the current hero, or live alongside it?
2. **Embed style**: do we ship an `<Playground>` MDX component
   that authors can drop into any article, or is `/play/embed` the
   only embed surface?
3. **Telemetry vendor**: PostHog, Plausible, Vercel Analytics, or
   none?

Until answered, phases 1-3 proceed; phase 4 depends on answers to
(1) and (2).

---

## Files this will add

When the playground is implemented, expected new artifacts:

```
apps/docs/
  src/app/play/
    page.tsx                    # Server Component shell
    embed/page.tsx              # Embed mode
  src/components/playground/
    Playground.tsx              # Client wrapper
    Editor.tsx                  # Monaco lazy-loaded
    FindingsList.tsx
    PluginToggle.tsx
    ExamplePicker.tsx
  src/lib/playground/
    linter.ts                   # Browser ESLint orchestrator
    bundle-plugins.ts           # Build-time plugin bundler
    url-state.ts                # LZ-string codec
    examples/                   # Canonical example sources
      jwt-no-none.ts
      secure-coding-hardcoded-credentials.ts
      ...

packages/eslint-devkit/
  src/playground/
    plugin-bundle.ts            # Helper for plugin authors to emit
                                # a playground-compatible UMD bundle
```

---

## Living document

This is an engineering spec, not a philosophy. When a phase ships,
**update this doc** with the actual outcome and revise the
estimates. When a deferred-decision answer arrives, update the
"Open questions" section and propagate to the architecture.
