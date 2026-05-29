'use client';

import { useState } from 'react';

/**
 * Collapsible source viewer for a primitive's full TSX content.
 *
 * Starts collapsed (preview the first ~20 lines) to keep the page scrollable;
 * "Show full source" reveals everything inline. A "Copy" button on the
 * preview header copies the entire file to the clipboard. The "View on
 * GitHub" link is a hard alternative for users who want the rendered/blamed
 * version.
 */
type Props = {
  source: string;
  githubUrl: string;
};

const PREVIEW_LINES = 20;

export function SourceViewer({ source, githubUrl }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const lines = source.split('\n');
  const visible = expanded ? lines : lines.slice(0, PREVIEW_LINES);
  const total = lines.length;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable (non-secure contexts) — gracefully no-op.
    }
  };

  return (
    <div className="border-border bg-card mt-4 overflow-hidden rounded-lg border">
      <div className="border-border bg-background/60 flex items-center justify-between border-b px-4 py-2">
        <span className="text-muted-foreground font-mono text-xs">
          {total} lines · TypeScript
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCopy}
            className="text-muted-foreground hover:text-foreground font-mono text-xs transition-colors"
          >
            {copied ? '✓ copied' : 'copy'}
          </button>
          <a
            href={githubUrl}
            className="text-muted-foreground hover:text-foreground font-mono text-xs transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            github ↗
          </a>
        </div>
      </div>
      <pre className="overflow-x-auto px-4 py-3">
        <code className="font-mono text-xs leading-relaxed">
          {visible.join('\n')}
          {!expanded && total > PREVIEW_LINES ? (
            <span className="text-muted-foreground">
              {'\n\n…' + (total - PREVIEW_LINES) + ' more lines…'}
            </span>
          ) : null}
        </code>
      </pre>
      {total > PREVIEW_LINES ? (
        <div className="border-border bg-background/60 border-t px-4 py-2 text-center">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground font-mono text-xs transition-colors"
          >
            {expanded ? '← collapse' : `Show full source (${total} lines) →`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
