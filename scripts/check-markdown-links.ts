#!/usr/bin/env tsx
/**
 * Markdown Link Validator
 * 
 * Checks all markdown files for broken links (relative, absolute, GitHub, anchors)
 * 
 * Usage:
 *   npx tsx scripts/check-markdown-links.ts
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { execSync } from 'node:child_process';

interface LinkIssue {
  file: string;
  line: number;
  link: string;
  type: 'broken' | 'invalid-format' | 'warning';
  message: string;
}

const issues: LinkIssue[] = [];
const checkedFiles = new Set<string>();

// Get all markdown files (excluding cache and node_modules)
function getMarkdownFiles(rootDir = '.'): string[] {
  try {
    const result = execSync(
      `find ${rootDir} -name "*.md" -type f ! -path "*/node_modules/*" ! -path "*/.turbo/*" ! -path "*/dist/*" ! -path "*/.git/*" ! -path "*/coverage/*" ! -path "*/.next/*" ! -path "*/.source/*" ! -path "*/test-results/*" ! -path "*/playwright-report/*" ! -path "*/build/*" ! -path "*/.gemini/*" ! -path "*/.cursor/*"`,
      { encoding: 'utf-8' }
    );
    return result
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(f => f.startsWith('./') ? f.slice(2) : f);
  } catch {
    return [];
  }
}

// Extract all links from markdown content
function extractLinks(content: string): Array<{ text: string; url: string; line: number }> {
  const links: Array<{ text: string; url: string; line: number }> = [];
  const lines = content.split('\n');

  // Match markdown links: [text](url) or [text](url "title")
  // Also matches CommonMark `[text](<url with (parens)>)` autolink form by
  // greedily consuming everything between the matching angle brackets.
  const linkRegex = /\[([^\]]+)\]\(<([^>]+)>\)|\[([^\]]+)\]\(([^)]+)\)/g;
  // Inline code: `…` or ``…`` — strip before scanning the line so that
  // language samples like `obj[method](userInput)` aren't matched as links.
  const inlineCodeRegex = /`+[^`]*`+/g;

  let inFenced = false;
  lines.forEach((line, index) => {
    // Fenced code blocks ```…``` or ~~~…~~~: skip every line between fences
    // (including the fence markers themselves). Toggling on a line that
    // contains only the fence keeps the rest of the file scannable.
    if (/^[ \t]{0,3}(```|~~~)/.test(line)) {
      inFenced = !inFenced;
      return;
    }
    if (inFenced) return;
    // Indented code blocks: 4+ spaces or a tab at line start, on a line that
    // is not a list-item continuation, are code per CommonMark.
    if (/^(    |\t)/.test(line)) return;

    const scannable = line.replace(inlineCodeRegex, '');

    let match;
    while ((match = linkRegex.exec(scannable)) !== null) {
      // First alternation: <…> form (text in 1, url in 2). Second: bare
      // form (text in 3, url in 4 — strip optional title).
      const text = match[1] ?? match[3];
      const rawUrl = match[2] ?? match[4];
      if (!rawUrl) continue;
      const url = match[2] !== undefined
        ? rawUrl
        : rawUrl.split(' ')[0]!.replace(/^"|"$/g, '');
      links.push({ text: text!, url, line: index + 1 });
    }
  });

  return links;
}

// Check if a file exists (for relative links)
function fileExists(filePath: string, baseDir: string): boolean {
  const fullPath = resolve(baseDir, filePath);
  return existsSync(fullPath) && statSync(fullPath).isFile();
}

// Check if a directory exists
function dirExists(dirPath: string, baseDir: string): boolean {
  const fullPath = resolve(baseDir, dirPath);
  return existsSync(fullPath) && statSync(fullPath).isDirectory();
}

// Validate GitHub links
function validateGitHubLink(url: string): { valid: boolean; message?: string } {
  if (!url.startsWith('https://github.com/')) {
    return { valid: true };
  }

  const parts = url.replace('https://github.com/', '').split('/').filter(Boolean);
  
  // Valid GitHub link patterns:
  // - https://github.com/owner/repo (repo homepage)
  // - https://github.com/owner/repo/issues
  // - https://github.com/owner/repo/discussions
  // - https://github.com/owner/repo/commit/SHA
  // - https://github.com/owner/repo/blob/branch/path
  // - https://github.com/owner/repo/actions/workflows/... (badges)
  // - https://github.com/owner (user profile)
  
  if (parts.length === 1) {
    // User profile - valid
    return { valid: true };
  }
  
  if (parts.length === 2) {
    // Repo homepage - valid
    return { valid: true };
  }
  
  // Check for blob/tree links (need branch)
  if (parts[2] === 'blob' || parts[2] === 'tree') {
    if (parts.length < 5) {
      return { valid: false, message: 'GitHub blob/tree link missing branch or path' };
    }
    // Check for common issues
    if (url.includes('/blob/docs/') || url.includes('/blob/../')) {
      return { valid: false, message: 'GitHub link missing branch name (should be /blob/main/)' };
    }
    return { valid: true };
  }
  
  // Other GitHub links (issues, discussions, commit, actions, etc.) - assume valid
  return { valid: true };
}

// Validate anchor links
function validateAnchorLink(url: string, fileContent: string): { valid: boolean; message?: string } {
  if (!url.startsWith('#')) return { valid: true };

  const anchor = url.slice(1);
  
  // Use string search instead of regex for safety (prevents ReDoS)
  const lines = fileContent.split('\n');
  const anchorLower = anchor.toLowerCase();
  
  // Check for heading with this anchor. Markdown renderers vary in their
  // slug algorithm; we accept any of three common forms so writers can use
  // either style without breaking the check:
  //   - Collapsed: spaces and non-word chars all collapse to a single dash
  //     (`Foo & Bar` → `foo-bar`)
  //   - GitHub-style: non-word chars are stripped, then every space becomes
  //     a single dash — so `Foo — Bar` (em-dash) → `foo--bar` (double dash
  //     because the em-dash dropped between two spaces). This is the slug
  //     GitHub's rendered Markdown uses.
  //   - Raw heading text (lowercased) for old/loose anchors
  const hasHeading = lines.some(line => {
    const match = line.match(/^#{1,6}\s+(.+)$/);
    if (!match) return false;
    const lower = match[1].toLowerCase();
    const collapsedSlug = lower
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    const githubSlug = lower
      .replace(/[^\w -]/g, '')
      .replace(/ /g, '-');
    return (
      collapsedSlug.includes(anchorLower) ||
      githubSlug.includes(anchorLower) ||
      lower.includes(anchorLower)
    );
  });
  
  // Check for HTML anchors using simple string checks
  const hasHtmlAnchor = fileContent.includes(`id="${anchor}"`) ||
    fileContent.includes(`id='${anchor}'`);
  
  if (!hasHeading && !hasHtmlAnchor) {
    return { valid: false, message: `Anchor #${anchor} not found in file` };
  }
  return { valid: true };
}

// Validate a link
function validateLink(
  link: { text: string; url: string; line: number },
  filePath: string,
  fileContent: string
): void {
  const { url } = link;
  const baseDir = dirname(filePath);

  // Skip empty or special links
  if (!url || url.startsWith('mailto:') || url.startsWith('tel:')) {
    return;
  }
  // Skip `file://` URIs — they're absolute paths on the author's machine,
  // not portable repo references; treating them as relative resolves to
  // a nonsense `dirname(file)/file:/...` path. Leave them as-is and trust
  // they were intentional (e.g. local-only orchestrator wiring).
  if (url.startsWith('file:')) {
    return;
  }
  // Skip template-placeholder anchors used by article / audit templates
  // (`[Article Title](link)`, `[CWE-XXX](link)`). The literal "link" is not
  // a path or URL by any reasonable interpretation, and templates
  // intentionally ship with it as a fill-in marker.
  if (url === 'link' || url === 'url' || url === 'href') {
    return;
  }

  // External links (http/https)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Parse the URL and compare the hostname exactly, not via substring match.
    // The previous `url.includes('github.com')` matched `evil-github.com`
    // and `github.com.attacker.com` (CodeQL: `js/incomplete-url-substring-sanitization`).
    let host = '';
    try { host = new URL(url).hostname.toLowerCase(); } catch { /* malformed URL */ }
    if (host === 'github.com' || host.endsWith('.github.com')) {
      const result = validateGitHubLink(url);
      if (!result.valid) {
        issues.push({
          file: filePath,
          line: link.line,
          link: url,
          type: 'broken',
          message: result.message || 'Invalid GitHub link format',
        });
      }
    }
    // Other external links - just check format
    return;
  }

  // Anchor links
  if (url.startsWith('#')) {
    const result = validateAnchorLink(url, fileContent);
    if (!result.valid) {
      issues.push({
        file: filePath,
        line: link.line,
        link: url,
        type: 'broken',
        message: result.message || 'Anchor not found',
      });
    }
    return;
  }

  // Relative file links
  // Remove anchor if present
  const [filePart, anchor] = url.split('#');
  // Decode URL-encoded path components (e.g. `%28home%29` → `(home)` for
  // Next.js route-group directories). Without this, links to files inside
  // parenthesized directories show "File not found" even though the file
  // exists on disk — links must use %28/%29 to round-trip through markdown
  // renderers that treat raw `(`/`)` as link-syntax delimiters.
  let targetPath: string;
  try {
    targetPath = decodeURIComponent(filePart);
  } catch {
    targetPath = filePart;
  }

  // Handle different relative path patterns
  let resolvedPath: string;
  if (targetPath.startsWith('./')) {
    resolvedPath = join(baseDir, targetPath);
  } else if (targetPath.startsWith('../')) {
    resolvedPath = resolve(baseDir, targetPath);
  } else if (targetPath.startsWith('/')) {
    // Absolute from repo root
    resolvedPath = resolve('.', targetPath.slice(1));
  } else {
    // Relative to current file
    resolvedPath = join(baseDir, targetPath);
  }

  // Normalize path
  resolvedPath = resolve(resolvedPath);

  if (!fileExists(resolvedPath, '.') && !dirExists(resolvedPath, '.')) {
    // Check if it's a markdown file without extension
    const withMd = resolvedPath + '.md';
    if (!fileExists(withMd, '.')) {
      issues.push({
        file: filePath,
        line: link.line,
        link: url,
        type: 'broken',
        message: `File not found: ${relative('.', resolvedPath)}`,
      });
    }
  }

  // If anchor is present, validate it in the target file
  if (anchor && (fileExists(resolvedPath, '.') || fileExists(resolvedPath + '.md', '.'))) {
    const targetFile = fileExists(resolvedPath, '.') ? resolvedPath : resolvedPath + '.md';
    try {
      const targetContent = readFileSync(targetFile, 'utf-8');
      const anchorResult = validateAnchorLink('#' + anchor, targetContent);
      if (!anchorResult.valid) {
        issues.push({
          file: filePath,
          line: link.line,
          link: url,
          type: 'broken',
          message: `Anchor #${anchor} not found in ${relative('.', targetFile)}`,
        });
      }
    } catch {
      // File exists but couldn't read - that's okay, just skip anchor check
    }
  }
}

