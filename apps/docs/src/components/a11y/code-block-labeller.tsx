'use client';

import { useEffect } from 'react';

/**
 * Adds unique `aria-label` to every fumadocs code block, satisfying axe
 * `landmark-unique`.
 *
 * Fumadocs renders code blocks as nested ARIA landmarks:
 *   <figure class="shiki" tabindex="-1">          ← interpreted as landmark
 *     <div role="region" tabindex="0">            ← also a landmark
 *       <pre><code>...</code></pre>
 *     </div>
 *   </figure>
 *
 * Both need unique labels when a page has multiple code blocks (rule docs
 * with examples, getting-started with install snippets, etc.) so a screen
 * reader user navigating by landmark can tell them apart.
 *
 * Mounted once at root. Runs initially + observes subsequent DOM mutations
 * (route transitions, MDX hydration, Twoslash).
 */
export function CodeBlockLabeller() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Ordinals are document-wide. Numbering per mutated subtree (the old
    // `label(el)`) restarted at 1 for every client-rendered block — the engine
    // tabs' DynamicCodeBlocks — and collided with the static blocks' labels.
    // Labels this component set are rewritten on each pass (`data-cbl`), so a
    // block mounted mid-page renumbers the ones after it; labels set by anyone
    // else are left alone.
    const label = () => {
      const figures = document.querySelectorAll<HTMLElement>('figure.shiki');
      figures.forEach((fig, idx) => {
        const ordinal = idx + 1;
        if (!fig.hasAttribute('aria-label') || fig.dataset.cbl !== undefined) {
          fig.setAttribute('aria-label', `Code example ${ordinal}`);
          fig.dataset.cbl = '';
        }
        // The inner scrollable region is its own ARIA landmark — also needs a
        // unique name. We pair it with the figure ordinal so screen-reader
        // users get a sensible "viewport for code example N" affordance.
        const region = fig.querySelector<HTMLElement>('div[role="region"]');
        if (
          region &&
          (!region.hasAttribute('aria-label') ||
            region.dataset.cbl !== undefined)
        ) {
          region.setAttribute(
            'aria-label',
            `Scrollable viewport, code example ${ordinal}`,
          );
          region.dataset.cbl = '';
        }
      });
    };

    label();

    const observer = new MutationObserver((mutations) => {
      const added = mutations.some((m) =>
        Array.from(m.addedNodes).some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE &&
            ((node as HTMLElement).matches?.('figure.shiki') ||
              (node as HTMLElement).querySelector?.('figure.shiki')),
        ),
      );
      if (added) label();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
