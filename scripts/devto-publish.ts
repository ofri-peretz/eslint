#!/usr/bin/env tsx
/**
 * Dev.to Article Publishing Script
 *
 * Uploads articles from distribution/articles/ to Dev.to as drafts.
 * Uses the V1 API with proper authentication.
 *
 * Usage:
 *   npm devto:publish              # Dry run (default)
 *   npm devto:publish --live       # Actually publish to dev.to
 *   npm devto:publish --article pg/01-sql-injection.md  # Single article
 *
 * Environment:
 *   DEV_TO_API_KEY - Your dev.to API key (from https://dev.to/settings/extensions)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// Configuration
// ============================================================================

const ARTICLES_DIR = path.resolve(__dirname, '../distribution/articles');
const API_BASE_URL = 'https://dev.to/api';
const RATE_LIMIT_DELAY_MS = 1000; // 1 second between requests to avoid rate limits

interface ArticleFrontmatter {
  title: string;
  published: boolean;
  description: string;
  tags: string;
  cover_image?: string;
  canonical_url?: string;
  series?: string;
}

interface ParsedArticle {
  filePath: string;
  relativePath: string;
  frontmatter: ArticleFrontmatter;
  bodyMarkdown: string;
}

interface DevToArticlePayload {
  article: {
    title: string;
    published: boolean;
    body_markdown: string;
    tags: string[];
    description?: string;
    main_image?: string;
    canonical_url?: string;
    series?: string;
  };
}

interface DevToArticleResponse {
  id: number;
  title: string;
  url: string;
  published: boolean;
  slug: string;
}

interface PublishResult {
  success: boolean;
  article: string;
  id?: number;
  url?: string;
  error?: string;
}

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(): { dryRun: boolean; singleArticle?: string } {
  const args = process.argv.slice(2);
  let dryRun = true;
  let singleArticle: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--live') {
      dryRun = false;
    } else if (args[i] === '--article' && args[i + 1]) {
      singleArticle = args[i + 1];
      i++;
    }
  }

  return { dryRun, singleArticle };
}

// ============================================================================
// Frontmatter Parsing
// ============================================================================

function parseFrontmatter(content: string): { frontmatter: ArticleFrontmatter; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('Invalid frontmatter format');
  }

  const [, frontmatterYaml, body] = match;
  const frontmatter: Partial<ArticleFrontmatter> = {};

  // Parse YAML manually (simple key: value parsing)
  const lines = frontmatterYaml.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Remove surrounding quotes if present
    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }

    // Handle boolean
    if (value === 'true') {
      (frontmatter as Record<string, unknown>)[key] = true;
    } else if (value === 'false') {
      (frontmatter as Record<string, unknown>)[key] = false;
    } else {
      (frontmatter as Record<string, unknown>)[key] = value;
    }
  }

  return {
    frontmatter: frontmatter as ArticleFrontmatter,
    body: body.trim(),
  };
}

// ============================================================================
// Article Discovery
// ============================================================================

function discoverArticles(articlesDir: string, singleArticle?: string): ParsedArticle[] {
  const articles: ParsedArticle[] = [];

  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name.endsWith('.md')) {
        const relativePath = path.relative(articlesDir, fullPath);

        // If single article specified, skip others
        if (singleArticle && relativePath !== singleArticle) {
          continue;
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const { frontmatter, body } = parseFrontmatter(content);

          // Validate required fields
          if (!frontmatter.title) {
            console.warn(`⚠️  Skipping ${relativePath}: Missing title`);
            continue;
          }

          articles.push({
            filePath: fullPath,
            relativePath,
            frontmatter,
            bodyMarkdown: body,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`⚠️  Skipping ${relativePath}: ${errorMessage}`);
        }
      }
    }
  }

  walkDir(articlesDir);
  return articles;
}

// ============================================================================
// Dev.to API Client
// ============================================================================

async function createArticle(
  apiKey: string,
  article: ParsedArticle
): Promise<DevToArticleResponse> {
  // Parse tags (comma-separated string to array, max 4 tags)
  const tags = article.frontmatter.tags
    ? article.frontmatter.tags.split(',').map(t => t.trim()).slice(0, 4)
    : [];

  const payload: DevToArticlePayload = {
    article: {
      title: article.frontmatter.title,
      published: false, // Always draft
      body_markdown: article.bodyMarkdown,
      tags,
      description: article.frontmatter.description || undefined,
      main_image: article.frontmatter.cover_image || undefined,
      canonical_url: article.frontmatter.canonical_url || undefined,
      series: article.frontmatter.series || undefined,
    },
  };

  const response = await fetch(`${API_BASE_URL}/articles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.forem.api-v1+json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<DevToArticleResponse>;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const { dryRun, singleArticle } = parseArgs();

  console.log('\n🚀 Dev.to Article Publisher');
  console.log('═'.repeat(50));
  console.log(`📁 Articles directory: ${ARTICLES_DIR}`);
  console.log(`🔧 Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '🔴 LIVE (will publish)'}`);
  if (singleArticle) {
    console.log(`📄 Single article: ${singleArticle}`);
  }
  console.log('');

  // Check for API key
  const apiKey = process.env['DEV_TO_API_KEY'];
  if (!apiKey && !dryRun) {
    console.error('❌ DEV_TO_API_KEY environment variable is required for live mode');
    console.error('');
    console.error('To get your API key:');
    console.error('  1. Go to https://dev.to/settings/extensions');
    console.error('  2. Generate a new API key under "DEV Community API Keys"');
    console.error('  3. Set it: export DEV_TO_API_KEY="your-key-here"');
    console.error('');
    process.exit(1);
  }

  // Discover articles
  const articles = discoverArticles(ARTICLES_DIR, singleArticle);

  if (articles.length === 0) {
    console.log('📭 No articles found to publish');
    if (singleArticle) {
      console.log(`   Looking for: ${singleArticle}`);
    }
    process.exit(0);
  }

  console.log(`📚 Found ${articles.length} article(s) to publish:\n`);

  // Group by folder for display
  const byFolder = new Map<string, ParsedArticle[]>();
  for (const article of articles) {
    const folder = path.dirname(article.relativePath);
    if (!byFolder.has(folder)) {
      byFolder.set(folder, []);
    }
    byFolder.get(folder)!.push(article);
  }

  for (const [folder, folderArticles] of byFolder) {
    console.log(`  📂 ${folder}/`);
    for (const article of folderArticles) {
      const tags = article.frontmatter.tags || 'no tags';
      console.log(`      └─ ${path.basename(article.relativePath)}`);
      console.log(`         📝 "${article.frontmatter.title}"`);
      console.log(`         🏷️  ${tags}`);
    }
    console.log('');
  }

  if (dryRun) {
    console.log('═'.repeat(50));
    console.log('🔍 DRY RUN COMPLETE - No articles were published');
    console.log('');
    console.log('To publish for real, run:');
    console.log('  npm devto:publish --live');
    console.log('');
    process.exit(0);
  }

  // Live mode - actually publish
  console.log('═'.repeat(50));
  console.log('📤 Starting upload to Dev.to...\n');

  const results: PublishResult[] = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const progress = `[${i + 1}/${articles.length}]`;

    process.stdout.write(`${progress} ${article.relativePath}... `);

    try {
      const response = await createArticle(apiKey!, article);
      results.push({
        success: true,
        article: article.relativePath,
        id: response.id,
        url: response.url,
      });
      console.log(`✅ Created (ID: ${response.id})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        success: false,
        article: article.relativePath,
        error: errorMessage,
      });
      console.log(`❌ Failed: ${errorMessage}`);
    }

    // Rate limiting delay (except for last article)
    if (i < articles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 PUBLISH SUMMARY\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log('');

  if (successful.length > 0) {
    console.log('📝 Created Drafts:');
    for (const result of successful) {
      console.log(`   • ${result.article}`);
      console.log(`     🔗 ${result.url}`);
    }
    console.log('');
  }

  if (failed.length > 0) {
    console.log('⚠️  Failed Articles:');
    for (const result of failed) {
      console.log(`   • ${result.article}: ${result.error}`);
    }
    console.log('');
  }

  console.log('📌 Next Steps:');
  console.log('   1. Visit https://dev.to/dashboard to review drafts');
  console.log('   2. Add cover images (1000x420px recommended)');
  console.log('   3. Publish when ready!');
  console.log('');

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
