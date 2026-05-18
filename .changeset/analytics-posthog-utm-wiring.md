---
"eslint-plugin-conventions": minor
---

Three new rules at `error` severity enforcing the Observability cluster of the design philosophies (ANALYTICS_PHILOSOPHY.md + UTM_PHILOSOPHY.md):

- **`utm-taxonomy`** — `utm_source` and `utm_medium` query-param values in any URL string literal must match the fixed taxonomy. Free-text values (`Blog`, `blog_v2`, `BLOG`) destroy joinability in PostHog and are forbidden.
- **`no-raw-cross-property-href`** — Hand-written `<a href="https://*.interlace.tools/…">` and `<a href="https://ofriperetz.dev/…">` JSX literals are flagged. The blessed escape hatch is the per-property `buildUtmHref()` helper from `lib/utm.ts`.
- **`analytics-event-naming`** — Vendor-neutral. Matches `<obj>.capture()` (PostHog), `<obj>.track()` (Segment / Mixpanel / Amplitude), and bare `track()` (our primitive). Event names must follow `category:object_action` (lowercase snake_case) with action from a fixed verb list; `$`-prefixed reserved events are exempt; template-literal event names are forbidden.

Also fixes `compareVersions` in `expiring-todo-comments` to normalise wildcards (`24.x` in `engines.node`) — without this, `parseSemver` returned `null` and the comparator falsely matched every `>= engine TODO` as expired.
