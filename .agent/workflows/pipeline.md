---
description: Central dispatcher for multi-agent pipelines
---

# Pipeline Mode (Jan 16 Standard)

Route tasks to specialized pipelines:

```
/pipeline <mode>: <task description>
```

## 🛠️ Phases

### 1. Design

Multi-agent review with 8 specialists.
Command: `/pipeline design: <task>`
Output: `design-<slug>.md`

### 2. Breakdown

Decompose design into atomic tasks (XS-S sizing).
Command: `/pipeline breakdown: <file>.md`
Output: `tasks-<slug>.md`

### 3. Execute

// turbo
Command: `/pipeline execute: <file>.md mode:wave`

---

## ⚡ Quick Commands

| Command                  | Expert                   |
| :----------------------- | :----------------------- |
| `/pipeline orchestrate:` | Full E2E Flow            |
| `/pipeline qa-stress:`   | Quality & Stress Testing |
| `/pipeline eslint:`      | ESLint Dev Agent         |
| `/pipeline security:`    | Security Research        |
| `/pipeline release:`     | Automated Release        |

---

## 🏗️ Release Process

// turbo

1. Manual trigger: GitHub Actions → Release Package
2. Select package from dropdown
3. Run with `version-specifier: auto`

**Packages**: secure-coding, jwt, crypto, pg, mongodb, express, nestjs, lambda, vercel-ai, architecture, quality, react-a11y, devkit, cli.

---

## 📚 References

- **Rules**: See `.agent/rules/` for permanent guidelines.
- **Standards**: See `.agent/rules/compliance-audit-part1.md`.
- **Archive**: Historical session data in `.agent/archive/`.
