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

    const label = (root: ParentNode) => {
      const figures = root.querySelectorAll<HTMLElement>('figure.shiki');
      figures.forEach((fig, idx) => {
        const ordinal = idx + 1;
        if (!fig.hasAttribute('aria-label')) {
          fig.setAttribute('aria-label', `Code example ${ordinal}`);
        }
        // The inner scrollable region is its own ARIA landmark — also needs a
        // unique name. We pair it with the figure ordinal so screen-reader
        // users get a sensible "viewport for code example N" affordance.
        const region = fig.querySelector<HTMLElement>(
          'div[role="region"]:not([aria-label])',
        );
        if (region) {
          region.setAttribute(
            'aria-label',
            `Scrollable viewport, code example ${ordinal}`,
          );
        }
      });
    };

    label(document);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const el = node as HTMLElement;
          if (el.matches?.('figure.shiki')) label(el.parentNode ?? document);
          else if (el.querySelector?.('figure.shiki')) label(el);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
