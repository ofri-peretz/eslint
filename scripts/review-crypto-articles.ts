
import * as fs from 'node:fs';
import * as path from 'node:path';


// Load env vars
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../.env.local')
];

envPaths.forEach(envPath => {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Simple quote removal
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
});

const API_KEY = process.env.DEV_TO_API_KEY;
if (!API_KEY) {
  console.error('❌ DEV_TO_API_KEY not found in environment or .env.local');
  process.exit(1);
}

const STRATEGY_FILE = path.resolve(__dirname, '../distribution/REVAMPED_CRYPTO_STRATEGY.md');
const strategyContent = fs.existsSync(STRATEGY_FILE) ? fs.readFileSync(STRATEGY_FILE, 'utf-8') : '';

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  published: boolean;
  page_views_count: number;
  tag_list: string[];
  slug: string;
  path: string;
  url: string;
  canonical_url: string;
  published_timestamp: string;
  body_markdown: string; // available in /me/all?
}

// Map of legacy/bad terms to new terms from strategy
const CHECKS = [
  { term: 'eslint-plugin-crypto', type: 'deprecated', fix: 'eslint-plugin-node-security' },
  { term: 'no-weak-hash-algorithm', type: 'rule_check', context: 'Ensure it is node-security/no-weak-hash-algorithm' },
  { term: 'crypto.createHash', type: 'code_check', context: 'Ensure safe usage mentioned' },
  { term: 'md5', type: 'keyword', context: 'Check if specifically flagging as bad' },
];

async function fetchArticles() {
  console.log('Fetching articles from DEV.TO...');
  const response = await fetch('https://dev.to/api/articles/me/all?per_page=100', {
    headers: {
      'api-key': API_KEY!,
      'accept': 'application/vnd.forem.api-v1+json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.statusText}`);
  }

  const articles = await response.json() as DevToArticle[];
  return articles;
}

async function reviewArticles() {
  const articles = await fetchArticles();
  
  // Collect all tags for debugging
  const allTags = new Set(articles.flatMap(a => a.tag_list));
  console.log(`Debug: Found ${articles.length} total articles.`);
  console.log(`Debug: Available tags: ${Array.from(allTags).sort().join(', ')}\n`);

  // broadened search: tag 'crypto', 'cryptography', 'security', 'node', or title keywords
  const cryptoArticles = articles.filter(a => {
    const tags = a.tag_list.map(t => t.toLowerCase());
    const title = a.title.toLowerCase();
    const isCryptoTag = tags.includes('crypto') || tags.includes('cryptography') || tags.includes('security') || tags.includes('node');
    const isCryptoTitle = title.includes('crypto') || title.includes('md5') || title.includes('timing') || title.includes('encryption') || title.includes('cipher') || title.includes('hash');
    return isCryptoTag || isCryptoTitle;
  });

  console.log(`Found ${cryptoArticles.length} potentially relevant articles (checking tags: crypto, cryptography, security, node; and keywords).\n`);

  console.log('--- Reviewing against Revamped Crypto Strategy ---\n');

  for (const article of cryptoArticles) {
    console.log(`📄 Title: "${article.title}"`);
    console.log(`   URL: ${article.url}`);
    console.log(`   Slug: ${article.slug}`);
    console.log(`   Status: ${article.published ? '✅ Published' : 'Draft'}`);
    
    // Check for deprecated plugin usage
    // We strictly need body_markdown, but /me/all might not return full body in listing.
    // Let's check. If not, we fetch individual article.
    let body = article.body_markdown;
    if (!body) {
       const detailResp = await fetch(`https://dev.to/api/articles/${article.id}`, {
         headers: { 'api-key': API_KEY! }
       });
       if (detailResp.ok) {
         const detail = await detailResp.json();
         body = detail.body_markdown;
       }
    }

    if (!body) {
      console.log('   ⚠️ Could not fetch body for analysis.');
      continue;
    }

    const issues = [];
    
    // 1. Check for deprecated plugin
    if (body.includes('eslint-plugin-crypto')) {
      issues.push('❌ References deprecated `eslint-plugin-crypto`');
    } else if (body.includes('eslint-plugin-node-security')) {
      issues.push('✅ References `eslint-plugin-node-security`');
    } else {
      issues.push('⚠️ No explicit plugin reference found (should reference `eslint-plugin-node-security`)');
    }

    // 2. Check for rule naming convention
    // Strategy says: "Update rule ref from ... (generic) to node-security/..."
    const rules = ['no-weak-hash-algorithm', 'no-timing-unsafe-compare', 'no-static-iv', 'no-ecb-mode'];
    for (const rule of rules) {
      if (body.includes(rule) && !body.includes(`node-security/${rule}`)) {
         // Check if it's using the old prefix or no prefix
         if (!body.includes('node-security/')) {
             issues.push(`⚠️ Mentions rule \`${rule}\` without \`node-security/\` prefix`);
         }
      }
    }

    // 3. Check for specific topic alignment
    if (article.title.toLowerCase().includes('md5')) {
       issues.push('ℹ️ Topic: MD5 (Strategy #1)');
    } else if (article.title.toLowerCase().includes('timing')) {
       issues.push('ℹ️ Topic: Timing Attacks (Strategy #2)');
    } else if (article.title.toLowerCase().includes('iv') || article.title.toLowerCase().includes('initialization vector')) {
       issues.push('ℹ️ Topic: Static IVs (Strategy #3)');
    }

    if (issues.length > 0) {
      console.log('   Findings:');
      issues.forEach(i => console.log(`     ${i}`));
    } else {
      console.log('   ✅ No immediate issues found based on basic scan.');
    }
    console.log('\n');
  }
}

reviewArticles().catch(console.error);
