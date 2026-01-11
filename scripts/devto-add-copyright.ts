#!/usr/bin/env tsx
import * as fs from 'node:fs';
import * as path from 'node:path';

const API_BASE_URL = 'https://dev.to/api';
const COPYRIGHT_FOOTER = '\n\n---\n\nCopyright (c) 2025 Ofri Peretz. All rights reserved.';
const COPYRIGHT_CHECK = 'Copyright (c) 2025 Ofri Peretz';

async function main() {
  const apiKey = process.env['DEV_TO_API_KEY'];
  if (!apiKey) {
    console.error('❌ DEV_TO_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('🔄 Fetching your articles from Dev.to...');
  
  // 1. Fetch all articles (published + drafts)
  // Pagination might be needed if > 1000 articles, but likely < 1000 for now.
  const response = await fetch(`${API_BASE_URL}/articles/me/all?per_page=1000`, {
    headers: {
      'api-key': apiKey,
      'Accept': 'application/vnd.forem.api-v1+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.status} ${await response.text()}`);
  }

  const articles = await response.json() as any[];
  console.log(`📚 Found ${articles.length} articles.`);

  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const article of articles) {
    // 2. Check content
    const currentBody = article.body_markdown || '';
    
    if (currentBody.includes(COPYRIGHT_CHECK)) {
      console.log(`⏩ Skipping "${article.title}" (already has copyright)`);
      skippedCount++;
      continue;
    }

    console.log(`📝 Updating "${article.title}"...`);
    
    // 3. Update article
    const newBody = currentBody + COPYRIGHT_FOOTER;
    
    try {
      const updateRes = await fetch(`${API_BASE_URL}/articles/${article.id}`, {
        method: 'PUT',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.forem.api-v1+json',
        },
        body: JSON.stringify({
          article: {
            body_markdown: newBody
          }
        }),
      });

      if (!updateRes.ok) {
        // If 429, wait and retry? For now just log error.
        console.error(`❌ Failed to update "${article.title}": ${updateRes.status}`);
        failedCount++;
      } else {
        console.log(`✅ Updated "${article.title}"`);
        updatedCount++;
      }
      
      // Rate limit
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (e) {
      console.error(`❌ Error updating "${article.title}":`, e);
      failedCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Updated: ${updatedCount}`);
  console.log(`⏩ Skipped: ${skippedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
}

main().catch(console.error);
