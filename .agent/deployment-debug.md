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
- **Redeploy Status**:
  - `git push` successful.
  - Vercel detected change. New deployment `eslint-6n5li9qsg-ofri-peretz` is **Error**.
  - **Issue Identified**: Vercel warning "Due to `engines`: { `node`: `20.x` } ... Node.js Version `20.x` will be used instead". User requested upgrade to Node 24 to match project settings.

### Actions Taken (Round 2)

- **2026-01-11**: Updated `package.json` engines to `node: "24.x"`.
- **2026-01-11**: Created `.nvmrc` with `24`.

### Actions Taken (Round 3)

- **2026-01-11**: Added `next` to root `devDependencies` in `package.json`.
  - **Reason**: Vercel failed to detect Next.js framework because it only checks the root `package.json` when the project root is `.`.
- **2026-01-11**: Updated `apps/docs/src/app/layout.tsx` metadata.
  - **Reason**: Enhanced `icons` configuration to support both `.ico` (legacy/fallback) and `.svg` (modern), addressing user requesting for "favico for all sizes".

### Plan

### Actions Taken (Round 4)

- **Error Analysis**: Deployment failed with `ERR_PNPM_OUTDATED_LOCKFILE`.
  - **Cause**: Added `next` dependency in Round 3 but didn't commit the updated `pnpm-lock.yaml`. Vercel's default `pnpm install` includes `--frozen-lockfile`, which fails if the lockfile is out of sync.
- **Fix**: Ran `pnpm install` locally to regenerate `pnpm-lock.yaml`.
- **Next Step**: Commit and push `pnpm-lock.yaml` (Attempt 4).

### Project Naming (User Request)

- **User Request**: Rename Vercel project from `eslint` to `eslint-interlace-tools-docs` to reflect monorepo structure.
- **Plan**: Stabilize the deployment first (get a green build), then address project renaming/aliasing.
