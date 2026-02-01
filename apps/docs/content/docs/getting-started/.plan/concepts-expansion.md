# Getting Started: Concepts & Advanced Topics Expansion Plan

This document outlines advanced concepts, components, and content to add under the "Getting Started" section, informed by the archived interactive components and the established "Cinematic Standard" for AI-native documentation.

---

## Executive Summary

The current Getting Started section provides installation and configuration basics. To establish **Interlace as an AI-native, state-of-the-art security linting ecosystem**, we need to add conceptual depth that educates users on:

1. **Why** structured security metadata matters (AI integration)
2. **How** ESLint rules work (AST fundamentals)
3. **What** makes Interlace different (ecosystem transparency)

---

## ALL-REMOTE Content Strategy

**Policy**: No content requiring redeployment. All dynamic data is fetched from GitHub.

### Content Sources

| Content Type     | Source                                  | API Route                 | Cache TTL |
| ---------------- | --------------------------------------- | ------------------------- | --------- |
| **Changelogs**   | `packages/*/CHANGELOG.md`               | `/api/changelog`          | 2 hours   |
| **Rule Docs**    | `packages/*/docs/rules/*.md`            | `/api/github?type=rules`  | 6 hours   |
| **READMEs**      | `packages/*/README.md`                  | `/api/github?type=readme` | 1 hour    |
| **Coverage**     | Codecov API / `generated/coverage.json` | `/api/stats`              | 4 hours   |
| **Plugin Stats** | `generated/plugin-stats.json`           | `/api/plugin-stats`       | 1 hour    |
| **CWE Data**     | `data/cwe-*.json`                       | via json-cache            | 24 hours  |

### GitHub Actions Integration

GH Actions produce JSON files committed to `generated/` directory:

- `generated/coverage.json` — Codecov metrics
- `generated/plugin-stats.json` — Rule counts, versions
- `generated/rules/{plugin}.json` — Rule metadata per plugin

### API Routes Implemented

| Route               | Purpose                             |
| ------------------- | ----------------------------------- |
| `/api/github`       | Unified GitHub content fetcher      |
| `/api/changelog`    | Plugin changelogs from CHANGELOG.md |
| `/api/stats`        | Codecov coverage metrics            |
| `/api/plugin-stats` | Plugin ecosystem stats              |

---

## Proposed Content Structure

```
getting-started/
│
├── [Core Docs - Existing]
│   ├── index.mdx                     # Overview (existing)
│   ├── installation.mdx              # Install guide (existing)
│   ├── configuration.mdx             # Config guide (existing)
│   ├── flat-config.mdx               # Migration guide (existing)
│   ├── editor-integration.mdx        # IDE setup (existing)
│   └── troubleshooting.mdx           # Common issues (existing)
│
├── concepts/                         # NEW SECTION - Education & Transparency
│   ├── index.mdx                     # "Understanding Interlace"
│   ├── ai-integration.mdx            # AI-native documentation
│   ├── ast-fundamentals.mdx          # How linting works
│   ├── security-metadata.mdx         # CWE/OWASP/CVSS explained
│   ├── detect-understand-fix.mdx     # The Interlace workflow
│   ├── coverage.mdx                  # Live Codecov test coverage
│   └── benchmarks.mdx                # Performance comparisons
│
└── advanced/                         # NEW SECTION - Deep Dive
    ├── index.mdx                     # "Advanced Topics"
    ├── roadmap.mdx                   # GitHub Roadmap integration
    ├── changelog.mdx                 # Version history from GitHub
    ├── ci-cd.mdx                     # CI/CD integration guide
    └── contributing.mdx              # How to contribute rules
```

### Section Purpose Summary

| Section       | Purpose                                                   | Audience                              |
| ------------- | --------------------------------------------------------- | ------------------------------------- |
| **Core Docs** | Get up and running fast                                   | Everyone                              |
| **Concepts**  | Understand _why_ Interlace works + ecosystem transparency | Developers, AI teams, decision-makers |
| **Advanced**  | Deep integration & contribution                           | Power users, contributors             |

---

## Priority 1: Concepts Section

### 1.1 AI Integration (`concepts/ai-integration.mdx`)

**Purpose**: Explain why structured metadata enables AI agents to fix vulnerabilities accurately.

**Key Content**:

- The problem with unstructured error messages
- How CWE/OWASP/CVSS metadata grounds AI responses
- Demo: "Before/After" comparison of AI-assisted fixes
- Supported AI tools (GitHub Copilot, Cursor, Claude Dev, Antigravity)

