# JSON Caching Architecture

## Overview

This document describes the caching architecture for JSON data files in the ESLint Interlace documentation site. The system supports:

1. **Pattern-based TTL** - Different cache durations for different file types
2. **GitHub Actions integration** - Scheduled jobs update JSON without redeploying
3. **ISR compatibility** - Next.js Incremental Static Regeneration integration
4. **Zero-redeploy updates** - Content updates automatically based on TTL

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GitHub Actions (Cron)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  npm-stats.yml    │  coverage.yml    │  cwe-sync.yml    │  articles.yml     │
│  (every hour)     │  (every 4 hours) │  (daily)          │  (every hour)     │
└────────┬──────────┴────────┬─────────┴─────────┬─────────┴─────────┬────────┘
         │                   │                    │                   │
         ▼                   ▼                    ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          JSON Data Files                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  plugin-stats.json │  coverage.json  │  cwe-data.json  │  articles.json     │
│  (repo or CDN)     │  (repo)         │  (repo)         │  (GitHub Pages)    │
└────────┬──────────┴────────┬─────────┴─────────┬─────────┴─────────┬────────┘
         │                   │                    │                   │
         └───────────────────┴────────────────────┴───────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          JSON Cache Layer (json-cache.ts)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │  Pattern Matcher │  │  Memory Cache    │  │  TTL Manager     │           │
│  │  (glob → regex)  │  │  (Map<K,V>)      │  │  (per-pattern)   │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      Next.js ISR Integration                          │   │
│  │  fetch(url, { next: { revalidate: ttl } })                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Documentation Pages                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components request data → Cache returns fresh/cached → UI renders          │
│                                                                              │
│  Example:                                                                    │
│  const { data } = await loadPluginStats();                                   │
│  // Returns cached data if < 1 hour old, else fetches fresh                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## TTL Configuration

### Default Patterns

| Pattern                 | TTL        | Description                   |
| ----------------------- | ---------- | ----------------------------- |
| `**/plugin-stats*.json` | 1 hour     | NPM downloads, GitHub stars   |
| `**/rule-*.json`        | 6 hours    | Rule documentation metadata   |
| `**/cwe-*.json`         | 24 hours   | CWE reference data (static)   |
| `**/owasp-*.json`       | 24 hours   | OWASP reference data (static) |
| `**/coverage*.json`     | 4 hours    | Test coverage reports         |
| `**/analytics*.json`    | 15 minutes | Usage analytics               |
| `**/changelog*.json`    | 2 hours    | Aggregated changelogs         |
| `**/articles*.json`     | 1 hour     | External articles (Dev.to)    |
| Default                 | 1 hour     | All other JSON files          |

### Custom Configuration

```typescript
import { fetchCachedJSON, type CacheConfig } from '@/lib/json-cache';

// Custom config for a specific use case
const myConfig: CacheConfig = {
  defaultTTL: 1800, // 30 minutes
  patterns: [
    {
      pattern: '**/realtime-*.json',
      ttl: 60, // 1 minute
      description: 'Near real-time data',
    },
  ],
};

// Use custom config
const { data } = await fetchCachedJSON<MyType>(url, { config: myConfig });
```

## Usage Examples

### 1. Load Local JSON File

```typescript
import { fetchLocalJSON } from '@/lib/json-cache';

// Automatically uses TTL based on filename pattern
const { data, fetchedAt, expiresAt } = await fetchLocalJSON<PluginStats>(
  'src/data/plugin-stats.json',
);
```

### 2. Fetch Remote JSON (GitHub)

```typescript
import { fetchGitHubJSON } from '@/lib/json-cache';

// Fetch from GitHub raw content
const { data } = await fetchGitHubJSON<CWEData>(
  'ofri-peretz',
  'eslint',
  'main',
  'data/cwe-mappings.json',
  { ttl: 86400 }, // Optional TTL override
);
```

### 3. Create Custom Cached Loader

```typescript
import { createCachedLoader } from '@/lib/json-cache';

// Create a reusable loader with Next.js ISR integration
export const loadRuleMetadata = createCachedLoader(
  async () => {
    const res = await fetch('https://api.example.com/rules');
    return res.json();
  },
  {
    key: 'rule-metadata',
    tags: ['rules', 'metadata'], // For on-demand revalidation
    ttl: 21600, // 6 hours
  },
);

// Usage in component
const rules = await loadRuleMetadata();
```

### 4. Force Refresh Cache

```typescript
import { fetchCachedJSON } from '@/lib/json-cache';

// Bypass cache and fetch fresh data
const { data } = await fetchCachedJSON<Stats>(url, {
  forceRefresh: true,
});
```

### 5. Invalidate Cache

```typescript
import { invalidateCache, invalidateCacheByPattern } from '@/lib/json-cache';

// Invalidate specific entry
invalidateCache('local:src/data/plugin-stats.json');

// Invalidate all stats-related caches
invalidateCacheByPattern('**/stats*.json');
```

## GitHub Actions Integration

### Example Workflow: Update Plugin Stats

```yaml
# .github/workflows/update-stats.yml
name: Update Plugin Stats

on:
  schedule:
    - cron: '0 * * * *' # Every hour
  workflow_dispatch: # Manual trigger

jobs:
  update-stats:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Fetch NPM Stats
        run: |
          node scripts/fetch-npm-stats.js > apps/docs/src/data/plugin-stats.json

      - name: Commit changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add apps/docs/src/data/plugin-stats.json
          git diff --staged --quiet || git commit -m "chore(docs): update plugin stats [skip ci]"
          git push
```

### On-Demand Revalidation (Optional)

For immediate cache invalidation without waiting for TTL:

```typescript
// pages/api/revalidate.ts
import { revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { tag, secret } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  revalidateTag(tag);
  return Response.json({ revalidated: true, tag });
}
```

## Best Practices

1. **Choose appropriate TTLs** - Balance freshness vs. performance
2. **Use tags for related data** - Enable bulk revalidation
3. **Monitor cache hit rates** - Use `getCacheStats()` for debugging
4. **Avoid over-caching** - Real-time data should have short TTLs
5. **Prefer ISR over client-side** - Better SEO and performance

## Cache Hierarchy

1. **Memory Cache** (in-process) - Fastest, volatile
2. **Next.js Data Cache** (ISR) - Persistent across requests
3. **CDN Cache** (Vercel) - Edge-level caching
4. **Browser Cache** - Client-side HTTP caching

The JSON cache layer automatically integrates with Next.js ISR via the `fetch` options, providing a seamless caching experience across the entire stack.
