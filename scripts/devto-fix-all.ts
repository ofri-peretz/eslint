#!/usr/bin/env tsx
/**
 * Precision DEV.to fix script — targets specific articles only.
 *
 * Modes (--tags | --titles | --ctas | --all):
 *   --tags   Fix 4 articles with wrong/dead tags
 *   --titles Rewrite 12 underperforming titles (X Standard + jargon frames)
 *   --ctas   Append closing comment-bait question to 11 high-view / 0-engagement articles
 *   --all    Run all three in sequence
 *   --dry    Print plan, don't call API
 *
 * Usage:
 *   DEV_TO_API_KEY=xxx npx tsx scripts/devto-fix-all.ts --all --dry
 *   DEV_TO_API_KEY=xxx npx tsx scripts/devto-fix-all.ts --tags
 *   DEV_TO_API_KEY=xxx npx tsx scripts/devto-fix-all.ts --titles
 *   DEV_TO_API_KEY=xxx npx tsx scripts/devto-fix-all.ts --ctas
 */

const API_BASE = 'https://dev.to/api';
const RATE_MS = 800;

const apiKey = process.env['DEV_TO_API_KEY'] ?? process.env['DEVTO_API_KEY'];
if (!apiKey) {
  console.error('DEV_TO_API_KEY is required');
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry');
const ALL = args.has('--all');
const DO_TAGS = ALL || args.has('--tags');
const DO_TITLES = ALL || args.has('--titles');
const DO_CTAS = ALL || args.has('--ctas');

if (!DO_TAGS && !DO_TITLES && !DO_CTAS) {
  console.error('Pass at least one of: --tags --titles --ctas --all');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// TAG FIXES
// Exact new tag sets for the 4 articles that have wrong or dead tags.
// Every other article is left untouched.
// ---------------------------------------------------------------------------

const TAG_FIXES: { id: number; title: string; newTags: string[] }[] = [
  {
    id: 3769186,
    title: 'I Inherited a NestJS Codebase. The First Lint Run Found 6 Vulnerabilities.',
    newTags: ['eslint', 'nestjs', 'security', 'devsecops'],
  },
  {
    id: 3248314,
    title: 'We Ranked 5 AI Models by Security. The Leaderboard Is Wrong.',
    newTags: ['ai', 'security', 'eslint', 'javascript'],
  },
  {
    id: 3688612,
    title: 'no-cycle finds 0 cycles in next.js (and other lies caches tell you)',
    newTags: ['eslint', 'javascript', 'node', 'performance'],
  },
  {
    id: 3667300,
    title: 'What ground truth caught that unit tests missed: 3 real bugs in 9 flagship lint rules',
    newTags: ['eslint', 'javascript', 'security', 'node'],
  },
];

// ---------------------------------------------------------------------------
// TITLE FIXES
// Targeted rewrites for the "The X Standard" pattern and jargon frames.
// IDs and current titles confirmed from the live API (2026-05-28).
// ---------------------------------------------------------------------------

const TITLE_FIXES: { id: number; oldTitle: string; newTitle: string }[] = [
  {
    id: 3144099,
    oldTitle: 'Securing Middleware: The Express.js Static Analysis Standard',
    newTitle: 'Express.js Security Audit: 5 Middleware Vulnerabilities Found in Real Codebases',
  },
  {
    id: 3144090,
    oldTitle: 'Architectural Security: The NestJS Static Analysis Standard',
    newTitle: 'NestJS Security: The 6 Vulnerabilities That Slip Past Code Review',
  },
  {
    id: 3144087,
    oldTitle: 'Serverless Security: The AWS Lambda Static Analysis Standard',
    newTitle: 'Your AWS Lambda Has 3 Attack Surfaces. Here\'s How to Find Them in 10 Minutes.',
  },
  {
    id: 3143592,
    oldTitle: 'Frontend Protection: The Browser Static Analysis Standard',
    newTitle: 'The 10-Minute Browser Security Audit: DOM Vulnerabilities Your Linter Misses',
  },
  {
    id: 3143580,
    oldTitle: 'Zero-Trust Auth: The JWT Static Analysis Standard',
    newTitle: 'JWT Security Beyond the Algorithm: What Static Analysis Catches in Token Code',
  },
  {
    id: 3143570,
    oldTitle: 'Runtime Security at Scale: The Node.js Static Analysis Standard',
    newTitle: 'Node.js Cryptography Has a Blind Spot: What npm audit Misses That ESLint Catches',
  },
  {
    id: 3138988,
    oldTitle: 'Automated Compliance: The Secure Coding Static Analysis Standard',
    newTitle: 'The 30-Minute OWASP Compliance Audit: Automating Secure Coding Checks with ESLint',
  },
  {
    id: 3138840,
    oldTitle: 'Hardening the Data Layer: The node-postgres Static Analysis Standard',
    newTitle: 'PostgreSQL Security with node-postgres: The SQL Injection Patterns That Slip Through',
  },
  {
    id: 3138991,
    oldTitle: 'Post-Mortem: The Connection Leak Outage (And the Static Analysis Standard)',
    newTitle: 'Post-Mortem: The Connection Leak That Crashed Production (Caught by One ESLint Rule)',
  },
  {
    id: 3137480,
    oldTitle: 'Hardening the Data Layer: The node-postgres Engineering Standard',
    newTitle: 'SQL Injection in node-postgres: The Pattern 80% of Developers Get Wrong',
  },
  {
    id: 3667300,
    oldTitle: 'What ground truth caught that unit tests missed: 3 real bugs in 9 flagship lint rules',
    newTitle: 'I Found 3 Real Bugs in Popular ESLint Plugins. Unit Tests Didn\'t Catch Them.',
  },
  {
    id: 3137519,
    oldTitle: 'The Security Engineering Blueprint: A JavaScript Master Document',
    newTitle: 'The JavaScript Security Checklist: Covering the OWASP Top 10 with ESLint',
  },
  {
    id: 3139002,
    oldTitle: 'Hardening AI Agents: The Vercel AI Static Analysis Standard',
    newTitle: 'Hardening Vercel AI SDK Agents: The Security Vulnerabilities ESLint Catches',
  },
];

// ---------------------------------------------------------------------------
// CLOSING CTA FIXES
// Append a tailored comment-bait question to high-view / 0-engagement articles.
// Inserted before the footer `---` if present, else at the end of the article.
// ---------------------------------------------------------------------------

const CTA_FIXES: { id: number; title: string; question: string }[] = [
  {
    id: 3237157,
    title: "eslint-plugin-security Is Unmaintained. Here's What Nobody Tells You.",
    question: "Are you still using eslint-plugin-security? Have you found a drop-in replacement that works for your stack — or are you running without a security linter entirely?",
  },
  {
    id: 3137474,
    title: 'The Secret Management Standard: Automating AI Agent Protection',
    question: 'Have you ever found hardcoded credentials in a codebase you inherited? What did the cleanup look like — and did automated scanning catch them first?',
  },
  {
    id: 3137481,
    title: 'Vulnerability Case Study: Prompt Injection in Vercel AI Agents',
    question: 'Have you audited your Vercel AI SDK app for prompt injection? What input patterns triggered the vulnerability in your case?',
  },
  {
    id: 3144148,
    title: 'Exploit Analysis: PostgreSQL COPY FROM Filesystem Access',
    question: 'Have you seen COPY FROM PROGRAM misused in a real codebase? What did your PostgreSQL security audit surface?',
  },
  {
    id: 3116469,
    title: 'The AI Security Protocol: Hardening Vercel AI SDK Agents',
    question: 'What AI agent security issues are you dealing with that automated linting still doesn\'t catch? Share what your security stack looks like.',
  },
  {
    id: 3240750,
    title: "Microsoft's ESLint Security Plugin Catches 10% of Vulnerabilities. Here's What It Misses.",
    question: 'Have you compared security linter coverage on your own codebase? What were the biggest gaps you found?',
  },
  {
    id: 3139002,
    title: 'Hardening AI Agents: The Vercel AI Static Analysis Standard',
    question: 'What security controls are you applying to your Vercel AI SDK agents? Any gaps this doesn\'t cover?',
  },
  {
    id: 3144104,
    title: 'Exploit Analysis: search_path Hijacking (The Hidden PostgreSQL Attack)',
    question: 'Have you run a search_path audit on your PostgreSQL setup? What did it uncover?',
  },
  {
    id: 3114770,
    title: 'Your Vercel AI SDK App Has a Prompt Injection Vulnerability',
    question: 'Have you checked your Vercel AI SDK app for prompt injection vectors? What input triggered the vulnerability?',
  },
  {
    id: 3138808,
    title: 'The OWASP Compliance Protocol: Mapping 247 Static Analysis Rules',
    question: 'How much of the OWASP Top 10 does your current ESLint setup cover? Any categories you\'re still filling manually?',
  },
  {
    id: 3241678,
    title: 'The AI Hydra Problem: Fix One AI Bug, Get Two More',
    question: 'Have you hit this AI security whack-a-mole pattern in your own codebase? What was the root vulnerability that kept spawning derivative bugs?',
  },
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'api-key': apiKey!,
      Accept: 'application/vnd.forem.api-v1+json',
      'Content-Type': 'application/json',
      ...(options.headers),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${path}: ${body}`);
  }
  return res.json();
}

async function getArticle(id: number) {
  // Try authenticated me endpoint first (works for draft/new articles)
  try {
    return await apiFetch(`/articles/${id}`);
  } catch {
    // Try the me endpoint as fallback for brand-new articles
    const all = await apiFetch(`/articles/me/all?per_page=100`);
    return (all as any[]).find((a: any) => a.id === id) ?? null;
  }
}

async function patchArticle(id: number, patch: Record<string, unknown>) {
  return apiFetch(`/articles/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ article: patch }),
  });
}

