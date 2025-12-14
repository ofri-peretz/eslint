# CI/CD Workflow States & Deadlock Prevention

This document provides a comprehensive visual guide to all workflow states, conditions, and how deadlocks are prevented.

## Guarantee: CI Pass → Manual Triggers Work

> **The Core Promise**: If CI passes on a PR, all manual workflow triggers will either:
>
> 1. ✅ Complete successfully, or
> 2. ℹ️ Report "no changes" (graceful exit, not a failure)

There are **no scenarios** where CI passes but a manual trigger fails with a blocking error.

---

## State Diagram Overview

```mermaid
flowchart TD
    subgraph "Developer"
        A[Push Code] --> B[Create PR]
    end

    subgraph "PR Checks - Run in Parallel"
        B --> C[CI Workflow]
        B --> D[ESLint Workflow]

        C --> C1{Tests Pass?}
        C1 -->|Yes| C2{Build Pass?}
        C1 -->|No| C3[❌ CI Fail]
        C2 -->|Yes| C4{Typecheck Pass?}
        C2 -->|No| C3
        C4 -->|Yes| C5[✅ CI Pass]
        C4 -->|No| C3

        D --> D1{Lint Pass?}
        D1 -->|Yes| D2[✅ Lint Pass]
        D1 -->|No| D3[❌ Lint Fail]
    end

    C3 --> E[Fix Required]
    D3 --> E
    E --> A

    C5 --> F{Both Pass?}
    D2 --> F
    F -->|Yes| G[✅ Ready to Merge]
    F -->|No| E

    G --> H[Merge to main]

    subgraph "Manual Workflows - Trigger When Ready"
        H --> I[Release Workflow]
        H --> J[Codecov Workflow]

        I --> I1{Changes Found?}
        I1 -->|Yes| I2[✅ Published to NPM]
        I1 -->|No| I3[ℹ️ No Changes]
        I1 -->|Already on NPM| I4[ℹ️ Already Published]

        J --> J1[✅ Coverage Uploaded]
    end

    style C5 fill:#90EE90
    style D2 fill:#90EE90
    style G fill:#90EE90
    style I2 fill:#90EE90
    style J1 fill:#90EE90
    style C3 fill:#FF6B6B
    style D3 fill:#FF6B6B
    style I3 fill:#87CEEB
    style I4 fill:#87CEEB
```

---

## All Possible States by Workflow

### 1. CI Workflow States

```mermaid
flowchart TD
    A[CI Triggered] --> B{Docs only?}
    B -->|Yes| C[✅ Skip - Auto Pass]
    B -->|No| D[Run Full CI]

    D --> E{Tests Pass?}
    E -->|No| F[❌ Fail - Tests]
    E -->|Yes| G{Build Pass?}

    G -->|No| H[❌ Fail - Build]
    G -->|Yes| I{Typecheck Pass?}

    I -->|No| J[❌ Fail - Types]
    I -->|Yes| K[Release Dry-Run]

    K --> L{Dry-run issues?}
    L -->|Yes| M[⚠️ Warning Only]
    L -->|No| N[✅ Clean]

    M --> O[✅ CI PASS]
    N --> O

    C --> O

    style O fill:#90EE90
    style F fill:#FF6B6B
    style H fill:#FF6B6B
    style J fill:#FF6B6B
    style M fill:#FFD93D
```

**Key Point**: Release dry-run is **non-blocking** (`continue-on-error: true`). It warns but doesn't fail CI.

---

### 2. ESLint Workflow States

```mermaid
flowchart TD
    A[Lint Triggered] --> B{Affected files?}
    B -->|No| C[✅ Skip - No changes]
    B -->|Yes| D[Run ESLint + Reviewdog]

    D --> E{Errors found?}
    E -->|Yes| F[❌ Fail + PR Comments]
    E -->|No| G[✅ Pass]

    C --> G

    style G fill:#90EE90
    style F fill:#FF6B6B
```

---

### 3. Release Workflow States (The Complex One)

