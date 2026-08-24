import type { ReactNode } from 'react';

/**
 * Render the inline markdown that changelog entries actually contain.
 *
 * Entry titles come straight from changeset prose, and that prose is written
 * as markdown: of 1537 entries in the corpus, 857 contain `inline code`, 263 a
 * `[link](url)`, and 108 `**bold**`. Rendered as plain text, more than half
 * the page shows a reader raw backticks and bracket syntax — on the one page
 * whose entire job is to be readable.
 *
 * This is deliberately not a markdown parser. It handles the three constructs
 * that appear and treats everything else as literal text, which is both the
 * whole requirement and the reason it can be trusted: there is no HTML
 * anywhere in the pipeline, only React elements, so nothing here can inject
 * markup even though the input is repo-controlled.
 *
 * Links are restricted to `http(s):` — a `javascript:` URL in a changeset
 * would otherwise become a live anchor, and "our own content is trustworthy"
 * is exactly the assumption that stops being true the moment someone accepts
 * an outside contribution.
 */

const INLINE =
  /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

export function InlineMarkdown({ text }: { text: string }): ReactNode {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;

  // `matchAll` over a fresh regex each call: INLINE is module-level and has
  // the `g` flag, so sharing `lastIndex` across calls would drop matches.
  for (const match of text.matchAll(new RegExp(INLINE.source, 'g'))) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));

    const [raw, code, bold, linkText, href] = match;

    if (code !== undefined) {
      nodes.push(
        <code
          key={key++}
          className="bg-muted text-foreground rounded px-1 py-0.5 font-mono text-[0.9em]"
        >
          {code}
        </code>,
      );
    } else if (bold !== undefined) {
      nodes.push(
        <strong key={key++} className="text-foreground font-semibold">
          {bold}
        </strong>,
      );
    } else if (linkText !== undefined && href !== undefined) {
      nodes.push(
        <a
          key={key++}
          href={href}
          className="text-primary hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          {linkText}
        </a>,
      );
    } else {
      nodes.push(raw);
    }

    last = index + raw.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