// When an article's body_markdown has YAML frontmatter, DEV.to re-applies the
// frontmatter fields on every save — so patching `title` or `tags` directly
// gets overwritten. The reliable path is to update the frontmatter in the body.
function hasFrontmatter(body: string) {
  return body.trimStart().startsWith('---\n');
}

function patchFrontmatter(body: string, field: string, value: string): string {
  const FM_RE = /^---\n([\s\S]*?\n)---\n/;
  const m = body.match(FM_RE);
  if (!m) return body;

  let fm = m[1];
  const fieldRe = new RegExp(`^${field}:.*$`, 'm');
  if (fieldRe.test(fm)) {
    fm = fm.replace(fieldRe, `${field}: ${value}`);
  } else {
    fm = fm.trimEnd() + `\n${field}: ${value}\n`;
  }
  return body.replace(FM_RE, `---\n${fm}---\n`);
}

// ---------------------------------------------------------------------------
// Phase 1 — Tags
// ---------------------------------------------------------------------------

async function fixTags() {
  console.log('\n═══ PHASE 1: Tag fixes ═══');
  for (const fix of TAG_FIXES) {
    console.log(`\n  [${fix.id}] ${fix.title.slice(0, 60)}`);
    console.log(`       → tags: [${fix.newTags.join(', ')}]`);
    if (DRY) continue;

    let article: any;
    try { article = await getArticle(fix.id); } catch (e) {
      console.log(`       ⚠️  fetch failed: ${e}`);
      await sleep(RATE_MS);
      continue;
    }

    const body: string = article?.body_markdown ?? '';
    const tagStr = fix.newTags.join(', ');

    if (hasFrontmatter(body)) {
      // Update tags inside the frontmatter so DEV doesn't override them
      const newBody = patchFrontmatter(body, 'tags', tagStr);
      await patchArticle(fix.id, { body_markdown: newBody });
    } else {
      await patchArticle(fix.id, { tags: fix.newTags });
    }
    console.log('       ✅ done');
    await sleep(RATE_MS);
  }
}