**Archived Component to Resurrect**:

- `LLMErrorDemoContent.tsx` - Shows structured vs plain error comparison

**Example Prose**:

```markdown
## Why AI Needs Structured Errors

Traditional linters output plain text errors like:

> "Possible SQL injection vulnerability"

This gives AI assistants no actionable context. They may hallucinate fixes
or apply incorrect patterns.

Interlace provides **structured metadata**:

- **CWE-89**: SQL Injection classification
- **OWASP A03**: Injection category mapping
- **CVSS 9.8**: Critical severity score
- **Fix Pattern**: Parameterized query template

This "ground truth" enables AI agents to:

1. Understand the exact vulnerability type
2. Reference verified remediation patterns
3. Apply fixes with 100% precision
```

---

### 1.2 AST Fundamentals (`concepts/ast-fundamentals.mdx`)

**Purpose**: Demystify how ESLint rules work by explaining Abstract Syntax Trees.

**Key Content**:

- What is an AST? (Visual explanation)
- How ESLint traverses code
- Interactive explorer: See your code as a tree
- Writing custom selectors

**Archived Component to Resurrect**:

- `ASTExplorer.tsx` - Interactive AST visualization with:
  - Live code editing
  - Tree node expansion
  - ESLint selector generation
  - Copy-to-clipboard functionality

**Example Prose**:

````markdown
## The Tree Inside Your Code

ESLint doesn't read code like humans. It parses your JavaScript into an
**Abstract Syntax Tree (AST)**—a structured representation of your code's
grammar.

When you write:

```js
const query = 'SELECT * FROM users WHERE id = ' + userId;
```
````

ESLint sees:

```
Program
└── VariableDeclaration
    └── VariableDeclarator
        ├── Identifier (name: "query")
        └── BinaryExpression (operator: "+")
            ├── Literal (value: "SELECT * FROM users WHERE id = ")
            └── Identifier (name: "userId")
```

Security rules match **patterns** in this tree. The `no-sql-concatenation`
rule triggers when it finds a binary expression concatenating SQL strings
with untrusted identifiers.

## Try It Yourself

<ASTExplorer />

Paste any JavaScript and watch how ESLint "sees" your code.

````

---

### 1.3 Security Metadata (`concepts/security-metadata.mdx`)

**Purpose**: Deep dive into CWE, OWASP, and CVSS—the security standards Interlace maps to.

**Key Content**:
- What is CWE? (Common Weakness Enumeration)
- What is OWASP Top 10?
- What is CVSS scoring?
- How Interlace maps rules to these standards
- Why this mapping matters for compliance

**Data Assets**:
- `cwe-names.json` - CWE ID to name mapping
- OWASP mappings from `ReadmeRulesTable.tsx`

