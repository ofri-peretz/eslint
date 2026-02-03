import fs from 'node:fs';
import { config } from 'dotenv';

config();

const API_KEY = process.env.DEV_TO_API_KEY;
const ARTICLE_ID = "3137481"; // 3 Lines of Code to Hack Your Vercel AI App
const ARTICLE_PATH = "/Users/ofri/repos/ofriperetz.dev/eslint/distribution/remote-articles-feedback-2026-02-03/3-lines-of-code-to-hack-your-vercel-ai-app-and-1-line-to-fix-it-jo/article.md";

if (!API_KEY) {
  console.error("Missing DEV_TO_API_KEY in .env");
  process.exit(1);
}

const bodyMarkdown = fs.readFileSync(ARTICLE_PATH, 'utf-8');

async function updateArticle() {
  console.log(`Updating article ${ARTICLE_ID} on Dev.to...`);
  
  const response = await fetch(`https://dev.to/api/articles/${ARTICLE_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'api-key': API_KEY
    },
    body: JSON.stringify({
      article: {
        body_markdown: bodyMarkdown
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update article: ${response.status} ${error}`);
  }

  const data = await response.json();
  console.log(`✅ Article updated successfully!`);
  console.log(`URL: ${data.url}`);
}

updateArticle().catch(console.error);
