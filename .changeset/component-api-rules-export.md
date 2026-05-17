---
"eslint-plugin-react-features": minor
---

Expose the `component-api/*` rule namespace to consumers.

Eight rules — `no-default-test-id`, `require-data-slot`, `no-is-prefix-prop`,
`no-inline-style`, `no-raw-color-literal`, `no-arbitrary-token-class`,
`no-kind-prop-discriminator`, `no-wrapper-sub-component` — already exist in
`src/rules/component-api/` and are referenced by the plugin's recommended
config, but they were not previously included in the published `rules` map.
This release adds them so downstream apps (e.g. `apps/blog`, `apps/docs`,
`interlace-landing`) can register the `componentApi` preset via:

```js
import reactFeatures from "eslint-plugin-react-features";

{
  plugins: { "react-features": reactFeatures },
  rules: {
    "react-features/component-api/no-default-test-id": "error",
    "react-features/component-api/require-data-slot": "warn",
    "react-features/component-api/no-is-prefix-prop": "warn",
    "react-features/component-api/no-inline-style": "warn",
    "react-features/component-api/no-raw-color-literal": "warn",
    "react-features/component-api/no-arbitrary-token-class": "warn",
    "react-features/component-api/no-kind-prop-discriminator": "warn",
    "react-features/component-api/no-wrapper-sub-component": "warn",
  },
}
```

Each rule corresponds to a rule ID (R5/R6/R8/R11/R12/R18/R19) in the
`interlace-component` skill at `agents/skills/interlace-component/SKILL.md`.
The rules are not part of the `recommended` config — they ship as an opt-in
`componentApi` preset that strict design systems can enable on top of the
base react ruleset.

Unblocks STR-1 in `agents/apps/blog/INTERLACE_AUDIT.md`.
