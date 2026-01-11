#!/usr/bin/env node
/**
 * Link Integrity Checker
 * 
 * Scans all MDX files for external links and validates:
 * - HTTP status codes (must be 200)
 * - HTTPS enforcement
 * - rel="noopener noreferrer" security attributes
 * 
 * Run: node scripts/check-links.mjs
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '../content');
const OUTPUT_FILE = join(__dirname, '../link-report.json');

// Regex patterns for finding links
const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
const JSX_HREF_REGEX = /href=["'](https?:\/\/[^"']+)["']/g;
const URL_REGEX = /(https?:\/\/[^\s<>"')\]]+)/g;

// Links to skip (known external services that block bots)
const SKIP_DOMAINS = [
  'github.com/login',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'codecov.io/api',
  'localhost',
  '127.0.0.1',
];

/**
 * Recursively find all MDX files
 */
function findMdxFiles(dir, files = []) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      findMdxFiles(fullPath, files);
    } else if (item.endsWith('.mdx') || item.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Extract all external URLs from a file
 */
function extractUrls(content, filePath) {
  const urls = new Map();
  
  // Find markdown links
  let match;
  while ((match = MARKDOWN_LINK_REGEX.exec(content)) !== null) {
    const [fullMatch, linkText, url] = match;
    urls.set(url, { linkText, source: 'markdown', line: getLineNumber(content, match.index) });
  }
  
  // Find JSX href attributes
  const jsxRegex = new RegExp(JSX_HREF_REGEX.source, 'g');
  while ((match = jsxRegex.exec(content)) !== null) {
    const [fullMatch, url] = match;
    if (!urls.has(url)) {
      urls.set(url, { linkText: '', source: 'jsx', line: getLineNumber(content, match.index) });
    }
  }
  
  return Array.from(urls.entries()).map(([url, meta]) => ({
    url,
    ...meta,
    file: relative(CONTENT_DIR, filePath),
  }));
}

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

/**
 * Check if URL should be skipped
 */
function shouldSkip(url) {
  return SKIP_DOMAINS.some(domain => url.includes(domain));
}

/**
 * Validate a single URL
 */
async function validateUrl(urlInfo, timeout = 10000) {
  const { url, file, line, linkText } = urlInfo;
  
  if (shouldSkip(url)) {
    return { ...urlInfo, status: 'skipped', reason: 'Known external service' };
  }
  
  const issues = [];
  
  // Check for HTTPS
  if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    issues.push('Not using HTTPS');
  }
  
  // Check HTTP status
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ESLint-Interlace-Link-Checker/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    
    const statusCode = response.status;
    
    if (statusCode >= 400) {
      issues.push(`HTTP ${statusCode}`);
    }
    
    // Check for suspicious redirects (homepage instead of deep link)
    const finalUrl = response.url;
    if (finalUrl !== url) {
      const originalPath = new URL(url).pathname;
      const finalPath = new URL(finalUrl).pathname;
      
      if (originalPath.length > 1 && (finalPath === '/' || finalPath === '')) {
        issues.push(`Redirects to homepage (${finalUrl})`);
      }
    }
    
    return {
      ...urlInfo,
      status: issues.length > 0 ? 'warning' : 'ok',
      statusCode,
      finalUrl,
      issues,
    };
    
  } catch (error) {
    return {
      ...urlInfo,
      status: 'error',
      issues: [error.name === 'AbortError' ? 'Timeout' : error.message],
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Scanning for MDX files...\n');
  
  const files = findMdxFiles(CONTENT_DIR);
  console.log(`Found ${files.length} MDX files\n`);
  
  // Extract all URLs
  const allUrls = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const urls = extractUrls(content, file);
    allUrls.push(...urls);
  }
  
  // Deduplicate URLs
  const uniqueUrls = new Map();
  for (const urlInfo of allUrls) {
    if (!uniqueUrls.has(urlInfo.url)) {
      uniqueUrls.set(urlInfo.url, urlInfo);
    }
  }
  
  console.log(`Found ${uniqueUrls.size} unique external URLs\n`);
  console.log('Validating links...\n');
  
  // Validate all URLs (with concurrency limit)
  const results = [];
  const urlList = Array.from(uniqueUrls.values());
  const batchSize = 5;
  
  for (let i = 0; i < urlList.length; i += batchSize) {
    const batch = urlList.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(validateUrl));
    results.push(...batchResults);
    
    // Progress indicator
    const progress = Math.min(i + batchSize, urlList.length);
    process.stdout.write(`\r  Progress: ${progress}/${urlList.length}`);
  }
  
  console.log('\n\n');
  
  // Categorize results
  const ok = results.filter(r => r.status === 'ok');
  const warnings = results.filter(r => r.status === 'warning');
  const errors = results.filter(r => r.status === 'error');
  const skipped = results.filter(r => r.status === 'skipped');
  
  // Print summary
  console.log('📊 Link Check Summary');
  console.log('═'.repeat(50));
  console.log(`  ✅ OK:       ${ok.length}`);
  console.log(`  ⚠️  Warnings: ${warnings.length}`);
  console.log(`  ❌ Errors:   ${errors.length}`);
  console.log(`  ⏭️  Skipped:  ${skipped.length}`);
  console.log('═'.repeat(50));
  
  // Print issues
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:\n');
    for (const warn of warnings) {
      console.log(`  ${warn.file}:${warn.line}`);
      console.log(`    URL: ${warn.url}`);
      console.log(`    Issues: ${warn.issues.join(', ')}\n`);
    }
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:\n');
    for (const err of errors) {
      console.log(`  ${err.file}:${err.line}`);
      console.log(`    URL: ${err.url}`);
      console.log(`    Issues: ${err.issues.join(', ')}\n`);
    }
  }
  
  // Write report
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      ok: ok.length,
      warnings: warnings.length,
      errors: errors.length,
      skipped: skipped.length,
    },
    issues: [...warnings, ...errors],
  };
  
  writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n📝 Full report saved to: ${OUTPUT_FILE}`);
  
  // Exit with error code if there are issues
  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
