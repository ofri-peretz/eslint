# Data Sync Architecture

> Comprehensive guide for AI agents and developers on the JSON data collection workflows.

## Overview

The ESLint Interlace docs site uses **automated GitHub Actions workflows** to collect statistics from the monorepo and external sources, store them as JSON files, and serve them via Next.js ISR (Incremental Static Regeneration).

## Trustworthiness Assessment

### ✅ Verified Components

| Component               | Test Status   | Coverage       | Notes                                            |
| ----------------------- | ------------- | -------------- | ------------------------------------------------ |
| `stats-loader.ts`       | ✅ **Tested** | 18 unit tests  | All loader functions, fallbacks, error handling  |
| `sync-plugin-stats.mjs` | ✅ **Tested** | 8 unit tests   | Category classification, rule counting, metadata |
| `sync-readme-rules.mjs` | ✅ **Tested** | 6 unit tests   | README parsing, table generation                 |
| `sync-rules-docs.mjs`   | ✅ **Tested** | Basic coverage | File sync operations                             |
| Fallback defaults       | ✅ **Tested** | Unit tests     | Graceful degradation when data missing           |

### ⚠️ Known Limitations

| Area                    | Risk                     | Mitigation                                    |
| ----------------------- | ------------------------ | --------------------------------------------- |
| GH Actions scheduling   | May fail silently        | Manual `workflow_dispatch` fallback available |
| Codecov API             | Requires `CODECOV_TOKEN` | Falls back to local `lcov.info` parsing       |
| Vercel deploy hook      | Optional feature         | Site still works, just won't auto-rebuild     |
| Category classification | Heuristic-based          | Based on plugin name patterns, not metadata   |

### 🔒 Security Considerations

- All workflows run in isolated GitHub Actions runners
- No credentials are exposed in JSON output
- Secrets (`CODECOV_TOKEN`, `VERCEL_DEPLOY_HOOK`) are stored in GitHub Secrets
- Automated commits are signed by `github-actions[bot]`

---

## Workflow Inventory

### 1. `sync-docs-data.yml` - Primary Sync

**Purpose**: Synchronizes plugin stats and README rule tables.

| Property         | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| **Triggers**     | Push to `main` (packages/\*\*), Weekly (Sun 00:00 UTC), Manual |
| **Scripts**      | `sync-plugin-stats.mjs`, `sync-readme-rules.mjs`               |
| **Output**       | `apps/docs/src/data/*.json`                                    |
| **Auto-rebuild** | Yes (triggers Vercel deploy hook)                              |

### 2. `update-docs-stats.yml` - Plugin Statistics

**Purpose**: Generates detailed plugin statistics by scanning the monorepo.

| Property         | Value                                  |
| ---------------- | -------------------------------------- |
| **Trigger**      | Daily at 6 AM UTC, Manual              |
| **Output**       | `apps/docs/src/data/plugin-stats.json` |
| **Data Sources** | `packages/eslint-plugin-*` directories |

### 3. `update-coverage-stats.yml` - Coverage Statistics

**Purpose**: Fetches test coverage data from Codecov or local lcov files.

| Property         | Value                                                             |
| ---------------- | ----------------------------------------------------------------- |
| **Trigger**      | Daily at 7 AM UTC (after codecov), Manual                         |
| **Output**       | `apps/docs/src/data/coverage-stats.json`                          |
| **Data Sources** | Codecov API (primary), `packages/*/coverage/lcov.info` (fallback) |

---

## JSON Schema Definitions