```mermaid
flowchart TD
    A[Manual Trigger] --> B{CI validation?}

    B -->|Yes| C[Run Tests + Build + Typecheck]
    B -->|No| D[Skip CI]

    C --> E{CI Pass?}
    E -->|No| F[❌ ABORT - Fix code first]
    E -->|Yes| G[Continue to Release]
    D --> G

    G --> H[Verify NPM Token]
    H --> I{Token valid?}
    I -->|No| J[❌ ABORT - Add NPM_TOKEN secret]
    I -->|Yes| K[Check Tag Conflicts]

    K --> L{Tag exists?}
    L -->|No| M[Clean - proceed]
    L -->|Yes| N{Version on NPM?}

    N -->|Yes| O[ℹ️ Already Published - Skip all]
    N -->|No| P[🧹 Orphaned Tag - Clean up]
    P --> M

    M --> Q[NX Release Version]
    Q --> R{Changes detected?}

    R -->|No| S[ℹ️ No Changes - Skip]
    R -->|Yes| T{Tag conflict?}

    T -->|Yes| U[Auto-bump to patch]
    T -->|No| V[Apply version]
    U --> V

    V --> W[Build Package]
    W --> X[Generate Changelog]
    X --> Y[Push to Git]
    Y --> Z[Publish to NPM]

    Z --> AA{Already on NPM?}
    AA -->|Yes| BB[ℹ️ Skip publish]
    AA -->|No| CC[✅ PUBLISHED]

    BB --> DD[✅ SUCCESS]
    CC --> DD
    S --> DD
    O --> DD

    style DD fill:#90EE90
    style F fill:#FF6B6B
    style J fill:#FF6B6B
    style O fill:#87CEEB
    style S fill:#87CEEB
    style BB fill:#87CEEB
```

---

### 4. Codecov Workflow States

```mermaid
flowchart TD
    A[Trigger: Manual or Weekly] --> B{Project specified?}

    B -->|Yes| C{Project exists?}
    C -->|No| D[❌ ABORT - Invalid project]
    C -->|Yes| E[Run tests for project]

    B -->|No| F[Run tests for ALL packages]

    E --> G{Some tests fail?}
    F --> G

    G -->|Yes| H[⚠️ Continue anyway]
    G -->|No| I[All passed]

    H --> J[Upload to Codecov]
    I --> J

    J --> K{Upload success?}
    K -->|No| L[⚠️ Warning - non-blocking]
    K -->|Yes| M[✅ SUCCESS]

    L --> M

    style M fill:#90EE90
    style D fill:#FF6B6B
    style H fill:#FFD93D
    style L fill:#FFD93D
```

---

## Deadlock Prevention Mechanisms

### What is a Deadlock?

A deadlock occurs when a workflow can't proceed and can't be fixed without manual intervention that also fails. For example:

```
❌ DEADLOCK EXAMPLE (prevented by smart tag handling):
1. Release creates tag v1.0.0
2. Publish to NPM fails (network error)
3. Next release attempt sees tag exists
4. Refuses to proceed → stuck forever
```

### How We Prevent Deadlocks

```mermaid
flowchart TD
    subgraph "Deadlock Prevention Layer 1: Smart Tag Handling"
        A1[Tag exists?] --> B1{Published on NPM?}
        B1 -->|Yes| C1[Skip - already done]
        B1 -->|No| D1[Delete orphan tag & retry]
    end

    subgraph "Deadlock Prevention Layer 2: Idempotent Publish"
        A2[Before publish] --> B2{Version on NPM?}
        B2 -->|Yes| C2[Skip publish - success]
        B2 -->|No| D2[Proceed with publish]
    end

    subgraph "Deadlock Prevention Layer 3: Auto Patch Bump"
        A3[NX version fails] --> B3{Tag conflict?}
        B3 -->|Yes| C3[Auto-bump to patch]
        B3 -->|No| D3[Fail with real error]
    end

    subgraph "Deadlock Prevention Layer 4: Non-blocking Warnings"
        A4[CI dry-run fails?] --> B4[Warning only]
        A4 --> C4[Changelog fails?]
        C4 --> D4[Warning only, continue]
    end
```

---

## CI → Manual Workflow Guarantee Matrix

| CI Validates              | Release Uses          | Match? | Guarantee                    |
| ------------------------- | --------------------- | :----: | ---------------------------- |
| Test passes               | Test (if run-ci=true) |   ✅   | Same test runs               |
| Build passes              | Build                 |   ✅   | Same build runs              |
| Typecheck passes          | Typecheck             |   ✅   | Same typecheck runs          |
| Release dry-run (warning) | Release version       |   ⚠️   | Dry-run catches issues early |

### Why It's Bulletproof

