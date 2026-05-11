/**
 * RemoteReadme — fetches a plugin's README.md from GitHub and renders it
 * inline. Thin wrapper over @interlace/ui/fumadocs/remote-markdown that wires
 * in the app's MDX compiler + section filtering specific to this repo's
 * README convention.
 */

import { RemoteMarkdown } from '@interlace/ui/fumadocs/remote-markdown';
import { compileRemoteMDX } from '@/lib/mdx-compiler';

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/ofri-peretz/eslint/main/packages';

interface RemoteReadmeProps {
  /** Plugin slug (e.g., 'import-next', 'browser-security') */
  plugin: string;
  /** Optional: Show only specific sections */
  sections?: ('introduction' | 'installation' | 'why' | 'full')[];
}

function extractIntroduction(markdown: string): string {
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

function extractWhySection(markdown: string): string {
  const patterns = [
    /## 🎯 Why This Plugin\?\n\n([\s\S]*?)(?=\n## )/,
    /## Why .*?\n\n([\s\S]*?)(?=\n## )/,
    /## Motivation\n\n([\s\S]*?)(?=\n## )/,
  ];
  for (const pattern of patterns) {
    const match = markdown.match(pattern);
    if (match) return match[1].trim();
  }
  return '';
}

function cleanMarkdown(markdown: string): string {
  // Strip badge-only artefacts from the prelude (above the first `## ` heading)
  // so the centered logo + tagline render cleanly. Tables in body sections —
  // Compatibility, Supported Libraries, Related Plugins — legitimately use
  // shields.io badges in cells and must be preserved.
  const firstHeadingIdx = markdown.search(/^## /m);
  const split = firstHeadingIdx === -1 ? markdown.length : firstHeadingIdx;
  const prelude = markdown.slice(0, split);
  const body = markdown.slice(split);

  const cleanedPrelude = prelude
    .replace(/<p(\s+align="[^"]*")>([\s\S]*?)<\/p>/gi, '<div$1>$2</div>')
    .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '')
    .replace(/!\[[^\]]*\]\([^)]*shields\.io[^)]*\)/gi, '');

  return (cleanedPrelude + body)
    .replace(/^\s*\n+/, '')
    .replace(/\n{3,}/g, '\n\n');
}

export async function RemoteReadme({
  plugin,
  sections = ['full'],
}: RemoteReadmeProps) {
  const url = `${GITHUB_RAW_BASE}/eslint-plugin-${plugin}/README.md`;

  const fallback = (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
      <p className="text-sm text-amber-600 dark:text-amber-400">
        Unable to load README from GitHub. Please check the{' '}
        <a
          data-testid="remote-readme-fallback-link"
          href={`https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-${plugin}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          source repository
        </a>
        .
      </p>
    </div>
  );

  return (
    <RemoteMarkdown
      url={url}
      revalidate={3600}
      fallback={fallback}
      className="remote-readme"
      source={{
        variant: 'readme',
        label: `eslint-plugin-${plugin}/README.md`,
        sourceUrl: `https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-${plugin}/README.md`,
        cacheWindowLabel: '1 hour',
      }}
      preprocess={(source) => {
        let body = source;
        if (sections.includes('introduction') && !sections.includes('full')) {
          body = extractIntroduction(body);
        } else if (sections.includes('why') && !sections.includes('full')) {
          body = extractWhySection(body) || extractIntroduction(body);
        }
        return cleanMarkdown(body);
      }}
      compile={(source) => compileRemoteMDX(source, { pluginName: plugin })}
    />
  );
}

export default RemoteReadme;
