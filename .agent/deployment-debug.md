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

### Actions Taken (Round 5 - Warnings Fix)

- **User Request**: Fix specific build warnings.
- **2026-01-11**: Updated `apps/docs/next.config.mjs`.
  - **Fix**: Moved `turbo` config from `experimental` to top-level object (Next.js 16 standard).
- **2026-01-11**: Updated `pnpm-lock.yaml` via `pnpm add -wD baseline-browser-mapping@latest`.
  - **Fix**: Resolved "data undefined/old" warning for `baseline-browser-mapping`.
- **2026-01-11**: Removed `runtime = 'edge'` from `apps/docs/src/app/api/plugin-stats/route.ts`.
  - **Fix**: Resolved "Using edge runtime ... disables static generation" warning. Defaulting to Node.js/Serverless runtime is safer for ISR.

### Project Naming (User Request)

### Actions Taken (Round 5)

- **Deployment Monitoring**:
  - Deployment `eslint-q0cgargo9` (Round 4 / Lockfile Fix): Still **Building**.
  - Deployment `eslint-glpsbb2gx` (Round 5 / Warnings Fix): **Queued**. This build contains the fixes for `baseline-browser-mapping` and edge runtime warnings.

### Project Naming (User Request)

- **User Request**: Rename Vercel project to `eslint-interlace-docs`.
- **Constraint**: Renaming a Vercel project is a platform-side action that preserves analytics, environment variables, and domains.
- **Action**:
  - **Option 1 (Recommended)**: Go to Vercel Dashboard -> Project `eslint` -> Settings -> General -> Project Name -> Change to `eslint-interlace-docs`.
  - **Option 2 (CLI)**: I can run `vercel link` to connect this local folder to a _new_ or existing project named `eslint-interlace-docs`. This does NOT rename the old one, it just switches the local pointer.
- **Decision**: Waiting for current build (`eslint-q0cgargo9...`) to finish to confirm stability before advising on rename. The git connection (`ofri-peretz/eslint`) is already correct.