// ---------------------------------------------------------------------------
// Phase 2 — Titles
// ---------------------------------------------------------------------------

async function fixTitles() {
  console.log('\n═══ PHASE 2: Title rewrites ═══');
  for (const fix of TITLE_FIXES) {
    console.log(`\n  [${fix.id}] OLD: ${fix.oldTitle}`);
    console.log(`         NEW: ${fix.newTitle}`);
    if (DRY) continue;

    let article: any;
    try { article = await getArticle(fix.id); } catch (e) {
      console.log(`         ⚠️  fetch failed: ${e}`);
      await sleep(RATE_MS);
      continue;
    }

    const body: string = article?.body_markdown ?? '';

    if (hasFrontmatter(body)) {
      // Escape YAML: wrap in single-quotes if title contains colons or special chars
      const safeTitle = fix.newTitle.includes(':') || fix.newTitle.includes("'")
        ? `"${fix.newTitle.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
        : fix.newTitle;
      const newBody = patchFrontmatter(body, 'title', safeTitle);
      await patchArticle(fix.id, { body_markdown: newBody, title: fix.newTitle });
    } else {
      await patchArticle(fix.id, { title: fix.newTitle });
    }
    console.log('         ✅ done');
    await sleep(RATE_MS);
  }
}

// ---------------------------------------------------------------------------
// Phase 3 — CTAs
// ---------------------------------------------------------------------------

function insertCta(body: string, question: string): string {
  const ctaBlock = `\n\n---\n\n**Over to you:** ${question}`;

  // If the article ends with a footer (last `---` followed by links/badges),
  // insert before it so the question appears as the last piece of narrative.
  const footerMatch = body.match(/\n---\n(?:(?!\n---\n)[\s\S])*$/);
  if (footerMatch) {
    const footerIndex = body.lastIndexOf('\n---\n');
    return body.slice(0, footerIndex) + ctaBlock + body.slice(footerIndex);
  }

  // Otherwise append at the very end.
  return body.trimEnd() + ctaBlock + '\n';
}

async function fixCtas() {
  console.log('\n═══ PHASE 3: Closing CTAs ═══');
  for (const fix of CTA_FIXES) {
    console.log(`\n  [${fix.id}] ${fix.title.slice(0, 60)}`);
    if (DRY) {
      console.log(`       → Would append: "${fix.question.slice(0, 80)}..."`);
      continue;
    }

    let article: any;
    try {
      article = await getArticle(fix.id);
    } catch (e) {
      console.log(`       ⚠️  fetch failed: ${e}`);
      await sleep(RATE_MS);
      continue;
    }

    const body: string = article.body_markdown ?? '';
    if (!body) {
      console.log('       ⚠️  empty body_markdown, skipping');
      await sleep(RATE_MS);
      continue;
    }

    // Skip if already has a closing CTA
    if (/over to you:|have you (?:run into|encountered|audited|seen|found|checked|hit)/i.test(
      body.slice(-600),
    )) {
      console.log('       ⏭  CTA already present, skipping');
      await sleep(RATE_MS);
      continue;
    }

    const newBody = insertCta(body, fix.question);
    await patchArticle(fix.id, { body_markdown: newBody });
    console.log('       ✅ done');
    await sleep(RATE_MS);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  console.log(`\nDEV.to Precision Fix — ${DRY ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Phases: ${[DO_TAGS && 'tags', DO_TITLES && 'titles', DO_CTAS && 'ctas'].filter(Boolean).join(' + ')}\n`);

  if (DO_TAGS) await fixTags();
  if (DO_TITLES) await fixTitles();
  if (DO_CTAS) await fixCtas();

  console.log('\n✅ All done.\n');
}

run().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
