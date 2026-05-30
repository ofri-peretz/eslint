#!/usr/bin/env tsx
/**
 * Dev.to Article Tag Updater
 *
 * Fetches all published articles and updates tags to ensure:
 * 1. All ESLint-related articles have the 'eslint' tag
 * 2. Plugin-specific articles have their plugin tag (jwt, crypto, etc.)
 *
 * Usage:
 *   npm devto:update-tags              # Dry run (default)
 *   npm devto:update-tags --live       # Actually update tags
 *
 * Environment:
 *   DEV_TO_API_KEY - Your dev.to API key (from https://dev.to/settings/extensions)
 */

const API_BASE_URL = 'https://dev.to/api';
const RATE_LIMIT_DELAY_MS = 1000;

// Plugin tag mapping - these are the tags that should be added for related articles
const _PLUGIN_TAGS = [
  'eslint',        // Core - MUST be on all ESLint articles
  'jwt',           // eslint-plugin-jwt
  'mongodb',       // eslint-plugin-mongodb-security
  'express',       // eslint-plugin-express-security
  'nestjs',        // eslint-plugin-nestjs-security
  'lambda',        // eslint-plugin-lambda-security
  'postgres',      // eslint-plugin-pg (using postgres as tag)
  'react',         // eslint-plugin-react-a11y, eslint-plugin-react-features
  'accessibility', // eslint-plugin-react-a11y
  'vercel',        // eslint-plugin-vercel-ai-security
  'browser',       // eslint-plugin-browser-security
  'security',      // General security tag for all security plugins
] as const;

// Keywords to detect plugin relevance - maps content keywords to required tags
const PLUGIN_DETECTION: Record<string, string[]> = {
  // JWT plugin
  'jwt': ['jwt', 'eslint', 'security'],
  'jsonwebtoken': ['jwt', 'eslint', 'security'],
  'token verification': ['jwt', 'eslint', 'security'],
  'token signing': ['jwt', 'eslint', 'security'],
  
  // Cryptography topics (covered by eslint-plugin-node-security — crypto plugin deprecated)
  'cryptography': ['eslint', 'node', 'security'],
  'encryption': ['eslint', 'node', 'security'],
  'bcrypt': ['eslint', 'node', 'security'],

  // MongoDB plugin
  'mongodb': ['mongodb', 'eslint', 'security'],
  'mongoose': ['mongodb', 'eslint', 'security'],
  'nosql injection': ['mongodb', 'eslint', 'security'],
  
  // Express plugin
  'express': ['express', 'eslint', 'security'],
  'express.js': ['express', 'eslint', 'security'],
  'middleware': ['express', 'eslint', 'security'],
  
  // NestJS plugin
  'nestjs': ['nestjs', 'eslint', 'security'],
  'nest.js': ['nestjs', 'eslint', 'security'],
  
  // Lambda plugin
  'lambda': ['lambda', 'eslint', 'security'],
  'aws lambda': ['lambda', 'eslint', 'security'],
  'serverless': ['lambda', 'eslint', 'security'],
  
  // PostgreSQL plugin
  'postgresql': ['postgres', 'eslint', 'security'],
  'postgres': ['postgres', 'eslint', 'security'],
  'sql injection': ['postgres', 'eslint', 'security'],
  
  // React plugins
  'react': ['react', 'eslint'],
  'react component': ['react', 'eslint'],
  'jsx': ['react', 'eslint'],
  'a11y': ['react', 'accessibility', 'eslint'],
  'accessibility': ['accessibility', 'eslint'],
  'aria': ['accessibility', 'eslint'],
  'wcag': ['accessibility', 'eslint'],
  
  // Vercel AI plugin
  'vercel ai': ['vercel', 'eslint', 'security'],
  'ai sdk': ['vercel', 'eslint', 'security'],
  
  // Browser security
  'xss': ['browser', 'eslint', 'security'],
  'cross-site scripting': ['browser', 'eslint', 'security'],
  'dom': ['browser', 'eslint'],
  'innerhtml': ['browser', 'eslint', 'security'],
  
  // Import / cycle detection (import-next plugin)
  'no-cycle': ['javascript', 'node', 'eslint'],
  'import cycle': ['javascript', 'node', 'eslint'],
  'circular dependency': ['javascript', 'node', 'eslint'],
  'circular import': ['javascript', 'node', 'eslint'],
  'depth-first': ['javascript', 'algorithms', 'eslint'],

  // Performance topics
  'n+1': ['postgres', 'performance', 'node'],
  'performance regression': ['javascript', 'performance', 'node'],
  '100x': ['javascript', 'performance', 'eslint'],
  'benchmark': ['javascript', 'performance', 'eslint'],

  // AI / LLM security
  'prompt injection': ['ai', 'security', 'javascript'],
  'llm': ['ai', 'security', 'javascript'],
  'openai': ['ai', 'security', 'javascript'],
  'anthropic': ['ai', 'security', 'javascript'],
  'claude': ['ai', 'security', 'javascript'],
  'owasp llm': ['ai', 'security', 'javascript'],

  // General ESLint
  'eslint': ['eslint'],
  'linting': ['eslint'],
  'static analysis': ['eslint', 'javascript'],
};

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  published: boolean;
  published_at: string;
  tag_list: string[];
  body_markdown?: string;
}

