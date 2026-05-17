## [0.1.0] - 2026-05-16

### Features

- Initial release. One-extends meta-config for the Interlace ESLint ecosystem.
- `flagship` preset — composes the 9 flagship-hosting plugins (10 rules total) from `.agent/flagship-rules.md`.
- `security` preset — composes the 11 security plugins (`secure-coding`, `node-security`, `browser-security`, `jwt`, `pg`, `mongodb-security`, `express-security`, `lambda-security`, `nestjs-security`, `vercel-ai-security`).
- `quality` preset — composes the 7 code-quality plugins (`import-next`, `conventions`, `maintainability`, `reliability`, `operability`, `modularity`, `modernization`).
- `react` preset — composes the 2 React plugins (`react-features`, `react-a11y`).
- `recommended` preset — full default; security + quality + react.

Replaces the manual 11-plugin compose previously documented in `.agent/flagship-rules.md`.
