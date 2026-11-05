---
'eslint-plugin-react-a11y': patch
'@interlace/eslint-devkit': patch
---

fix(react-a11y): rules read every static spelling of a value, honour their documented options, and follow WAI-ARIA 1.2 / HTML-AAM, found by fidelity models for all 37 rules.

- Static values in braces are read: `tabIndex={1}`, `role={"button"}`, ``alt={`Photo of x`}``, `flag ? "x" : "x"` are judged like the plain string (tabindex-no-positive, aria-role, role-has-required-aria-props, role-supports-aria-props, prefer-tag-over-role, no-redundant-roles, no-interactive-element-to-noninteractive-role, no-noninteractive-element-to-interactive-role, no-noninteractive-tabindex, no-aria-hidden-on-focusable, img-redundant-alt, anchor-is-valid, lang, anchor-ambiguous-text, autocomplete-valid). A value the file cannot see is never a finding: `lang={locale}`, `title={t}`, `htmlFor={id}`, `kind={k}`, `muted={m}` no longer report.
- React spellings and HTML spellings: autocomplete-valid checks React's `autoComplete` (it only read lowercase `autocomplete`, so it never ran on React code); `tabindex`, `accesskey`, `autofocus` are read too.
- Options that were ignored now work: aria-role and no-autofocus `ignoreNonDOM`, anchor-is-valid `aspects` and `specialLink`, no-noninteractive-tabindex `allowExpressionValues`, interactive-supports-focus `tabbable` (roles, not tags). img-redundant-alt `words` and `components` add to the defaults instead of replacing them.
- Values that render nothing are nothing: `alt={undefined}` is a missing alt; `autoFocus={false}`, `accessKey=""` are not findings; `{undefined}`, whitespace and `aria-hidden` children are not heading/anchor content; a muted `<video>` needs no captions; `kind="Captions"` is captions.
- WAI-ARIA / HTML-AAM: `aria-description` and the 1.3 braille properties are valid; DPUB-ARIA `doc-*` and Graphics-ARIA roles are valid roles; slider requires only `aria-valuenow`, scrollbar `aria-controls` + `aria-valuenow`; `<input>` takes its implicit role from `type`; h1-h6 are headings; `<a>` without `href` is not a link or focusable; `div`/`span` are generic, not non-interactive; `picture`, `noscript`, `template`, `slot` take no ARIA; disabled / `type="hidden"` / `tabIndex={-1}` controls are not focusable.
- interactive-supports-focus is corrected: it reports an element with an interactive role and a handler that cannot take focus (it skipped exactly those, and reported role-less elements instead).
- label-has-associated-control reports a label with no text; a dynamic `htmlFor` associates. control-has-associated-label and label-has-associated-control search nested content to the schema's maximum depth by default.
