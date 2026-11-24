---
'eslint-plugin-react-a11y': minor
---

feat(react-a11y): eslint-plugin-jsx-a11y's own preset options load, `flatConfigs`, README migration notes

The option objects in eslint-plugin-jsx-a11y 6.10.2's `recommended` and `strict` presets (`src/index.js`) used to
throw "Unexpected property" when enabled. They load now, under a `jsx-a11y` plugin key or this plugin's own.

Honoured, and tested with cases ported from upstream's test files:

- `alt-text`: `elements` (a kind left out is not checked) and the `input[type="image"]` key (merged with `inputImage`).
  A component listed for `input[type="image"]` or `inputImage` is now checked whatever its `type`, as in jsx-a11y; it
  used to need `type="image"`.
- `mouse-events-have-key-events`: `hoverInHandlers` and `hoverOutHandlers`.
- `no-static-element-interactions`: `allowExpressionValues`.
- `no-noninteractive-element-interactions`: element keys (`body`, `iframe`, `img`, ...) list handlers allowed on that
  element. Role-named keys such as `alert` and `dialog` are accepted and, as upstream, match nothing.
- `control-has-associated-label`: `depth` accepts 0 and above, clamped to 25.

Accepted and not read: `control-has-associated-label` `includeRoles`. jsx-a11y 6.10.2 declares no such key in the
rule schema and reads it nowhere, so it changes no result there either.

Every preset now sets `languageOptions.parserOptions.ecmaFeatures.jsx` and a config `name`, and `flatConfigs.recommended`
and `flatConfigs.strict` are exported as aliases of `configs.recommended` and `configs.strict`.

README: `react-a11y/img-requires-alt` is `alt-text`, the stray CWE-252 cell on `alt-text` is gone, and a "Migrating from
eslint-plugin-jsx-a11y" section states what is and is not compatible. Still not done: `aria-proptypes`, the deprecated
`accessible-emoji`, `label-has-for` and `no-onchange`, and `settings['jsx-a11y']`.