interface TagUpdate {
  article: DevToArticle;
  currentTags: string[];
  newTags: string[];
  addedTags: string[];
  removedTags: string[];
  reason: string;
}

// Parse command line arguments
function parseArgs(): { dryRun: boolean } {
  const args = process.argv.slice(2);
  let dryRun = true;

  for (const arg of args) {
    if (arg === '--live') {
      dryRun = false;
    }
  }

  return { dryRun };
}

// Fetch all published articles
async function fetchMyArticles(apiKey: string): Promise<DevToArticle[]> {
  const allArticles: DevToArticle[] = [];
  let page = 1;
  const perPage = 30;

  console.log('📥 Fetching your published articles...\n');

  while (true) {
    const response = await fetch(`${API_BASE_URL}/articles/me/published?page=${page}&per_page=${perPage}`, {
      headers: {
        'Accept': 'application/vnd.forem.api-v1+json',
        'api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const articles = (await response.json()) as DevToArticle[];
    
    if (articles.length === 0) {
      break;
    }

    allArticles.push(...articles);
    console.log(`   Page ${page}: ${articles.length} articles`);
    
    if (articles.length < perPage) {
      break;
    }

    page++;
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
  }

  return allArticles;
}

// Fetch a single article with body content (for deeper analysis)
async function fetchArticleContent(apiKey: string, id: number): Promise<DevToArticle> {
  const response = await fetch(`${API_BASE_URL}/articles/${id}`, {
    headers: {
      'Accept': 'application/vnd.forem.api-v1+json',
      'api-key': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return (await response.json()) as DevToArticle;
}

// Detect which tags should be added based on article content
function detectRequiredTags(article: DevToArticle): Set<string> {
  const requiredTags = new Set<string>();
  const searchText = `${article.title} ${article.description || ''} ${article.body_markdown || ''}`.toLowerCase();

  for (const [keyword, tags] of Object.entries(PLUGIN_DETECTION)) {
    // Escape special regex characters in keyword just in case (though our list is simple)
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match whole word only
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
    
    if (regex.test(searchText)) {
      for (const tag of tags) {
        requiredTags.add(tag);
      }
    }
  }

  // Every article in this repo is ESLint-related — always require the base tag
  requiredTags.add('eslint');

  return requiredTags;
}

// Calculate optimal tag set (max 4 tags)
function calculateNewTags(currentTags: string[], requiredTags: Set<string>): { newTags: string[]; removedTag: string | null } {
  const currentSet = new Set(currentTags.map(t => t.toLowerCase()));
  const tagsToAdd = [...requiredTags].filter(t => !currentSet.has(t));
  
  // If no changes needed
  if (tagsToAdd.length === 0) {
    return { newTags: currentTags, removedTag: null };
  }

  // Priority for keeping/adding tags (higher = more important)
  const tagPriority: Record<string, number> = {
    'eslint': 100,      // Always keep
    // Plugin-specific tags (High priority as per user requirement)
    'jwt': 95,
    'crypto': 95,
    'mongodb': 95,
    'express': 95,
    'nestjs': 95,
    'lambda': 95,
    'postgres': 95,
    'react': 95,
    'accessibility': 95,
    'vercel': 95,
    'browser': 95,
    
    'security': 90,       // Very important for SEO
    'javascript': 80,     // Good for discoverability
    'typescript': 80,
    'node': 70,
    'ai': 70,
    'devsecops': 70,
    'performance': 65,
    'nodejs': 60,
    'webdev': 50,
    'algorithms': 40,
    'benchmarks': 35,
    'tutorial': 35,
    // Dead-discovery tags — explicitly deprioritised so any detected required tag displaces them
    'staticanalysis': 5,
  };

  // Combine current and required tags
  const allTags = new Set([...currentTags, ...requiredTags]);
  const sortedTags = [...allTags].sort((a, b) => {
    // Default priority for required tags that aren't explicitly listed should be high (95) 
    // to ensure detected plugin tags we missed in the map still get added.
    // Default for existing tags that aren't required is low (30).
    const priorityA = tagPriority[a.toLowerCase()] || (requiredTags.has(a.toLowerCase()) ? 95 : 30);
    const priorityB = tagPriority[b.toLowerCase()] || (requiredTags.has(b.toLowerCase()) ? 95 : 30);
    return priorityB - priorityA;
  });

  // Take top 4
  const newTags = sortedTags.slice(0, 4);
  const removedTag = currentTags.find(t => !newTags.includes(t)) || null;

  return { newTags, removedTag };
}

// Update article tags via API
async function updateArticleTags(apiKey: string, articleId: number, tags: string[]): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/articles/${articleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.forem.api-v1+json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      article: {
        tags: tags,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }
}

// Main execution
async function main() {
  const { dryRun } = parseArgs();

  console.log('\n🏷️  Dev.to Article Tag Updater');
  console.log('═'.repeat(60));
  console.log(`🔧 Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '🔴 LIVE (will update)'}`);
  console.log('');

  // Check for API key (support both names)
  const apiKey = process.env['DEV_TO_API_KEY'] || process.env['DEVTO_API_KEY'];
  if (!apiKey) {
    console.error('❌ DEV_TO_API_KEY environment variable is required');
    console.error('');
    console.error('To get your API key:');
    console.error('  1. Go to https://dev.to/settings/extensions');
    console.error('  2. Generate a new API key under "DEV Community API Keys"');
    console.error('  3. Set it: export DEV_TO_API_KEY="your-key-here"');
    console.error('');
    process.exit(1);
  }

  // Fetch all articles
  const articles = await fetchMyArticles(apiKey);
  console.log(`\n📚 Found ${articles.length} published article(s)\n`);

  if (articles.length === 0) {
    console.log('📭 No published articles found');
    process.exit(0);
  }

  // Analyze each article
  const updates: TagUpdate[] = [];

  console.log('🔍 Analyzing articles for tag updates...\n');

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    process.stdout.write(`   [${i + 1}/${articles.length}] "${article.title.slice(0, 50)}..." `);

    // Fetch full article content for better analysis; fall back to the list
    // article if the public endpoint returns 404 (e.g. very recently published)
    let fullArticle: DevToArticle;
    try {
      fullArticle = await fetchArticleContent(apiKey, article.id);
    } catch {
      fullArticle = article;
    }
    const requiredTags = detectRequiredTags(fullArticle);
    const { newTags, removedTag: _removedTag } = calculateNewTags(article.tag_list, requiredTags);

    const currentTagsLower = article.tag_list.map(t => t.toLowerCase());
    const newTagsLower = newTags.map(t => t.toLowerCase());

    // Check if there are actual changes
    const hasChanges = 
      newTagsLower.length !== currentTagsLower.length ||
      newTagsLower.some(t => !currentTagsLower.includes(t));

    if (hasChanges) {
      const addedTags = newTags.filter(t => !currentTagsLower.includes(t.toLowerCase()));
      const removedTags = article.tag_list.filter(t => !newTagsLower.includes(t.toLowerCase()));

      updates.push({
        article: fullArticle,
        currentTags: article.tag_list,
        newTags,
        addedTags,
        removedTags,
        reason: `Add: [${addedTags.join(', ')}]${removedTags.length ? ` | Remove: [${removedTags.join(', ')}]` : ''}`,
      });

      console.log('📝 needs update');
    } else {
      console.log('✅ ok');
    }

    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 ANALYSIS SUMMARY\n');

  console.log(`✅ Articles with correct tags: ${articles.length - updates.length}`);
  console.log(`📝 Articles needing updates: ${updates.length}`);
  console.log('');

  if (updates.length === 0) {
    console.log('🎉 All articles already have optimal tags!');
    process.exit(0);
  }

  // Show proposed changes
  console.log('Proposed Tag Changes:');
  console.log('─'.repeat(60));

  for (const update of updates) {
    console.log(`\n📰 "${update.article.title}"`);
    console.log(`   🔗 ${update.article.url}`);
    console.log(`   Current: [${update.currentTags.join(', ')}]`);
    console.log(`   New:     [${update.newTags.join(', ')}]`);
    console.log(`   ${update.addedTags.length ? `➕ Adding: ${update.addedTags.join(', ')}` : ''}`);
    console.log(`   ${update.removedTags.length ? `➖ Removing: ${update.removedTags.join(', ')}` : ''}`);
  }

  if (dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('🔍 DRY RUN COMPLETE - No changes were made');
    console.log('');
    console.log('To apply these changes, run:');
    console.log('  export DEV_TO_API_KEY="your-key"');
    console.log('  npm devto:update-tags --live');
    console.log('');
    process.exit(0);
  }

  // Live mode - apply updates
  console.log('\n' + '═'.repeat(60));
  console.log('📤 Applying tag updates...\n');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    const progress = `[${i + 1}/${updates.length}]`;

    process.stdout.write(`${progress} Updating "${update.article.title.slice(0, 40)}..."... `);

    try {
      await updateArticleTags(apiKey, update.article.id, update.newTags);
      console.log('✅ done');
      successCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ failed: ${errorMessage}`);
      failCount++;
    }

    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 UPDATE COMPLETE\n');
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
