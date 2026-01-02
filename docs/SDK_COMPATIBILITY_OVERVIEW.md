# SDK Compatibility Testing - System Overview

> **Last Updated:** 2026-01-02  
> **Status:** Active  
> **Owner:** Interlace ESLint Team

## TL;DR

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SDK COMPATIBILITY TESTING FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐     ┌───────────┐     ┌───────────┐     ┌──────────────────┐ │
│  │  Weekly  │ ──► │  Install  │ ──► │   Run     │ ──► │  Pass? ───► Done │ │
│  │  Trigger │     │  Latest   │     │  Vitest   │     │                  │ │
│  └──────────┘     │  SDK @npm │     │  Tests    │     │  Fail? ───► ⬇    │ │
│                   └───────────┘     └───────────┘     └──────────────────┘ │
│                                                                             │
│                              ┌──────────────────────────────────────────┐  │
│                              │  Generate LLM-Friendly Report            │  │
│                              │  Create GitHub Issue                     │  │
│                              │  Upload Artifacts for Investigation      │  │
│                              └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Problem Statement

Our ESLint plugins depend on third-party SDK APIs:

| Plugin                             | SDK Dependencies                     |
| ---------------------------------- | ------------------------------------ |
| `eslint-plugin-pg`                 | `pg` (node-postgres)                 |
| `eslint-plugin-jwt`                | `jsonwebtoken`, `jose`, `jwt-decode` |
| `eslint-plugin-vercel-ai-security` | `ai` (Vercel AI SDK)                 |
| `eslint-plugin-express-security`   | `express`, `helmet`, `cors`          |
| `eslint-plugin-nestjs-security`    | `@nestjs/common`, `class-validator`  |
| `eslint-plugin-lambda-security`    | `@middy/core` and middleware         |

**The Risk:** If an SDK changes its API (removes a method, renames a class, changes a signature), our ESLint rules may:

- Fail to detect issues they were designed to catch
- Throw runtime errors when analyzing user code
- Provide incorrect suggestions or fixes

---

## Solution Architecture

### 1. Interface Tests (Vitest)

Each plugin contains an `src/__compatibility__/*.spec.ts` file that tests:

```typescript
// Example: pg-interface.spec.ts
describe('pg Interface Compatibility', () => {
  it('exports Client class', () => {
    expect(pg.Client).toBeDefined();
    expect(typeof pg.Client).toBe('function');
  });

  it('Client.prototype.query exists', () => {
    expect(pg.Client.prototype.query).toBeDefined();
    expect(typeof pg.Client.prototype.query).toBe('function');
  });

  // ... more interface verifications
});
```

**What We Test:**

- ✅ Class/function exports exist
- ✅ Prototype methods are defined
- ✅ Required properties are present
- ✅ Function types are correct

**What We DON'T Test:**