**Example Prose**:
```markdown
## Industry Security Standards

Interlace maps every security rule to three industry standards:

### CWE (Common Weakness Enumeration)

A community-developed dictionary of software weaknesses maintained by MITRE.
Each weakness has a unique ID (e.g., CWE-89 for SQL Injection).

| CWE ID | Name | Risk Category |
|--------|------|---------------|
| CWE-89 | SQL Injection | Injection |
| CWE-79 | Cross-site Scripting | Web |
| CWE-327 | Use of Weak Crypto | Cryptography |

### OWASP Top 10

The Open Web Application Security Project publishes the most critical
web application risks. Interlace covers **100% of the OWASP Top 10 2021**.

### CVSS (Common Vulnerability Scoring System)

A severity rating from 0.0 to 10.0. Interlace rules display CVSS scores
to help prioritize fixes:

| Score Range | Severity | Action |
|-------------|----------|--------|
| 9.0 - 10.0 | Critical | Fix immediately |
| 7.0 - 8.9 | High | Fix in sprint |
| 4.0 - 6.9 | Medium | Scheduled fix |
| 0.1 - 3.9 | Low | Monitor |
````

---

### 1.4 Detect-Understand-Fix Workflow (`concepts/detect-understand-fix.mdx`)

**Purpose**: Showcase the "Cinematic" 3-step workflow that defines Interlace's UX.

**Key Content**:

- The 3-step workflow visualization
- Step-by-step walkthrough with real vulnerability
- How AI agents consume each step
- Integration with editor fix actions

**Archived Component to Resurrect**:

- `LLMWorkflowDemoContent.tsx` - Animated demo showing:
  - Step 1: Detect (ESLint catches vulnerability)
  - Step 2: Understand (AI reads structured metadata)
  - Step 3: Fix (Accurate remediation applied)

**Cinematic Requirements**:

- Motion-first transitions (Framer Motion)
- Code gutter neon effects
- Translucent backdrop on terminal mockups
- Play/pause controls
- Responsive breakpoint handling

---

## Priority 2: Ecosystem Transparency (within Concepts)

### 2.1 Live Coverage Metrics (`concepts/coverage.mdx`)

**Purpose**: Build trust through transparency—show real test coverage.

**Key Content**:

- Real-time Codecov integration
- Per-plugin coverage breakdown
- Coverage standards (Core: 85%+, Others: 80%+)
- Visual gauges with color coding

**Archived Component to Resurrect**:

- `CoveragePageContent.tsx` - Features:
  - NumberTicker animated counters
  - Plugin coverage cards
  - Progress bars with gradients
  - Live API integration (Codecov)

**API Requirements**:

- `useCodecovRepo()` hook
- `useCodecovComponents()` hook

---

### 2.2 Performance Benchmarks (`concepts/benchmarks.mdx`)

**Purpose**: Demonstrate Interlace's performance advantages.

**Key Content**:

- Rule count comparison (vs eslint-plugin-security, sonarjs, etc.)
- Performance improvements (100x faster cycle detection)
- Feature matrix comparison
- "Killer Features" spotlight

**Archived Component to Resurrect**:

- `BenchmarkChartsContent.tsx` - Features:
  - CSS bar charts (no heavy chart library)
  - Performance comparison cards
  - Feature matrix table
  - Killer features grid

---

## Priority 3: Advanced Topics Section

### 3.1 Roadmap (`advanced/roadmap.mdx`)

**Purpose**: Show the development direction and upcoming features.

**Key Content**:

- Live GitHub ROADMAP.md integration
- Milestone visualization
- Feature voting/feedback integration
- Release timeline

**Archived Component to Resurrect**:

- `GitHubRoadmap.tsx` - Features:
  - GitHub raw content fetching
  - Markdown rendering
  - Caching strategy

**API Requirements**:

- `useGitHubRoadmap()` hook

---

### 3.2 Changelog (`advanced/changelog.mdx`)

**Purpose**: Version history with structured release notes.

**Key Content**:

- Per-version changelog sections
- Breaking change highlighting
- Security fix indicators
- Migration guidance per version

**Archived Component to Resurrect**:

- `GitHubChangelogContent.tsx` - Features:
  - Version parsing
  - Tagged sections (breaking, security, feature)
  - Collapsible version blocks

---

### 3.3 CI/CD Integration (`advanced/ci-cd.mdx`)

**Purpose**: Guide for integrating Interlace into CI/CD pipelines.

**Key Content**:

- GitHub Actions workflow examples
- GitLab CI configuration
- Fail-on-security-error configuration
- PR comment integration
- Performance optimization for CI

**Example Prose**:

```yaml
# .github/workflows/lint.yml
name: ESLint Security Check
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx eslint . --max-warnings 0
```

---

### 3.4 Contributing Rules (`advanced/contributing.mdx`)

**Purpose**: Guide for contributing new security rules to the ecosystem.

**Key Content**:

- Rule anatomy (meta, create, schema)
- Test-first development approach
- Documentation requirements
- CWE/OWASP mapping standards
- PR checklist

---

## Priority 4: Supporting Components

### 3.1 Interactive Components to Port

| Component          | Source File                  | Target Location                 | Complexity |
| ------------------ | ---------------------------- | ------------------------------- | ---------- |
| `ASTExplorer`      | `ASTExplorer.tsx`            | `src/components/mdx/cinematic/` | High       |
| `LLMWorkflowDemo`  | `LLMWorkflowDemoContent.tsx` | `src/components/mdx/cinematic/` | High       |
| `LLMErrorDemo`     | `LLMErrorDemoContent.tsx`    | `src/components/mdx/cinematic/` | Medium     |
| `CoveragePage`     | `CoveragePageContent.tsx`    | `src/components/mdx/concepts/`  | Medium     |
| `BenchmarkCharts`  | `BenchmarkChartsContent.tsx` | `src/components/mdx/concepts/`  | Medium     |
| `Mermaid`          | `MermaidContent.tsx`         | `src/components/mdx/`           | Medium     |
| `ReadmeRulesTable` | `ReadmeRulesTable.tsx`       | `src/components/mdx/`           | High       |

### 3.2 Data Dependencies

| Data File             | Purpose                  |
| --------------------- | ------------------------ |
| `cwe-names.json`      | CWE ID to name mapping   |
| `cwe-stats.json`      | CWE risk statistics      |
| `plugin-stats.json`   | Ecosystem metrics        |
| `plugin-rules/*.json` | Per-plugin rule metadata |

### 3.3 API Routes Required

| Route                   | Purpose               |
| ----------------------- | --------------------- |
| `/api/stats`            | Codecov repo summary  |
| `/api/stats/components` | Per-plugin coverage   |
| `/api/plugin-stats`     | Ecosystem rule counts |

---

## Priority 4: UI/UX Standards

### 4.1 The "Cinematic Standard"

All interactive components MUST follow:

1. **Motion-First Transitions**: Use Framer Motion's AnimatePresence
2. **Code Gutter Neon**: Glowing borders on verified code
3. **Translucent Backdrop**: Dark overlays on terminal mockups
4. **Responsive Design**: Mobile-first with breakpoint handling
5. **Accessibility**: WCAG AAA compliant colors

### 4.2 Color System

| State            | Color         | Usage                             |
| ---------------- | ------------- | --------------------------------- |
| Error/Vulnerable | `red-500`     | Error highlights, critical badges |
| Warning          | `amber-500`   | Warnings, CWE badges              |
| Success/Fixed    | `emerald-500` | Fixed code, verified states       |
| Primary          | `violet-500`  | Interlace branding, links         |
| Info             | `cyan-500`    | OWASP badges, informational       |

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

- [ ] Create `concepts/` directory structure
- [ ] Port `Mermaid` component for diagrams
- [ ] Draft `ai-integration.mdx` (prose only)
- [ ] Draft `security-metadata.mdx` (prose + tables)

### Phase 2: Interactive Components (Week 2)

- [ ] Port `ASTExplorer` component to MDX
- [ ] Port `LLMWorkflowDemo` component
- [ ] Create `ast-fundamentals.mdx` with interactive demo
- [ ] Create `detect-understand-fix.mdx` with workflow demo

### Phase 3: Ecosystem Transparency (Week 3)

- [ ] Set up API routes (`/api/stats`, `/api/plugin-stats`)
- [ ] Port `CoveragePageContent` component
- [ ] Port `BenchmarkChartsContent` component
- [ ] Create `ecosystem/` section pages

### Phase 4: Polish & Integration (Week 4)

- [ ] Responsive testing (all breakpoints)
- [ ] Accessibility audit
- [ ] Navigation updates (`meta.json`)
- [ ] Cross-linking between concept pages
- [ ] SEO metadata for new pages

---

## Success Metrics

| Metric                         | Target       |
| ------------------------------ | ------------ |
| New concept pages              | 4 pages      |
| Interactive components         | 5 components |
| Ecosystem pages                | 3 pages      |
| Test coverage for components   | 80%+         |
| Lighthouse accessibility score | 100          |

---

## Appendix: Archived Component Inventory

### High-Value Components (Port First)

1. `ASTExplorer.tsx` - Interactive AST visualization (390 lines)
2. `LLMWorkflowDemoContent.tsx` - Cinematic workflow demo (476 lines)
3. `CoveragePageContent.tsx` - Live coverage metrics (241 lines)
4. `BenchmarkChartsContent.tsx` - Performance comparisons (285 lines)
5. `ReadmeRulesTable.tsx` - Rules table with CWE/OWASP mapping (550 lines)

### Supporting Components

6. `MermaidContent.tsx` - Diagram rendering (336 lines)
7. `LLMErrorDemoContent.tsx` - AI error comparison (estimated)
8. `DevToArticlesContent.tsx` - Article integration (for future)

### Data Files

- `cwe-names.json` - 5,438 bytes
- `plugin-stats.json` - 5,056 bytes
- `plugin-rules/` - Per-plugin rule metadata

### API Infrastructure

- `api.ts` - React Query hooks and API services (375 lines)

---

## Notes

- Components use Tailwind CSS (compatible with current setup)
- Heavy use of Lucide icons (already in project)
- Framer Motion for animations (may need to add)
- React Query for data fetching (may need to add)
- MagicUI components referenced (shimmer buttons, etc.)
