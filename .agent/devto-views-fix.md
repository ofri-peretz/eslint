# Dev.to Article Views - Missing Environment Variable

## Issue

Article views are showing "0" on the deployed site (eslint.interlace.tools) because the Dev.to API is not returning `page_views_count`.

## Root Cause

The `DEVTO_API_KEY` environment variable is **not configured in Vercel**.

Without this API key, the application falls back to the public Dev.to API which does NOT include view counts.

## Solution

### Local Development Setup

The API key is already configured locally in `apps/docs/.env` (gitignored).

If you need to set it up on a new machine:

1. Copy the example file: `cp apps/docs/.env.local.example apps/docs/.env.local`
2. Edit `.env.local` and add: `DEVTO_API_KEY=BT3YziaQc87hJZgDaUarhieE`

**Note**: `.env.local` is gitignored; never commit secrets to the repository.

### Add Environment Variable to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/ofri-peretzs-projects/eslint-docs
2. **Navigate to**: Settings → Environment Variables
3. **Add New Variable**:
   - **Key**: `DEVTO_API_KEY`
   - **Value**: `BT3YziaQc87hJZgDaUarhieE`
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development

4. **Trigger Redeploy**:
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Select "Redeploy"

## Technical Details

### API Endpoint Behavior

```typescript
// With API key (authenticated)
const endpoint = 'https://dev.to/api/articles/me/published?per_page=100';
// Returns: { page_views_count: 123, ... }

// Without API key (public)
const endpoint =
  'https://dev.to/api/articles?username=ofri-peretz&per_page=100';
// Returns: { page_views_count: undefined, ... }
```

### Code Location

`apps/docs/src/app/api/devto-articles/route.ts` (lines 199-213)

### Fallback Behavior

The code is working correctly - it gracefully falls back to the public API when no key is present. However, this means **view counts will always be 0** without the API key.

## Verification

After adding the environment variable and redeploying:

1. Visit: https://eslint.interlace.tools
2. Check the "Views" column - should show actual view counts
3. You can also test the API directly:
   ```bash
   curl -s "https://eslint.interlace.tools/api/devto-articles?limit=3" | jq '.articles[].page_views_count'
   ```

## Security Note

The Dev.to API key is a **personal access token** that provides read-only access to your published articles and their analytics. It's safe to use in server-side API routes (not exposed to the client).

## Alternative: GitHub Actions Secret

If you want to use this in CI/CD (e.g., for pre-rendering), also add it to:

- Repository Settings → Secrets and variables → Actions
- Name: `DEVTO_API_KEY`
- Value: `LwbBy5SGdjTGY5WEPwk8m5Vs`