// Main function
function main() {
  console.log('🔍 Checking markdown links...\n');

  const markdownFiles = getMarkdownFiles('.');
  console.log(`📄 Found ${markdownFiles.length} markdown files\n`);

  for (const filePath of markdownFiles) {
    if (checkedFiles.has(filePath)) continue;
    checkedFiles.add(filePath);

    try {
      const content = readFileSync(filePath, 'utf-8');
      const links = extractLinks(content);

      for (const link of links) {
        validateLink(link, filePath, content);
      }
    } catch (error) {
      issues.push({
        file: filePath,
        line: 0,
        link: '',
        type: 'broken',
        message: `Could not read file: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  // Report results
  if (issues.length === 0) {
    console.log('✅ All links are valid!\n');
    process.exit(0);
  }

  console.log(`❌ Found ${issues.length} link issue(s):\n`);

  // Group by file
  const byFile = new Map<string, LinkIssue[]>();
  for (const issue of issues) {
    if (!byFile.has(issue.file)) {
      byFile.set(issue.file, []);
    }
    byFile.get(issue.file)!.push(issue);
  }

  for (const [file, fileIssues] of byFile.entries()) {
    console.log(`📄 ${file}`);
    for (const issue of fileIssues) {
      const icon = issue.type === 'broken' ? '❌' : '⚠️';
      console.log(`  ${icon} Line ${issue.line}: ${issue.link}`);
      console.log(`     ${issue.message}`);
    }
    console.log('');
  }

  console.log(`\n💡 Fix these issues before publishing.`);
  process.exit(1);
}

main();

