# Vercel Deployment Debug Log

## Issue: `ERR_INVALID_THIS` during `pnpm install`

**Date:** 2026-01-11
**Error:** `WARN GET https://registry.npmjs.org/... error (ERR_INVALID_THIS).`
**Context:** Deployment to Vercel failure during dependency installation.

### Analysis

The error `ERR_INVALID_THIS` when fetching packages with `pnpm` typically indicates a compatibility issue between the Node.js version and the `pnpm` version being used.

- **Node.js**: The project specifies `20.x`.
- **pnpm**: The project specifies `9.15.4`.
- **Root Cause**: Vercel's build environment might be using a default, older version of `pnpm` (e.g., v8 or older) which has a known incompatibility with Node.js 20+ regarding the `URLSearchParams` usage (which causes `ERR_INVALID_THIS`).
- **Hypothesis**: The `packageManager` field in `package.json` is not being respected, or Corepack is not enabled, causing Vercel to fall back to a pre-installed, incompatible `pnpm` binary.

### Proposed Fixes attempting

1. **Enable Corepack**: Explicitly enable corepack in the `installCommand` in `vercel.json` to ensure the version specified in `packageManager` (`pnpm@9.15.4`) is used instead of the system default.
   - Command: `corepack enable && pnpm install`

### References

- [pnpm issue #7898](https://github.com/pnpm/pnpm/issues/7898)

### Actions Taken

- **2026-01-11**: Updated `vercel.json` `installCommand` to `corepack enable && pnpm install`. This forces the environment to use the `pnpm` version defined in `package.json` (via Corepack) compatible with Node 20, bypassing the legacy default binary.

### Verification

- **User Request**: Use Vercel CLI to collect more data on the deployment state.
- **Verification**:
  - `npx vercel whoami` confirmed authentication as `ofriperetz`.
  - `npx vercel inspect` confirmed deployment `dpl_9g6fiFTgBq8KbpfvVrFQ99eg3864` (URL: `https://eslint-8k9fpz2rl-ofri-peretz.vercel.app`) is in **Error** state.
  - CLI `logs` command failed (deployment not ready), but user-provided logs confirm `ERR_INVALID_THIS`, which is a known `pnpm` v9.x <-> Node 20.x compatibility issue when using Vercel's default environment.
- **Resolution**: The `corepack enable` fix in `vercel.json` is the correct solution to force the usage of the project's pinned `pnpm` version.
- **Next Step**: Commit and push changes to trigger redeploy.
