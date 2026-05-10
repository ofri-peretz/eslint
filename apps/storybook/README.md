# Storybook — Interlace UI a11y workbench

Storybook 10 workbench for `@interlace/ui` primitives, blocks, and design
tokens. Every story is gated by axe (`@storybook/addon-a11y` in dev,
`@storybook/test-runner` in CI) against `wcag2a`, `wcag2aa`, `wcag21aa`, and
`best-practice` rule sets.

## Run

```bash
# Dev
npm run storybook --workspace=storybook

# Build static site
npm run build-storybook --workspace=storybook

# CI gate (builds, serves, runs axe)
npm run test-storybook:ci --workspace=storybook
```

## Authoring rules

- Ship `Default`, `Disabled` (where applicable), `Dark`, and `RTL` stories
  per primitive.
- Use realistic copy. axe scores contrast against the actual rendered text.
- For tab-order tests, add a `play` function that calls `userEvent.tab()` and
  asserts the focus path with `expect(...).toHaveFocus()`.
- Disable an a11y rule only with a comment explaining why; better to fix the
  primitive than silence the rule.
- Tokens: every contrast pair we ship must appear in
  `Tokens / Color Contrast` so it's gated by CI.

## Out of scope (this workspace)

- Visual regression — owned by `apps/docs/playwright` for now.
- Per-rule documentation — lives in `apps/docs/content/docs`.
