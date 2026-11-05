---
'eslint-plugin-conventions': patch
---

fix: rules now decide by code structure, found by the new Quint fidelity models.

- `analytics-event-naming`: an event name bound to a `const` is read like the literal.
- `utm-taxonomy`: a UTM value a template placeholder completes (`utm_source=dev${suffix}`) is unknown and no longer reported.
- `no-raw-cross-property-href`: `href={'…'}` and ``href={`…`}`` are the same raw link as `href="…"`.
- `prefer-code-point`: an optional call (`s?.charCodeAt(0)`) is reported.
- `prefer-dom-node-text-content`: destructuring `innerText` out of an element is reported.
- `no-magic-numbers`: `ignore` matches a negative number as written (`ignore: [-42]` allows `-42`).
- `no-json-schema-tags`: only JSDoc (`/** */`) block tags are read; `@word` inside prose, plain block comments and JSDoc's own `@enum` / `@const` are no longer reported.
- `require-data-testid`: a member reference (`ids.submit`) or a choice between stable values is a stable `data-testid`; a name in `requireOn` is in scope even when it is a component without an event handler.
- `no-console-spaces`: only the side of an argument that touches another is reported (a leading space on the first argument or a trailing one on the last is the message's own); the global `console` is found by binding (`globalThis.console`, `node:console`; an injected `console` is not reported).
- `consistent-existence-index-check`: the built-in `Object` by binding, so `globalThis.Object.hasOwn` is read.
- `expiring-todo-comments`: `[-pkg]` comes due once the package is removed, not while it is present.
- `no-deprecated-api`: `new OldClass()` and a call through a renamed import are reported.
- `prefer-dependency-version-strategy`: `allowWorkspace` / `allowFile` / `allowLink: false` now report those protocols; the `range` strategy accepts `^` / `~`; `overrides` apply under `strategy: 'any'`.

Placeholder docs (`no-commented-code`, and the template "Known False Negatives" sections) now state each rule's contract; options that were undocumented (`no-magic-numbers`, `require-data-testid`'s `componentRequiresHandler`) are documented, and `dateFormat` / `warnDaysBeforeRemoval` are documented as having no effect.