```mermaid
flowchart LR
    subgraph "CI (PR)"
        A1[Test] --> B1[Build]
        B1 --> C1[Typecheck]
        C1 --> D1[Release Dry-Run]
    end

    subgraph "Release (Manual)"
        A2[Test] --> B2[Build]
        B2 --> C2[Typecheck]
        C2 --> D2[Version]
        D2 --> E2[Publish]
    end

    A1 -.-> A2
    B1 -.-> B2
    C1 -.-> C2
    D1 -.-> D2

    style A1 fill:#90EE90
    style B1 fill:#90EE90
    style C1 fill:#90EE90
    style D1 fill:#FFD93D
```

**Legend**:

- 🟢 Green = Validated in CI
- 🟡 Yellow = Warning only (non-blocking)

---

## Edge Case Handling

### Edge Case 1: "No Changes Detected"

```mermaid
flowchart TD
    A[Release triggered] --> B[NX analyzes commits]
    B --> C{Conventional commits since last release?}
    C -->|No| D[ℹ️ No Changes - Exit 0]
    C -->|Yes| E[Determine version bump]

    D --> F[✅ SUCCESS - Nothing to release]
    E --> G[Continue release...]

    style F fill:#90EE90
```

**This is NOT a failure.** It means there's nothing new to release.

**Fix options:**

1. Use explicit `version-specifier: patch` to force bump
2. Write conventional commits: `feat:`, `fix:`, etc.

---

### Edge Case 2: Tag Already Published

```mermaid
flowchart TD
    A[Release triggered] --> B[Check existing tags]
    B --> C{eslint-plugin-secure-coding@X.Y.Z exists?}
    C -->|Yes| D[Check NPM]
    C -->|No| E[Clean - proceed normally]

    D --> F{X.Y.Z on NPM?}
    F -->|Yes| G[ℹ️ Already Published - Skip all steps]
    F -->|No| H[🧹 Orphaned tag - clean up]

    H --> E
    G --> I[✅ SUCCESS - No action needed]
    E --> J[Continue release...]

    style I fill:#90EE90
```

**This is NOT a failure.** The release already happened successfully before.

---

### Edge Case 3: NPM Token Issues

```mermaid
flowchart TD
    A[Release triggered] --> B[Verify NPM_TOKEN]
    B --> C{Secret exists?}
    C -->|No| D[❌ ABORT - Add NPM_TOKEN to secrets]
    C -->|Yes| E[npm whoami]

    E --> F{Auth successful?}
    F -->|No| G[❌ ABORT - Token invalid or expired]
    F -->|Yes| H[✅ Proceed with release]

    style D fill:#FF6B6B
    style G fill:#FF6B6B
    style H fill:#90EE90
```

**How to fix:**

1. Go to [npmjs.com](https://www.npmjs.com/) → Access Tokens
2. Generate new Granular token with publish permissions
3. Add to GitHub Secrets: Settings → Secrets → Actions → `NPM_TOKEN`

---

## Complete Success Path

```mermaid
flowchart TD
    subgraph "Developer Workflow"
        A[Write code] --> B[Create PR]
    end

    subgraph "Automated CI/CD"
        B --> C[CI + Lint run in parallel]
        C --> D{Both pass?}
        D -->|No| E[Fix and push]
        E --> C
        D -->|Yes| F[Ready to merge]
        F --> G[Merge to main]
    end

    subgraph "Manual Release"
        G --> H[Trigger Release workflow]
        H --> I{CI validation?}
        I -->|Yes| J[Tests pass ✅]
        I -->|No| K[Skip CI]
        J --> L[Build ✅]
        K --> L
        L --> M[Version bump]
        M --> N{Changes?}
        N -->|No| O[ℹ️ Nothing to release]
        N -->|Yes| P[Publish to NPM]
        P --> Q[✅ Released!]
    end

    style Q fill:#90EE90
    style O fill:#87CEEB
```

---

## Summary: Bulletproof Guarantees

| Scenario                         | CI Passes? | Manual Trigger Result                 |
| -------------------------------- | :--------: | ------------------------------------- |
| Normal release with changes      |     ✅     | ✅ Published                          |
| No conventional commits          |     ✅     | ℹ️ "No changes" (success)             |
| Already published version        |     ✅     | ℹ️ "Already published" (success)      |
| Orphaned tag from failed release |     ✅     | ✅ Auto-cleaned, then published       |
| Missing NPM_TOKEN                |     ✅     | ❌ Fails immediately with clear error |
| Invalid NPM token                |     ✅     | ❌ Fails immediately with clear error |

**The only failures require explicit action:**

- Add `NPM_TOKEN` secret (one-time setup)
- Regenerate expired token (rare)

All other scenarios either succeed or gracefully exit with informative messages.
