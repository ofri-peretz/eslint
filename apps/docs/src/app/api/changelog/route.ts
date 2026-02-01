/**
 * GitHub Changelog API Route
 * 
 * Fetches CHANGELOG.md files from GitHub with caching.
 * Uses json-cache policy for 2-hour TTL on changelog data.
 */

import { NextResponse } from 'next/server';
import { fetchCachedJSON } from '@/lib/json-cache';

// GitHub configuration
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'ofri-peretz';
const GITHUB_REPO = process.env.GITHUB_REPO || 'eslint';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

// Cache TTL: 2 hours (matches changelog*.json pattern in json-cache.ts)
const CHANGELOG_TTL = 7200;

// Plugin paths in the monorepo
const PLUGIN_PATHS: Record<string, string> = {
  'eslint-config-interlace': 'packages/eslint-config-interlace',
  'browser-security': 'packages/eslint-plugin-browser-security',
  'crypto': 'packages/eslint-plugin-crypto',
  'jwt': 'packages/eslint-plugin-jwt',
  'secure-coding': 'packages/eslint-plugin-secure-coding',
  'secrets': 'packages/eslint-plugin-secrets',
  'node-security': 'packages/eslint-plugin-node-security',
  'pg': 'packages/eslint-plugin-pg',
  'mongodb-security': 'packages/eslint-plugin-mongodb-security',
  'vercel-ai-security': 'packages/eslint-plugin-vercel-ai-security',
  'react-best-practices': 'packages/eslint-plugin-react-best-practices',
  'react-hooks-best-practices': 'packages/eslint-plugin-react-hooks-best-practices',
  'documentation': 'packages/eslint-plugin-documentation',
  'import-next': 'packages/eslint-plugin-import-next',
};

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'feature' | 'fix' | 'breaking' | 'security' | 'perf';
  content: string;
}

interface PluginChangelog {
  plugin: string;
  path: string;
  raw: string;
  entries: ChangelogEntry[];
  fetchedAt: string;
}

/**
 * Parse a CHANGELOG.md into structured entries
 */
function parseChangelog(raw: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  
  // Match version headers like: ## [1.2.3] - 2026-01-15 or ## 1.2.3 (2026-01-15)
  const versionRegex = /^##\s*\[?(\d+\.\d+\.\d+)\]?\s*[-–(]?\s*(\d{4}-\d{2}-\d{2})?/gm;
  const sections = raw.split(versionRegex);
  
  for (let i = 1; i < sections.length; i += 3) {
    const version = sections[i];
    const date = sections[i + 1] || 'Unknown';
    const content = sections[i + 2]?.trim() || '';
    
    // Determine type from content
    let type: ChangelogEntry['type'] = 'feature';
    if (content.toLowerCase().includes('breaking')) type = 'breaking';
    else if (content.toLowerCase().includes('security') || content.toLowerCase().includes('vulnerability')) type = 'security';
    else if (content.toLowerCase().includes('fix') || content.toLowerCase().includes('bug')) type = 'fix';
    else if (content.toLowerCase().includes('perf') || content.toLowerCase().includes('faster')) type = 'perf';
    
    entries.push({ version, date, type, content });
  }
  
  return entries.slice(0, 10); // Return last 10 versions
}

/**
 * Fetch a single plugin's changelog from GitHub
 */
async function fetchPluginChangelog(plugin: string): Promise<PluginChangelog | null> {
  const path = PLUGIN_PATHS[plugin];
  if (!path) return null;
  
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}/CHANGELOG.md`;
  
  try {
    const response = await fetch(url, {
      next: { revalidate: CHANGELOG_TTL },
      headers: { 'Accept': 'text/plain' },
    });
    
    if (!response.ok) {
      console.warn(`[Changelog] No CHANGELOG.md for ${plugin}: ${response.status}`);
      return null;
    }
    
    const raw = await response.text();
    const entries = parseChangelog(raw);
    
    return {
      plugin,
      path: `${path}/CHANGELOG.md`,
      raw,
      entries,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[Changelog] Failed to fetch ${plugin}:`, error);
    return null;
  }
}

/**
 * GET /api/changelog
 * 
 * Query params:
 * - plugin: Specific plugin name (optional, returns all if not specified)
 * - raw: If "true", returns raw markdown (default: parsed entries)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pluginFilter = searchParams.get('plugin');
  const includeRaw = searchParams.get('raw') === 'true';
  
  try {
    if (pluginFilter) {
      // Fetch single plugin
      const changelog = await fetchPluginChangelog(pluginFilter);
      
      if (!changelog) {
        return NextResponse.json(
          { success: false, error: `Changelog not found for plugin: ${pluginFilter}` },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: includeRaw ? changelog : { ...changelog, raw: undefined },
        meta: {
          source: 'github',
          ttl: CHANGELOG_TTL,
          fetchedAt: changelog.fetchedAt,
        },
      });
    }
    
    // Fetch all plugins
    const plugins = Object.keys(PLUGIN_PATHS);
    const results = await Promise.all(
      plugins.map(plugin => fetchPluginChangelog(plugin))
    );
    
    const changelogs = results.filter(Boolean) as PluginChangelog[];
    
    return NextResponse.json({
      success: true,
      data: changelogs.map(c => includeRaw ? c : { ...c, raw: undefined }),
      meta: {
        source: 'github',
        ttl: CHANGELOG_TTL,
        fetchedAt: new Date().toISOString(),
        pluginCount: changelogs.length,
      },
    });
  } catch (error) {
    console.error('[Changelog API Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch changelog data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
