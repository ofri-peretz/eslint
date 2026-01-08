# Agent Pipeline System

A multi-agent orchestration system for AI-assisted development.

## Quick Start

```bash
# Three-phase pipeline (recommended for complex tasks)
/pipeline design: <describe your goal>
/pipeline breakdown: design-<slug>.md
/pipeline execute: tasks-<slug>.md

# Direct agent access (for quick tasks)
/pipeline eslint: <eslint task>
/pipeline security: <security research>
/pipeline release: <package to release>
```

---

## Three-Phase Pipeline

### Phase 1: Design

Multi-agent architectural review with 8 specialists.

```bash
/pipeline design: Build real-time notification system for mobile apps
```

**Agents consulted**: Architect → Security → Cost → Patterns → Testing → UX → Performance → Tech-Specific

**Output**: `design-<slug>.md` with reviewed architecture

### Phase 2: Breakdown

Decompose approved design into small, parallelizable tasks.

```bash
/pipeline breakdown: design-notifications.md
```

**Output**: `tasks-<slug>.md` with wave-based task grouping

### Phase 3: Execute

Run tasks with parallel optimization.

```bash
/pipeline execute: tasks-notifications.md mode:wave
```

**Modes**: `sequential` | `parallel` | `wave`

---

## Quick Commands

| Command                 | Agent           | Use For                                |
| ----------------------- | --------------- | -------------------------------------- |
| `/pipeline eslint:`     | ESLint Dev      | Rule implementation, fixes             |
| `/pipeline security:`   | Security        | OWASP research, vulnerability analysis |
| `/pipeline release:`    | Release Manager | npm publishing flow                    |
| `/pipeline article:`    | Content Writer  | DEV.to, Medium, Substack posts         |
| `/pipeline distribute:` | Distribution    | Marketing strategy, promotions         |

---

## Examples

### Create a New ESLint Rule

```bash
/pipeline design: Add rule to detect hardcoded JWT secrets
# Review design, then:
/pipeline breakdown: design-jwt-secrets.md
/pipeline execute: tasks-jwt-secrets.md
```

### Quick Rule Fix

```bash
/pipeline eslint: Fix false positive in no-sql-injection rule
```

### Security Research

```bash
/pipeline security: Analyze OWASP LLM Top 10 for AI plugin coverage gaps
```

### Release Package

```bash
/pipeline release: Publish eslint-plugin-pg version 1.0.2
```

---

## Directory Structure

```
.agent/
├── workflows/
│   └── pipeline.md               # Entry point (/pipeline)
├── agents/
│   ├── architect.md              # System design
│   ├── eslint.md                 # ESLint development
│   ├── security.md               # Security research
│   ├── performance.md            # Optimization
│   ├── content.md                # Article writing
│   ├── documentation-ux-expert.md    # Low-cognitive-load docs
│   └── accessibility-expert.md   # WCAG AAA compliance
├── skills/
│   ├── rule-implementation.md
│   ├── benchmark.md
│   └── docs-ux-patterns.md       # High-engagement doc patterns
├── orchestrators/
│   ├── design-pipeline.md        # 8-agent review
│   ├── breakdown-pipeline.md     # Task decomposition
│   ├── execute-pipeline.md       # Parallel execution
│   ├── release-pipeline.md       # npm publishing
│   └── new-rule-pipeline.md      # Rule creation flow
├── REFERENCES.md                 # Industry framework links
└── README.md                     # This file
```

---

## Design Pipeline Specialists

| Agent             | Reviews For                               |
| ----------------- | ----------------------------------------- |
| **Architect**     | System design, components, APIs           |
| **Security**      | Auth, OWASP, data protection              |
| **Cost**          | Infrastructure, scaling costs             |
| **Patterns**      | Design patterns, maintainability          |
| **Testing**       | Test strategy, coverage                   |
| **UX**            | User flows, error handling                |
| **Performance**   | Algorithms, caching, queries              |
| **Tech-Specific** | Domain expertise (ESLint, React, etc.)    |
| **Documentation** | Low-cognitive-load, "Fix It Now" patterns |
| **Accessibility** | WCAG AAA, contrast, theme compatibility   |

---

## References

Inspired by industry frameworks:

- [wshobson/agents](https://github.com/wshobson/agents) — Claude Code plugins
- [Microsoft AutoGen](https://github.com/microsoft/autogen) — Multi-agent conversations
- [LangGraph](https://github.com/langchain-ai/langgraph) — Graph-based workflows
- [CrewAI](https://github.com/crewAIInc/crewAI) — Agent crews

See [REFERENCES.md](REFERENCES.md) for full details.
