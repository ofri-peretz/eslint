# 🗺️ Project Roadmap

This document tracks the current focus areas and future plans for the ESLint monorepo.

---

## 🔒 Security Rules

### Current State

We have implemented comprehensive security coverage across multiple domains:

| Plugin                             | Focus Area             | Status    |
| ---------------------------------- | ---------------------- | --------- |
| `eslint-plugin-secure-coding`      | General security       | ✅ Stable |
| `eslint-plugin-crypto`             | Cryptographic security | ✅ Stable |
| `eslint-plugin-jwt`                | JWT best practices     | ✅ Stable |
| `eslint-plugin-pg`                 | PostgreSQL security    | ✅ Stable |
| `eslint-plugin-browser-security`   | Browser/DOM security   | ✅ Stable |
| `eslint-plugin-express-security`   | Express.js security    | ✅ Stable |
| `eslint-plugin-nestjs-security`    | NestJS security        | ✅ Stable |
| `eslint-plugin-lambda-security`    | AWS Lambda security    | ✅ Stable |
| `eslint-plugin-vercel-ai-security` | Vercel AI SDK security | ✅ Stable |

### OWASP Coverage

- **OWASP Web Top 10 2021**: Comprehensive coverage via `eslint-plugin-secure-coding`
- **OWASP LLM Top 10 2025**: Partial coverage via AI SDK plugins
- **OWASP Mobile Top 10**: Framework-agnostic rules in `eslint-plugin-secure-coding`

---

## 🏗️ Code Quality Rules

| Plugin                         | Focus Area               | Status    |
| ------------------------------ | ------------------------ | --------- |
| `eslint-plugin-architecture`   | Structure and boundaries | ✅ Stable |
| `eslint-plugin-quality`        | Code quality metrics     | ✅ Stable |
| `eslint-plugin-import-next`    | Import/export analysis   | ✅ Stable |
| `eslint-plugin-react-features` | React best practices     | ✅ Stable |
| `eslint-plugin-react-a11y`     | React accessibility      | ✅ Stable |

---

## 📅 Future Plans

### Short Term

- Improve rule documentation with more examples
- Add auto-fix capabilities to more rules
- Expand test coverage

### Long Term

- Additional framework-specific security plugins
- Advanced circular dependency detection
- Performance profiling tools

---

## 🛟 ESLint Compatibility

We currently support **ESLint v8, v9, and v10** (v10 included as the forward-looking exception per our [support policy](./docs/ESLINT_VERSION_SUPPORT.md)).

**Tracked transitions** — re-evaluated each time we run `npm run stats:eslint-versions`:

- **v8 → deprecation candidate** when v10 crosses the 20% gate AND v8 falls below it on two consecutive refreshes
- **v11 → support window opens** as soon as v11.0.0 ships (forward-looking rule), without waiting for share data
- **EOL milestones** — track upstream ESLint EOL announcements and align removals with the next major release

Last data refresh: 2026-05-09 (v9: 60.4%, v8: 24.3%, v10: 9.2%).

---

## 📞 Feedback

Have suggestions for the roadmap? [Open a discussion](https://github.com/ofri-peretz/eslint/discussions).
