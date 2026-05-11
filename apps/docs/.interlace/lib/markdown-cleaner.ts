/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Markdown cleaning helpers for content fetched from GitHub.
 *
 * GitHub READMEs are written for GitHub's renderer — they're full of badge
 * images, `<p align="center">` blocks, and other patterns that don't render
 * well in MDX. These helpers normalize the markdown before compilation.
 */

/**
 * Strip shield/badge image links — `[![alt](image)](link)` and `![badge](url)`.
 * Removes them entirely; consumers add their own status badges if needed.
 */
export function stripBadges(markdown: string): string {
  return markdown
    .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '')
    .replace(/!\[.*?badge.*?\]\(.*?\)/gi, '');
}

/**
 * Convert `<p align="...">` to `<div align="...">`.
 *
 * Why: <p> can't legally contain block elements. GitHub's renderer is forgiving;
 * MDX's stricter HTML transform throws nesting errors when a `<p>` contains
 * `<img>` or `<a>` blocks. Converting to `<div>` keeps the alignment without
 * the invalid nesting.
 */
export function normalizeAlignDivs(markdown: string): string {
  return markdown.replace(/<p(\s+align="[^"]*")>([\s\S]*?)<\/p>/gi, '<div$1>$2</div>');
}

/**
 * Collapse 3+ consecutive newlines down to 2.
 */
export function collapseBlankLines(markdown: string): string {
  return markdown.replace(/\n{3,}/g, '\n\n');
}

/**
 * Strip leading whitespace/blank lines from the start of the document.
 */
export function trimLeadingWhitespace(markdown: string): string {
  return markdown.replace(/^\s*\n+/, '');
}

/**
 * Apply the standard cleaning pipeline.
 *
 * Order matters: align-divs must run before badge-stripping (badges sometimes
 * appear inside `<p align>` blocks); blank-line collapse runs last so newlines
 * introduced by stripping don't pile up.
 */
export function cleanRemoteMarkdown(markdown: string): string {
  let cleaned = normalizeAlignDivs(markdown);
  cleaned = stripBadges(cleaned);
  cleaned = trimLeadingWhitespace(cleaned);
  cleaned = collapseBlankLines(cleaned);
  return cleaned;
}

/**
 * Extract the introduction section — content between the H1 and the first H2.
 * Returns `''` if no intro is found.
 */
export function extractIntroduction(markdown: string): string {
  const lines = markdown.split('\n');
  let foundHeader = false;
  const intro: string[] = [];

  for (const line of lines) {
    if (line.startsWith('[![')) continue;
    if (line.startsWith('# ')) {
      foundHeader = true;
      continue;
    }
    if (line.startsWith('## ') && foundHeader) break;
    if (foundHeader) intro.push(line);
  }

  return intro.join('\n').trim();
}

/**
 * Extract a "Why this …?" / "Motivation" section.
 * Returns `''` if no matching section header exists.
 */
export function extractWhySection(markdown: string): string {
  const patterns = [
    /## .*?Why .*?\n\n([\s\S]*?)(?=\n## )/i,
    /## .*?Motivation\n\n([\s\S]*?)(?=\n## )/i,
  ];
  for (const re of patterns) {
    const match = re.exec(markdown);
    if (match) return match[1].trim();
  }
  return '';
}
