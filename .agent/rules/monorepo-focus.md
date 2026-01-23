---
description: Optimization rule to focus the agent on the docs app and secure coding plugin logic.
globs: ['apps/docs/**', 'packages/eslint-plugin-secure-coding/**']
---

# Docs & Security Focus Standard

When this context is active (either via file path glob or manual @mention), the agent should:

1.  **Prioritize Local Context**: Focus analysis on the relationship between the documentation frontend and the security plugin rules.
2.  **Reduce Global Scanning**: Avoid re-scanning unrelated packages in the monorepo (e.g., UI libraries or other plugins) unless explicitly requested.
3.  **Stability First**: If working in this high-churn area, proactively ensure build artifacts are being ignored by the file watcher.

## Reference Paths

- **Documentation**: @/Users/ofri/repos/ofriperetz.dev/eslint/apps/docs
- **Security Plugin**: @/Users/ofri/repos/ofriperetz.dev/eslint/packages/eslint-plugin-secure-coding
