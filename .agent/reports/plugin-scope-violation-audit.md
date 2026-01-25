# Plugin Scope Violation Audit Report

> **Date**: January 25, 2026  
> **Auditor**: Antigravity Agent  
> **Standard**: [plugin-classification-graph.md](../plugin-classification-graph.md)

---

## ✅ Completed Migrations

### 1. `no-pii-in-logs` — ✅ MIGRATED

| Previous Plugin | Rule             | New Plugin      | Status      |
| :-------------- | :--------------- | :-------------- | :---------- |
| `node-security` | `no-pii-in-logs` | `secure-coding` | ✅ **DONE** |

**Rationale**: This rule detects `console.log()` with PII data — a universal data exposure flaw (CWE-359) that applies in ALL environments. It passes the `secure-coding` litmus test: fires correctly in CLI, React, and NestJS.

---

### 2. `no-client-side-auth-logic` — ✅ MIGRATED

| Previous Plugin | Rule                        | New Plugin         | Status      |
| :-------------- | :-------------------------- | :----------------- | :---------- |
| `secure-coding` | `no-client-side-auth-logic` | `browser-security` | ✅ **DONE** |

**Rationale**: This rule detects `localStorage.getItem()` with auth keys — a browser-only API. It now correctly lives in `browser-security`.

---

## 🟠 Remaining Medium Violations (Backlog)

### 3. `prefer-dom-node-text-content` in `conventions`

| Current Plugin | Rule                           | Violation Type                             |
| :------------- | :----------------------------- | :----------------------------------------- |
| `conventions`  | `prefer-dom-node-text-content` | **Environment-Specific in Generic Plugin** |

**Action**: Leave in `conventions` with documentation caveat that it only applies to browser code.

---

### 4. `no-electron-security-issues` in `secure-coding`

| Current Plugin  | Rule                          | Violation Type                           |
| :-------------- | :---------------------------- | :--------------------------------------- |
| `secure-coding` | `no-electron-security-issues` | **Framework-Specific in Generic Plugin** |

**Action**: Consider creating dedicated `eslint-plugin-electron-security` in future.

---

### 5. `no-hardcoded-session-tokens` in `secure-coding`

| Current Plugin  | Rule                          | Status          |
| :-------------- | :---------------------------- | :-------------- |
| `secure-coding` | `no-hardcoded-session-tokens` | **Audit Later** |

**Action**: Review for overlap with `no-hardcoded-credentials` and consolidate if redundant.

---

## ✅ Well-Placed Rules (Confirmed Correct)

| Plugin             | Rule                               | Status                                     |
| :----------------- | :--------------------------------- | :----------------------------------------- |
| `node-security`    | `detect-child-process`             | ✅ Correct - Node.js specific              |
| `node-security`    | `detect-non-literal-fs-filename`   | ✅ Correct - Node.js `fs` module           |
| `node-security`    | `no-zip-slip`                      | ✅ Correct - Node.js file extraction       |
| `node-security`    | `no-cryptojs`                      | ✅ Correct - Backend avoidance principle   |
| `browser-security` | `no-innerhtml`                     | ✅ Correct - Browser DOM API               |
| `browser-security` | `no-eval`                          | ✅ Correct - Browser context XSS           |
| `browser-security` | `require-postmessage-origin-check` | ✅ Correct - Browser `postMessage`         |
| `browser-security` | `no-jwt-in-storage`                | ✅ Correct - Browser storage               |
| `browser-security` | `no-client-side-auth-logic`        | ✅ Correct - Browser storage auth (NEW)    |
| `secure-coding`    | `no-graphql-injection`             | ✅ Correct - Universal injection           |
| `secure-coding`    | `detect-object-injection`          | ✅ Correct - Universal prototype pollution |
| `secure-coding`    | `no-hardcoded-credentials`         | ✅ Correct - Universal secret exposure     |
| `secure-coding`    | `no-redos-vulnerable-regex`        | ✅ Correct - Universal regex flaw          |
| `secure-coding`    | `no-pii-in-logs`                   | ✅ Correct - Universal PII exposure (NEW)  |
| `lambda-security`  | `no-permissive-cors-response`      | ✅ Correct - Lambda-specific CORS          |
| `lambda-security`  | `no-overly-permissive-iam-policy`  | ✅ Correct - AWS IAM specific              |
| `express-security` | `require-helmet`                   | ✅ Correct - Express middleware            |
| `express-security` | `require-csrf-protection`          | ✅ Correct - Express middleware            |
| `operability`      | `no-console-log`                   | ✅ Correct - Production readiness          |
| `maintainability`  | `cognitive-complexity`             | ✅ Correct - Clean code                    |
| `reliability`      | `no-unhandled-promise`             | ✅ Correct - Error handling                |
| `conventions`      | `filename-case`                    | ✅ Correct - Naming conventions            |

---

## 📋 Action Items Summary

| Priority | Action                                                    | Status      |
| :------- | :-------------------------------------------------------- | :---------- |
| 🔴 P0    | Migrate `no-pii-in-logs` to `secure-coding`               | ✅ **DONE** |
| 🔴 P0    | Migrate `no-client-side-auth-logic` to `browser-security` | ✅ **DONE** |
| 🟠 P1    | Decide on `no-electron-security-issues`                   | 📅 Backlog  |
| 🟡 P2    | Document `prefer-dom-node-text-content` browser scope     | 📅 Backlog  |
| 🟡 P2    | Audit `no-hardcoded-session-tokens` overlap               | 📅 Backlog  |

---

## 📊 Audit Statistics

| Metric               | Count |
| :------------------- | ----: |
| Rules Audited        |  ~150 |
| Critical Violations  |     2 |
| Migrations Completed |     2 |
| Backlog Items        |     3 |
| Confirmed Correct    |   22+ |

---

_Last Updated: January 25, 2026_