### `plugin-stats.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PluginStatsData",
  "description": "Statistics for all ESLint plugins in the Interlace ecosystem",
  "type": "object",
  "required": [
    "plugins",
    "totalRules",
    "totalPlugins",
    "allPluginsCount",
    "generatedAt"
  ],
  "properties": {
    "plugins": {
      "type": "array",
      "description": "List of all plugins with their metadata",
      "items": {
        "type": "object",
        "required": [
          "name",
          "rules",
          "description",
          "category",
          "version",
          "published"
        ],
        "properties": {
          "name": {
            "type": "string",
            "pattern": "^eslint-plugin-",
            "description": "Full npm package name"
          },
          "rules": {
            "type": "integer",
            "minimum": 0,
            "description": "Number of rules in the plugin"
          },
          "description": {
            "type": "string",
            "description": "Plugin description from package.json"
          },
          "category": {
            "type": "string",
            "enum": [
              "security",
              "quality",
              "framework",
              "architecture",
              "react"
            ],
            "description": "Plugin category for grouping"
          },
          "version": {
            "type": "string",
            "pattern": "^\\d+\\.\\d+\\.\\d+",
            "description": "Current version (semver)"
          },
          "published": {
            "type": "boolean",
            "description": "Whether the plugin is published to npm"
          }
        }
      }
    },
    "totalRules": {
      "type": "integer",
      "minimum": 0,
      "description": "Sum of all rules across all plugins"
    },
    "totalPlugins": {
      "type": "integer",
      "minimum": 0,
      "description": "Count of published plugins only"
    },
    "allPluginsCount": {
      "type": "integer",
      "minimum": 0,
      "description": "Count of all plugins (including unpublished)"
    },
    "generatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of generation"
    }
  }
}
```

### Example `plugin-stats.json`

```json
{
  "plugins": [
    {
      "name": "eslint-plugin-browser-security",
      "rules": 52,
      "description": "Security-focused ESLint plugin for browser applications",
      "category": "security",
      "version": "1.1.1",
      "published": true
    }
  ],
  "totalRules": 332,
  "totalPlugins": 18,
  "allPluginsCount": 20,
  "generatedAt": "2026-02-02T02:32:51.737Z"
}
```

---

### `coverage-stats.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CoverageStatsData",
  "description": "Test coverage statistics for the ESLint ecosystem",
  "type": "object",
  "required": ["summary", "plugins", "standards", "meta"],
  "properties": {
    "summary": {
      "type": "object",
      "required": [
        "totalCoverage",
        "totalFiles",
        "totalLines",
        "coveredLines",
        "uncoveredLines"
      ],
      "properties": {
        "totalCoverage": {
          "type": "number",
          "minimum": 0,
          "maximum": 100,
          "description": "Overall coverage percentage"
        },
        "totalFiles": {
          "type": "integer",
          "minimum": 0,
          "description": "Number of files with coverage data"
        },
        "totalLines": {
          "type": "integer",
          "minimum": 0,
          "description": "Total lines of code tracked"
        },
        "coveredLines": {
          "type": "integer",
          "minimum": 0,
          "description": "Lines with test coverage"
        },
        "uncoveredLines": {
          "type": "integer",
          "minimum": 0,
          "description": "Lines without test coverage"
        }
      }
    },
    "plugins": {
      "type": "object",
      "properties": {
        "security": {
          "type": "array",
          "items": { "$ref": "#/definitions/CoveragePluginStat" }
        },
        "quality": {
          "type": "array",
          "items": { "$ref": "#/definitions/CoveragePluginStat" }
        }
      }
    },
    "standards": {
      "type": "object",
      "description": "Coverage thresholds by category",
      "properties": {
        "coreSecurity": {
          "type": "integer",
          "description": "Target % for security plugins"
        },
        "frameworkPlugins": {
          "type": "integer",
          "description": "Target % for framework plugins"
        },
        "qualityPlugins": {
          "type": "integer",
          "description": "Target % for quality plugins"
        }
      }
    },
    "meta": {
      "type": "object",
      "properties": {
        "generatedAt": { "type": "string", "format": "date-time" },
        "source": {
          "type": "string",
          "enum": ["local-lcov", "codecov-api", "estimated"],
          "description": "Data source used for this run"
        },
        "ttl": {
          "type": "integer",
          "description": "Suggested cache TTL in seconds"
        }
      }
    }
  },
  "definitions": {
    "CoveragePluginStat": {
      "type": "object",
      "required": ["name", "slug", "coverage", "status", "category"],
      "properties": {
        "name": { "type": "string" },
        "slug": {
          "type": "string",
          "description": "Short name without eslint-plugin- prefix"
        },
        "coverage": { "type": "number", "minimum": 0, "maximum": 100 },
        "status": { "type": "string", "enum": ["production", "beta", "alpha"] },
        "category": { "type": "string", "enum": ["security", "quality"] }
      }
    }
  }
}
```

---

### `articles.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ArticlesData",
  "description": "External articles from Dev.to",
  "type": "object",
  "required": ["articles", "fetchedAt"],
  "properties": {
    "articles": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "title", "url", "published_at"],
        "properties": {
          "id": { "type": "integer" },
          "title": { "type": "string" },
          "description": { "type": "string" },
          "url": { "type": "string", "format": "uri" },
          "cover_image": { "type": ["string", "null"], "format": "uri" },
          "social_image": { "type": ["string", "null"], "format": "uri" },
          "published_at": { "type": "string", "format": "date-time" },
          "tag_list": { "type": "array", "items": { "type": "string" } },
          "reading_time_minutes": { "type": "integer" },
          "positive_reactions_count": { "type": "integer" },
          "comments_count": { "type": "integer" }
        }
      }
    },
    "fetchedAt": { "type": "string", "format": "date-time" }
  }
}
```

---

## Integration Points

### Stats Loader API (`src/lib/stats-loader.ts`)

```typescript
// Available exports
import {
  loadPluginStats, // Load plugin-stats.json with 1hr ISR cache
  loadCoverageStats, // Load coverage-stats.json with 4hr ISR cache
  getEcosystemStats, // Aggregated stats for homepage
  getDisplayStats, // Simplified stats for UI cards
  getPublishedPluginNames, // Categorized plugin name lists
} from '@/lib/stats-loader';

