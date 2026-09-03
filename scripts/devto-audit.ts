#!/usr/bin/env tsx
/**
 * Dev.to Article Audit
 *
 * Reads the local articles.json cache and (optionally) fetches live data from
 * the DEV.to API to surface gaps in metadata, tags, performance, and policy.
 *
 * Usage:
 *   npx tsx scripts/devto-audit.ts              # offline (cache only)
 *   DEV_TO_API_KEY=xxx npx tsx scripts/devto-audit.ts  # + live API check
 *   npx tsx scripts/devto-audit.ts --json       # machine-readable output
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CachedArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  canonical_url: string;
  cover_image: string | null;
  published_at: string;
  readable_publish_date: string;
  reading_time_minutes: number;
  page_views_count: number;
  public_reactions_count: number;
  positive_reactions_count: number;
  comments_count: number;
  tag_list: string[];
}

interface LiveArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  canonical_url: string;
  cover_image: string | null;
  published: boolean;
  published_at: string;
  tag_list: string[];
  reading_time_minutes: number;
  page_views_count: number;
  public_reactions_count: number;
  comments_count: number;
  body_markdown?: string;
}

interface AuditFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  detail: string;
  articles?: string[];
  fix?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ARTICLES_JSON = path.resolve(
  __dirname,
  '../apps/docs/src/data/articles.json',
);

const API_BASE = 'https://dev.to/api';
const RATE_LIMIT_MS = 600;

// From devto-attention-triggers.md — combos that unlock discovery
const RECOMMENDED_TAG_COMBOS: Array<{ tags: string[]; use: string }> = [
  { tags: ['security', 'node', 'devsecops'], use: 'protocol / audit articles' },
  { tags: ['ai', 'security', 'javascript'], use: 'AI + security intersection' },
  { tags: ['postgres', 'performance', 'node'], use: 'DB performance' },
  { tags: ['security', 'javascript', 'node'], use: 'general security + JS' },
];

// Tags confirmed to have no active discovery audience
const DEAD_DISCOVERY_TAGS = new Set(['staticanalysis']);

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

function loadCachedArticles(): CachedArticle[] {
  const raw = JSON.parse(fs.readFileSync(ARTICLES_JSON, 'utf-8'));
  return (raw.articles ?? []) as CachedArticle[];
}

async function fetchLivePublished(apiKey: string): Promise<LiveArticle[]> {
  const all: LiveArticle[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${API_BASE}/articles/me/published?page=${page}&per_page=30`,
      { headers: { 'api-key': apiKey, Accept: 'application/vnd.forem.api-v1+json' } },
    );
    if (!res.ok) break;
    const batch = (await res.json()) as LiveArticle[];
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 30) break;
    page++;
    await sleep(RATE_LIMIT_MS);
  }
  return all;
}

async function fetchLiveUnpublished(apiKey: string): Promise<LiveArticle[]> {
  const all: LiveArticle[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${API_BASE}/articles/me/unpublished?page=${page}&per_page=30`,
      { headers: { 'api-key': apiKey, Accept: 'application/vnd.forem.api-v1+json' } },
    );
    if (!res.ok) break;
    const batch = (await res.json()) as LiveArticle[];
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 30) break;
    page++;
    await sleep(RATE_LIMIT_MS);
  }
  return all;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function shortTitle(t: string, max = 60) {
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

function matchesRecommendedCombo(tags: string[]): boolean {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  return RECOMMENDED_TAG_COMBOS.some((c) =>
    c.tags.every((t) => tagSet.has(t)),
  );
}

// ---------------------------------------------------------------------------
// Audit checks
// ---------------------------------------------------------------------------

function auditCacheFields(articles: CachedArticle[]): AuditFinding[] {
  const findings: AuditFinding[] = [];

  // cover_image
  const noCover = articles.filter((a) => !a.cover_image);
  if (noCover.length) {
    findings.push({
      severity: 'high',
      category: 'Metadata',
      title: `${noCover.length} article(s) missing cover_image`,
      detail:
        'Cover images increase click-through rate on the DEV feed and are required for Open Graph cards.',
      articles: noCover.map((a) => shortTitle(a.title)),
      fix: 'Add a cover_image (1000×420px) to each article via the DEV editor.',
    });
  }

  // description
  const noDesc = articles.filter((a) => !a.description?.trim());
  if (noDesc.length) {
    findings.push({
      severity: 'high',
      category: 'Metadata',
      title: `${noDesc.length} article(s) missing description`,
      detail:
        'Description is the subtitle shown on the DEV feed card and in search results.',
      articles: noDesc.map((a) => shortTitle(a.title)),
      fix: 'Add a description in the article front-matter.',
    });
  }

  // readable_publish_date (cache staleness)
  const noReadableDate = articles.filter((a) => !a.readable_publish_date?.trim());
  if (noReadableDate.length) {
    findings.push({
      severity: 'medium',
      category: 'Cache',
      title: `${noReadableDate.length} article(s) have empty readable_publish_date in local cache`,
      detail:
        'readable_publish_date is empty — the cache was last written by an older sync script version that omitted this field. The current update-articles-data.ts includes it; re-running the sync will fix it.',
      articles: noReadableDate.map((a) => shortTitle(a.title)),
      fix:
        'Re-run the articles sync: DEV_TO_API_KEY=xxx npx tsx apps/docs/scripts/update-articles-data.ts. Or trigger docs-data.yml via workflow_dispatch.',
    });
  }

  // canonical_url
  const noCanonical = articles.filter((a) => !a.canonical_url?.trim());
  if (noCanonical.length) {
    findings.push({
      severity: 'critical',
      category: 'SEO',
      title: `${noCanonical.length} article(s) missing canonical_url`,
      detail:
        'Without a canonical_url pointing to the own domain, DEV is treated as the origin. Google may index DEV over your site.',
      articles: noCanonical.map((a) => shortTitle(a.title)),
      fix: 'Set canonical_url to the matching URL on eslint.interlace.tools in each article.',
    });
  }

  // canonical pointing to dev.to (wrong direction)
  const wrongCanonical = articles.filter(
    (a) => a.canonical_url && a.canonical_url.includes('dev.to'),
  );
  if (wrongCanonical.length) {
    findings.push({
      severity: 'critical',
      category: 'SEO',
      title: `${wrongCanonical.length} article(s) canonical_url points to dev.to instead of own domain`,
      detail: 'This signals to Google that dev.to is the canonical source, hurting your own domain SEO.',
      articles: wrongCanonical.map((a) => `${shortTitle(a.title)} → ${a.canonical_url}`),
      fix: 'Update canonical_url to eslint.interlace.tools/articles/<slug>.',
    });
  }

  return findings;
}

function auditTags(articles: CachedArticle[]): AuditFinding[] {
  const findings: AuditFinding[] = [];

  // eslint tag: the local cache strips it intentionally (update-articles-data.ts line 104)
  // because every article implicitly covers eslint and wasting a tag slot on it reduces
  // discoverability for more specific tags. The live DEV articles SHOULD still carry it
  // as one of 4 tags so the eslint tag-page surfaces them. Verify/fix via API only.
  const noEslint = articles.filter(
    (a) => !a.tag_list.some((t) => t.toLowerCase() === 'eslint'),
  );
  if (noEslint.length === articles.length) {
    findings.push({
      severity: 'info',
      category: 'Tags',
      title: `\`eslint\` tag stripped from local cache (intentional) — verify live articles have it`,
      detail:
        'The sync script drops `eslint` from the cache tag_list because it is implicit across all articles and wastes a DEV tag slot. The LIVE DEV articles must still carry `eslint` for tag-page discovery. This cannot be verified without DEV_TO_API_KEY.',
      fix: 'Set DEV_TO_API_KEY and run: npm run devto:audit (live check will confirm). To add missing eslint tags: npm run devto:update-tags --live',
    });
  } else if (noEslint.length > 0) {
    findings.push({
      severity: 'high',
      category: 'Tags',
      title: `${noEslint.length} article(s) missing the \`eslint\` tag in local cache`,
      detail: 'These articles lack eslint even in the local cache — may indicate the sync script lost tags.',
      articles: noEslint.map((a) => shortTitle(a.title)),
      fix: 'Run the articles sync and check update-articles-data.ts.',
    });
  }

  // Dead discovery tags
  const deadTagArticles = articles.filter((a) =>
    a.tag_list.some((t) => DEAD_DISCOVERY_TAGS.has(t.toLowerCase())),
  );
  if (deadTagArticles.length) {
    const byTag: Record<string, string[]> = {};
    for (const a of deadTagArticles) {
      const dead = a.tag_list.filter((t) => DEAD_DISCOVERY_TAGS.has(t.toLowerCase()));
      for (const t of dead) {
        (byTag[t] = byTag[t] ?? []).push(shortTitle(a.title));
      }
    }
    for (const [tag, titles] of Object.entries(byTag)) {
      findings.push({
        severity: 'high',
        category: 'Tags',
        title: `${titles.length} article(s) use #${tag} — a dead-discovery tag`,
        detail: `Articles tagged only with #${tag} historically get 0–11 views. This tag has no active audience on DEV.`,
        articles: titles,
        fix: `Replace #${tag} with a tag from a recommended combo (e.g. #security, #javascript, #node, #devsecops).`,
      });
    }
  }

  // No match to any recommended combo
  const noComboMatch = articles.filter((a) => !matchesRecommendedCombo(a.tag_list));
  if (noComboMatch.length) {
    findings.push({
      severity: 'medium',
      category: 'Tags',
      title: `${noComboMatch.length} article(s) don't match any recommended tag combo`,
      detail:
        'Recommended combos from corpus data: [security+node+devsecops], [ai+security+javascript], [postgres+performance+node], [security+javascript+node]. These are the combos that drive DEV discovery.',
      articles: noComboMatch.map(
        (a) => `[${a.tag_list.join(', ')}] ${shortTitle(a.title, 50)}`,
      ),
      fix: 'Align tags to the nearest recommended combo. See devto-attention-triggers.md.',
    });
  }

  return findings;
}

function auditPerformance(articles: CachedArticle[]): AuditFinding[] {
  const findings: AuditFinding[] = [];

  const zeroViews = articles.filter((a) => a.page_views_count === 0);
  if (zeroViews.length) {
    findings.push({
      severity: 'medium',
      category: 'Performance',
      title: `${zeroViews.length} article(s) have 0 page views`,
      detail: "0 views may mean the article is brand new, or the sync script isn't capturing view counts.",
      articles: zeroViews.map(
        (a) => `${a.published_at.slice(0, 10)} | ${shortTitle(a.title)}`,
      ),
      fix: 'Verify the sync script populates page_views_count from the API. Also check the DEV editor for visibility issues.',
    });
  }

  const lowEngagement = articles.filter(
    (a) => a.page_views_count > 50 && a.public_reactions_count === 0 && a.comments_count === 0,
  );
  if (lowEngagement.length) {
    findings.push({
      severity: 'medium',
      category: 'Performance',
      title: `${lowEngagement.length} article(s) have views but zero engagement`,
      detail:
        "High views + zero reactions/comments signals title-bait: readers click but don't finish or find value. Check if the content fulfills the title promise.",
      articles: lowEngagement.map(
        (a) =>
          `${a.page_views_count}v | ${shortTitle(a.title)}`,
      ),
      fix:
        'Add a closing comment-bait question ("Have you run into this? What did your audit surface?") and verify the opening delivers on the title\'s promise.',
    });
  }

  // Articles with no closing call-to-action signal (proxy: 0 comments AND 0 reactions)
  const noEngagementAtAll = articles.filter(
    (a) => a.public_reactions_count === 0 && a.comments_count === 0,
  );
  findings.push({
    severity: 'info',
    category: 'Performance',
    title: `${noEngagementAtAll.length}/${articles.length} articles have zero reactions AND zero comments`,
    detail:
      'DEV staff scan for reaction-to-view ratio and comment presence before featuring. 30+ articles have no engagement signal at all.',
    fix:
      'Prioritise adding a closing comment-bait sentence to the top 10 articles by views. The 30-min audit pattern (ended with an implicit story-share invite) is the model.',
  });

  return findings;
}

function auditContentSignals(articles: CachedArticle[]): AuditFinding[] {
  const findings: AuditFinding[] = [];

  // Title pattern analysis — find articles with underperforming title patterns
  const gettingStarted = articles.filter((a) =>
    /getting started/i.test(a.title),
  );
  if (gettingStarted.length) {
    findings.push({
      severity: 'medium',
      category: 'Title',
      title: `${gettingStarted.length} article(s) use "Getting Started" pattern`,
      detail:
        '"Getting Started" consistently underperforms on DEV (52–115 views, 0 engagement). This framing signals tutorial/beginner content which the practitioner audience scrolls past.',
      articles: gettingStarted.map((a) => shortTitle(a.title)),
      fix: 'Retitle to a time-box protocol, personal experiment, or exploit-analysis frame.',
    });
  }

  const theXStandard = articles.filter((a) =>
    /the .+ standard$/i.test(a.title),
  );
  if (theXStandard.length) {
    findings.push({
      severity: 'medium',
      category: 'Title',
      title: `${theXStandard.length} article(s) use "The X Standard" title pattern`,
      detail:
        '"The X Standard" signals documentation, not discovery. Per corpus data, these consistently get 0 reactions and 0 comments. No one clicks a standard unless they already know they need it.',
      articles: theXStandard.map((a) => shortTitle(a.title)),
      fix:
        'Rework toward a time-box ("The 30-Minute X Audit"), exploit analysis, or personal experiment frame. See devto-attention-triggers.md title patterns.',
    });
  }

  // Articles using insider framing (buried keyword)
  const insiderFraming = articles.filter(
    (a) =>
      /ground truth|ratchet|fixture|AST|abstract syntax/i.test(a.title),
  );
  if (insiderFraming.length) {
    findings.push({
      severity: 'low',
      category: 'Title',
      title: `${insiderFraming.length} article(s) use insider/jargon framing in title`,
      detail:
        'Titles with "ground truth", "AST", or similar insider language only resonate with readers who already know the domain — they won\'t drive discovery.',
      articles: insiderFraming.map((a) => shortTitle(a.title)),
      fix: 'Lead with the outcome or threat, not the mechanism.',
    });
  }

  // Short reading time articles (≤2 min) — check they have enough depth
  const veryShort = articles.filter((a) => a.reading_time_minutes <= 2);
  if (veryShort.length) {
    findings.push({
      severity: 'low',
      category: 'Content',
      title: `${veryShort.length} article(s) are ≤2 min read`,
      detail:
        'Very short articles can work (provocative claim bait) but they need a strong title and hook. Without reactions/comments they\'re invisible to staff.',
      articles: veryShort.map(
        (a) =>
          `${a.reading_time_minutes}min | ${a.public_reactions_count}r ${a.comments_count}c | ${shortTitle(a.title)}`,
      ),
    });
  }

  return findings;
}

function auditLiveVsCache(
  cached: CachedArticle[],
  live: LiveArticle[],
  unpublished: LiveArticle[],
): AuditFinding[] {
  const findings: AuditFinding[] = [];

  const cachedIds = new Set(cached.map((a) => a.id));
  const liveIds = new Set(live.map((a) => a.id));

  // Published on DEV but missing from site cache
  const missingFromCache = live.filter((a) => !cachedIds.has(a.id));
  if (missingFromCache.length) {
    findings.push({
      severity: 'high',
      category: 'Sync',
      title: `${missingFromCache.length} published article(s) on DEV not in local cache`,
      detail:
        'These articles are live on DEV but absent from apps/docs/src/data/articles.json — they won\'t appear on the site.',
      articles: missingFromCache.map((a) => `[id:${a.id}] ${shortTitle(a.title)}`),
      fix: 'Run the articles sync script to pull the latest published list.',
    });
  }

  // In cache but no longer published on DEV (deleted or unpublished)
  const removedFromDev = cached.filter((a) => !liveIds.has(a.id));
  if (removedFromDev.length) {
    findings.push({
      severity: 'medium',
      category: 'Sync',
      title: `${removedFromDev.length} cached article(s) no longer published on DEV`,
      detail:
        'These appear in the local cache but don\'t exist in the live published list — they may have been unpublished or deleted.',
      articles: removedFromDev.map((a) => `[id:${a.id}] ${shortTitle(a.title)}`),
      fix: 'Confirm intent and either re-publish on DEV or remove from the local cache.',
    });
  }

  // Stale view/reaction counts (diff > 20%)
  const staleStats: string[] = [];
  for (const ca of cached) {
    const la = live.find((a) => a.id === ca.id);
    if (!la) continue;
    const viewDrift = Math.abs(la.page_views_count - ca.page_views_count);
    const reactDrift = Math.abs(la.public_reactions_count - ca.public_reactions_count);
    if (viewDrift > 20 || reactDrift > 2) {
      staleStats.push(
        `${shortTitle(ca.title, 50)} | cached: ${ca.page_views_count}v ${ca.public_reactions_count}r → live: ${la.page_views_count}v ${la.public_reactions_count}r`,
      );
    }
  }
  if (staleStats.length) {
    findings.push({
      severity: 'low',
      category: 'Sync',
      title: `${staleStats.length} article(s) have stale view/reaction counts in local cache`,
      detail: 'The local cache is out of sync with live DEV stats.',
      articles: staleStats,
      fix: 'Run the articles sync script to refresh stats.',
    });
  }

  // Unpublished drafts
  if (unpublished.length) {
    findings.push({
      severity: 'info',
      category: 'State',
      title: `${unpublished.length} unpublished draft(s) on DEV`,
      detail: 'These exist as DEV drafts but are not published.',
      articles: unpublished.map(
        (a) => `[id:${a.id}] ${shortTitle(a.title)} | tags: [${(Array.isArray(a.tag_list) ? a.tag_list : String(a.tag_list).split(',')).join(', ')}]`,
      ),
      fix: 'Review and decide: publish, delete, or keep as work-in-progress.',
    });
  }

  // Live articles missing required fields
  const liveMissingCover = live.filter((a) => !a.cover_image);
  if (liveMissingCover.length) {
    findings.push({
      severity: 'high',
      category: 'Metadata (live)',
      title: `${liveMissingCover.length} published DEV article(s) missing cover_image (live check)`,
      detail: 'Confirmed via API: these are live without a cover image.',
      articles: liveMissingCover.map((a) => shortTitle(a.title)),
      fix: 'Upload a 1000×420 cover image in the DEV editor.',
    });
  }

  const liveMissingDesc = live.filter((a) => !a.description?.trim());
  if (liveMissingDesc.length) {
    findings.push({
      severity: 'high',
      category: 'Metadata (live)',
      title: `${liveMissingDesc.length} published DEV article(s) missing description (live check)`,
      detail: 'Confirmed via API: these are live without a description.',
      articles: liveMissingDesc.map((a) => shortTitle(a.title)),
      fix: 'Add a description in the DEV editor.',
    });
  }

  const liveMissingCanonical = live.filter((a) => !a.canonical_url?.trim());
  if (liveMissingCanonical.length) {
    findings.push({
      severity: 'critical',
      category: 'SEO (live)',
      title: `${liveMissingCanonical.length} published DEV article(s) missing canonical_url (live check)`,
      detail: 'Confirmed via API: no canonical_url set. Google will index DEV as the origin.',
      articles: liveMissingCanonical.map((a) => shortTitle(a.title)),
      fix: 'Set canonical_url to eslint.interlace.tools/articles/<slug> in the DEV editor.',
    });
  }

  const liveNoEslintTag = live.filter(
    (a) => {
      const tags = Array.isArray(a.tag_list)
        ? a.tag_list
        : String(a.tag_list).split(',').map((t) => t.trim());
      return !tags.some((t) => t.toLowerCase() === 'eslint');
    }
  );
  if (liveNoEslintTag.length) {
    findings.push({
      severity: 'critical',
      category: 'Tags (live)',
      title: `${liveNoEslintTag.length}/${live.length} published DEV article(s) missing \`eslint\` tag (live check)`,
      detail: 'Confirmed via API: the eslint tag is absent from all/most articles.',
      articles: liveNoEslintTag.map(
        (a) => {
          const tags = Array.isArray(a.tag_list)
            ? a.tag_list
            : String(a.tag_list).split(',').map((t) => t.trim());
          return `[${tags.join(', ')}] ${shortTitle(a.title, 50)}`;
        }
      ),
      fix: 'Run `npm run devto:update-tags --live` to add the eslint tag programmatically.',
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Report rendering
// ---------------------------------------------------------------------------

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const SEVERITY_ICON: Record<string, string> = {
  critical: '🔴',
  high:     '🟠',
  medium:   '🟡',
  low:      '🔵',
  info:     '⚪',
};

function renderReport(findings: AuditFinding[], jsonMode: boolean) {
  if (jsonMode) {
    console.log(JSON.stringify(findings, null, 2));
    return;
  }

  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) counts[f.severity]++;

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║         DEV.to Article Audit — ' + new Date().toISOString().slice(0, 10) + '              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('Summary:');
  for (const [sev, count] of Object.entries(counts)) {
    if (count > 0) {
      console.log(`  ${SEVERITY_ICON[sev]} ${sev.padEnd(8)}: ${count}`);
    }
  }
  console.log();

  let lastCategory = '';
  for (const f of sorted) {
    if (f.category !== lastCategory) {
      console.log(`\n── ${f.category} `+ '─'.repeat(Math.max(0, 58 - f.category.length)));
      lastCategory = f.category;
    }
    console.log(`\n${SEVERITY_ICON[f.severity]} [${f.severity.toUpperCase()}] ${f.title}`);
    console.log(`  ${f.detail}`);
    if (f.articles && f.articles.length <= 8) {
      for (const a of f.articles) {
        console.log(`    • ${a}`);
      }
    } else if (f.articles && f.articles.length > 8) {
      for (const a of f.articles.slice(0, 5)) {
        console.log(`    • ${a}`);
      }
      console.log(`    … and ${f.articles.length - 5} more`);
    }
    if (f.fix) {
      console.log(`  → Fix: ${f.fix}`);
    }
  }

  console.log('\n' + '═'.repeat(64));
  console.log(`Total findings: ${findings.length}  (${counts.critical}C / ${counts.high}H / ${counts.medium}M / ${counts.low}L / ${counts.info}I)`);

  if (counts.critical > 0) {
    console.log('\n⚠️  Critical issues require immediate action before next publish.');
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const jsonMode = process.argv.includes('--json');
  const apiKey = process.env['DEV_TO_API_KEY'] ?? process.env['DEVTO_API_KEY'];

  if (!jsonMode) {
    console.log('\nLoading local cache…');
  }

  const cached = loadCachedArticles();

  const findings: AuditFinding[] = [
    ...auditCacheFields(cached),
    ...auditTags(cached),
    ...auditPerformance(cached),
    ...auditContentSignals(cached),
  ];

  if (apiKey) {
    if (!jsonMode) {
      console.log('API key found — fetching live data from DEV.to…');
    }
    const [live, unpublished] = await Promise.all([
      fetchLivePublished(apiKey),
      fetchLiveUnpublished(apiKey),
    ]);
    if (!jsonMode) {
      console.log(`  Published: ${live.length}  Unpublished drafts: ${unpublished.length}`);
    }
    findings.push(...auditLiveVsCache(cached, live, unpublished));
  } else if (!jsonMode) {
    console.log('No DEV_TO_API_KEY set — skipping live API checks.\n');
  }

  renderReport(findings, jsonMode);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