- ❌ Runtime behavior (SDK's own test suite handles this)
- ❌ Full integration scenarios
- ❌ Performance characteristics

### 2. GitHub Workflows (Scheduled)

Each SDK has its own workflow file (`.github/workflows/sdk-*.yml`):

```
.github/workflows/
├── sdk-pg.yml           # PostgreSQL
├── sdk-jwt.yml          # JWT ecosystem
├── sdk-vercel-ai.yml    # Vercel AI
├── sdk-express.yml      # Express ecosystem
├── sdk-nestjs.yml       # NestJS
└── sdk-lambda.yml       # Lambda/Middy
```

**Schedule:** Every Monday at 6 AM UTC

**Why Separate Workflows?**

- Clear isolation of failures
- Independent scheduling if needed
- Focused issue creation per SDK
- Simpler manual reruns

### 3. LLM-Friendly Reports

On failure, the workflow generates a structured report:

```markdown
# 🚨 pg SDK Breaking Change Report

## Summary

The eslint-plugin-pg interface compatibility tests have FAILED.

## Version Information

| Property           | Value  |
| ------------------ | ------ | --- | ------ | --- | ------ |
| **pg tested**      | 8.12.0 |
| **peerDeps range** | ^6.0.0 |     | ^7.0.0 |     | ^8.0.0 |

## Affected Rules

| Interface      | Rules That May Need Updates       |
| -------------- | --------------------------------- |
| Client.query() | no-unsafe-query, no-sql-injection |
| Pool.connect() | no-missing-client-release         |
| Pool.release() | no-double-release                 |

## Required Actions

1. Review pg changelog for breaking changes
2. Update interface tests if API intentionally changed
3. Modify affected ESLint rules
4. Update peerDependencies if major version
```

### 4. Automated Issue Creation

When tests fail:

1. Workflow checks for existing open issues with `sdk-compatibility` + SDK label
2. If no existing issue → Creates new issue with report
3. If existing issue → Adds comment with new test results

---

## How It Detects Breaking Changes

### Example Scenario: pg v9 Removes `Query` Class

**Before (pg v8):**

```javascript
const { Client, Pool, Query } = require('pg');
const q = new Query(...);  // Works
```

**After (pg v9):**

```javascript
const { Client, Pool } = require('pg'); // Query removed!
```

**Our Test:**

```typescript
it('exports Query class', () => {
  expect(pg.Query).toBeDefined(); // ❌ FAILS in v9
});
```

**Result:**

1. Test fails → Workflow fails
2. Report generated with context
3. Issue created: "🚨 [SDK Compatibility] pg Breaking Changes (v9.0.0)"
4. Team investigates and updates rules

---

## Test Coverage by Plugin

### pg (24 tests)

| Category         | Tests | Interfaces Verified                       |
| ---------------- | ----- | ----------------------------------------- |
| Core Exports     | 5     | Client, Pool, Query, types, default       |
| Client Interface | 5     | constructor, query, connect, end, release |
| Pool Interface   | 5     | constructor, query, connect, end, on      |
| SSL Config       | 1     | rejectUnauthorized pattern                |
| COPY FROM        | 1     | query() accepts COPY                      |
| Type Utilities   | 3     | getTypeParser, setTypeParser              |
| Search Path      | 1     | SET statements                            |
| Metadata         | 1     | version discovery                         |

### Vercel AI (12 tests)

| Category       | Tests | Interfaces Verified                                    |
| -------------- | ----- | ------------------------------------------------------ |
| Core Functions | 4     | generateText, streamText, generateObject, streamObject |
| Embedding      | 2     | embed, embedMany                                       |
| Tools          | 1     | tool()                                                 |
| Messages       | 1     | CoreMessage pattern                                    |
| Streaming      | 2     | createTextStreamResponse, pipeTextStreamToResponse     |
| Registry       | 1     | experimental_createProviderRegistry                    |
| Metadata       | 1     | version discovery                                      |

### JWT Ecosystem (17 tests)

| Category     | Tests | Interfaces Verified                             |
| ------------ | ----- | ----------------------------------------------- |
| jsonwebtoken | 9     | sign, verify, decode, options                   |
| jose         | 6     | SignJWT, jwtVerify, jwtDecrypt, generateKeyPair |
| jwt-decode   | 2     | jwtDecode, InvalidTokenError                    |

---

## Running Locally

```bash
# Run all compatibility tests from workspace root
pnpm vitest run packages/*/src/__compatibility__/*.spec.ts

# Run specific plugin
pnpm vitest run packages/eslint-plugin-pg/src/__compatibility__/*.spec.ts

# With verbose output
pnpm vitest run packages/eslint-plugin-pg/src/__compatibility__/*.spec.ts --reporter=verbose
```

**Expected Output:**

```
✓ packages/eslint-plugin-pg/src/__compatibility__/pg-interface.spec.ts
  ✓ pg Interface Compatibility
    ✓ Core Exports
      ✓ exports Client class
      ✓ exports Pool class
      ...
    ✓ Client Interface
      ✓ Client.prototype.query exists
      ...

 Test Files  1 passed (1)
      Tests  24 passed (24)
```

---

## When Tests Fail

### Step 1: Identify the Failure

```
❌ packages/eslint-plugin-pg/src/__compatibility__/pg-interface.spec.ts
  ✓ pg Interface Compatibility
    ✓ Core Exports
      ❌ exports Query class (AssertionError: expected undefined to be defined)
```

### Step 2: Check SDK Changelog

Find the changelog for the SDK version that was tested:

- npm: `npm view pg versions --json`
- GitHub: Check release notes

### Step 3: Determine Impact

Ask: **Do our rules actually use this interface?**

If YES:

- Update rules to handle the change
- Possibly add version-aware logic

If NO:

- Update or remove the test
- Document why it was removed

### Step 4: Update Peer Dependencies

If the SDK change is a major version that requires rule changes:

```json
// Before
"peerDependencies": {
  "pg": "^6.0.0 || ^7.0.0 || ^8.0.0"
}

// After
"peerDependencies": {
  "pg": "^8.0.0 || ^9.0.0"
}
```

---

## Adding a New SDK

### Step 1: Create Interface Test

```bash
mkdir -p packages/eslint-plugin-{name}/src/__compatibility__
```

Create `{sdk}-interface.spec.ts` following the template in `docs/SDK_COMPATIBILITY_TEMPLATE.md`.

### Step 2: Create Workflow

Copy an existing `sdk-*.yml` and modify:

- `name`
- `PLUGIN_PATH`
- `SDK_PACKAGE`
- Package installation commands
- Report content

### Step 3: Add Labels

Ensure these labels exist:

- `sdk-compatibility`
- `{technology}` (e.g., `mongodb`)
- `maintenance`
- `breaking-change`

### Step 4: Install SDK

```bash
pnpm add {sdk}@latest --save-dev -w
```

---

## Current Status

| Workflow            | Interface Tests | Status         |
| ------------------- | --------------- | -------------- |
| `sdk-pg.yml`        | 24 tests        | ✅ Active      |
| `sdk-jwt.yml`       | 19 tests        | ✅ Active      |
| `sdk-vercel-ai.yml` | 12 tests        | ✅ Active      |
| `sdk-express.yml`   | 21 tests        | ✅ Active      |
| `sdk-nestjs.yml`    | 38 tests        | ✅ Active      |
| `sdk-lambda.yml`    | 9 tests         | ✅ Active      |
| **Total**           | **123 tests**   | ✅ All Passing |

---

## Why This Approach Works

1. **Proactive, Not Reactive**  
   We catch breaking changes before users report issues.

2. **Minimal Runtime Overhead**  
   Tests only verify interface shapes, not behavior.

3. **LLM-Ready Reports**  
   AI agents can read the failure reports and suggest fixes.

4. **Issue Tracking**  
   Breaking changes create trackable GitHub issues.

5. **Developer-Friendly**  
   Local runs work the same as CI.

---

## Limitations

1. **Tests Can't Catch Everything**  
   Subtle behavior changes (same signature, different semantics) aren't detected.

2. **Optional Dependencies**  
   Some SDKs are optional - tests skip gracefully but may miss issues.

3. **Weekly Schedule**  
   A breaking change published on Tuesday isn't caught until Monday.

4. **Single Version Testing**  
   We only test `@latest`, not matrix of versions.

---

## Future Enhancements

- [ ] Daily runs for critical SDKs
- [ ] Slack/Discord notifications on failure
- [ ] Auto-PR creation with suggested fixes
- [ ] Multi-version matrix testing (LTS + Latest)
- [ ] Coverage tracking for interface tests

---

_Maintained by the Interlace ESLint Team_