// Return types
interface PluginStat {
  name: string;
  rules: number;
  description: string;
  category: 'security' | 'quality' | 'framework' | 'architecture' | 'react';
  version: string;
  published: boolean;
}

interface EcosystemStats {
  plugins: {
    total: number;
    published: number;
    security: number;
    quality: number;
    framework: number;
  };
  rules: { total: number; security: number; quality: number };
  coverage: {
    average: number;
    securityAverage: number;
    qualityAverage: number;
  };
  lastUpdated: string;
}
```

### Homepage Usage Example

```tsx
// src/app/(home)/page.tsx
import { getDisplayStats } from '@/lib/stats-loader';

export default async function HomePage() {
  const stats = await getDisplayStats();

  return (
    <HeroSection
      plugins={stats.plugins}
      rules={stats.rules}
      coverage={stats.coverage}
    />
  );
}
```

---

## Manual Workflow Execution

If scheduled jobs fail or you need immediate updates:

```bash
# Trigger via GitHub CLI
gh workflow run sync-docs-data.yml
gh workflow run update-docs-stats.yml
gh workflow run update-coverage-stats.yml

# With force option
gh workflow run update-docs-stats.yml -f force_update=true
```

---

## Fallback Behavior

When JSON files are missing or corrupted, the loaders return sensible defaults:

| Loader                      | Fallback Values                     |
| --------------------------- | ----------------------------------- |
| `getEcosystemStats()`       | 18 plugins, 330 rules, 85% coverage |
| `getPublishedPluginNames()` | Hardcoded list of known plugins     |
| `loadPluginStats()`         | Returns `null` (caller handles)     |
| `loadCoverageStats()`       | Returns `null` (caller handles)     |

This ensures the site remains functional even if GitHub Actions fail to update data.

---

## Monitoring & Debugging

### Check Last Update Time

```bash
# View generated timestamp in plugin-stats.json
cat apps/docs/src/data/plugin-stats.json | jq '.generatedAt'
```

### Verify Workflow Status

```bash
gh run list --workflow=sync-docs-data.yml --limit=5
gh run list --workflow=update-docs-stats.yml --limit=5
gh run list --workflow=update-coverage-stats.yml --limit=5
```

### Run Tests

```bash
# Test the stats-loader
npx vitest run apps/docs/src/__tests__/stats-loader.test.ts

# Test sync scripts
npx vitest run apps/docs/scripts/sync-plugin-stats.test.ts
npx vitest run apps/docs/scripts/sync-readme-rules.test.ts
```

---

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        GitHub Actions (Scheduled)                          │
├───────────────────────────────────────────────────────────────────────────┤
│  update-docs-stats.yml ──→ plugin-stats.json    (daily 6 AM UTC)          │
│  update-coverage-stats.yml ──→ coverage-stats.json (daily 7 AM UTC)       │
│  sync-docs-data.yml ──→ multiple JSON files     (weekly + on push)        │
└────────────────────────────────────┬──────────────────────────────────────┘
                                     │ git push (automated commits)
                                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     apps/docs/src/data/*.json                              │
│   • plugin-stats.json  (20 plugins, 332 rules, categories)                │
│   • coverage-stats.json (coverage by plugin, ecosystem summary)           │
│   • articles.json (Dev.to articles)                                       │
└────────────────────────────────────┬──────────────────────────────────────┘
                                     │ imported at build/runtime
                                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      stats-loader.ts (Next.js ISR)                         │
│   • loadPluginStats() ──→ 1hr cache via unstable_cache                    │
│   • loadCoverageStats() ──→ 4hr cache                                     │
│   • getEcosystemStats() ──→ aggregates both for UI                        │
│   • getDisplayStats() ──→ simplified format for hero cards                │
└────────────────────────────────────┬──────────────────────────────────────┘
                                     │ consumed by components
                                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        UI Components                                       │
│   • hero-section.tsx (plugin counts, rule counts per pillar)              │
│   • Homepage cards (live stats)                                           │
│   • Plugin overview pages                                                 │
└───────────────────────────────────────────────────────────────────────────┘
```
