# Antigravity Platform Stability & Log Discovery

**Status:** Active Rule (Jan 2026)
**Objective:** Prevent Antigravity crashes due to FSEvents overflow and provide rapid discovery of diagnostic logs.

## 🔍 Log Discovery (Fast Track)

When Antigravity crashes or behaves unexpectedly, use these paths:

### 1. Application & Service Logs

Details about language server crashes, network errors, and system-level failures.

- **Path:** `~/Library/Application Support/Antigravity/logs/`
- **Latest Sessions:** Sorted by timestamp (e.g., `20260120T073338/`).
- **Key Files:**
  - `main.log`: Startup and high-level service events.
  - `window1/renderer.log`: UI errors and File Watcher (Parcel) drops.
  - `ptyhost.log`: Terminal and shell process issues.

### 2. Agent & Chat Task Logs

Step-by-step execution details of the AI agents.

- **Path:** `~/.gemini/antigravity/brain/<CONVERSATION_ID>/.system_generated/logs/`
- **Diagnostic:** Check `overview.txt` or individual task files.

---

## 🎯 Directing AI Focus (Scoping)

To improve performance and avoid processing the entire monorepo, you can instruct the agent to focus on specific modules.

### 1. Rule-Based Scoping (Recommended)

Create a rule in `.agent/rules/` that uses **Glob Activation**.
Example: `docs-focus.md`

```markdown
---
description: Focus on Docs App and Secure Coding Plugin
globs: [apps/docs/**, packages/eslint-plugin-secure-coding/**]
---

# Docs & Security Focus

When working within these paths, prioritize the documentation architecture and security rule standards.
```

### 2. Manual Scoping (In-Chat)

You can @mention rules or specific files to bring them into the active context without scanning the whole repo.

---

## 🛡️ Stability & Resilience Standards

### 1. FSEvents Overflow Prevention

- **Standard .gitignore**: Antigravity respects `.gitignore`. High-churn directories (`.next`, `.nx`, `dist`, `node_modules`) must be ignored to prevent buffer overflows.
- **Avoid Redundant Scanning**: If experiencing lag, ensure dev servers (which generate thousands of file events) are not being indexed.

### 2. Deep Recovery Protocol

If the application is pinned (high CPU) or stuck in a "Failed to fetch" loop:

1.  **Kill Zombie Processes**:
    ```bash
    killall -9 Antigravity language_server_macos_arm "Antigravity Helper"
    ```
2.  **Run Hardening Script**: Use the specialist script in the devtools repo:
    ```bash
    bash ~/repos/ofriperetz.dev/devtools/scripts/antigravity-performance-hardening.sh
    ```

**Standard Owner**: @interlace-dev
