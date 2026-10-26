// @vitest-environment jsdom
/**
 * Lock: every code-block landmark on a page has a unique name (axe
 * `landmark-unique`).
 *
 * The bug: the labeller numbered `figure.shiki` per mutated subtree, so every
 * block mounted on the client (the engine tabs' DynamicCodeBlocks) restarted at
 * "Code example 1" and collided with the server-rendered blocks. The rule-page
 * a11y scan failed on PR #1299 with three duplicate pairs.
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import { CodeBlockLabeller } from '@/components/a11y/code-block-labeller';

const block = () =>
  '<figure class="shiki"><div role="region" tabindex="0"><pre><code>x</code></pre></div></figure>';

const labels = (selector: string) =>
  [...document.querySelectorAll(selector)].map((el) =>
    el.getAttribute('aria-label'),
  );

describe('CodeBlockLabeller', () => {
  it('numbers blocks mounted later document-wide, never restarting at 1', async () => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    document.body.innerHTML = `<main>${block()}${block()}</main><div id="host"></div>`;
    const root = createRoot(document.getElementById('host')!);
    await act(async () => root.render(<CodeBlockLabeller />));

    // A client-rendered tab panel mounts two more blocks.
    const panel = document.createElement('div');
    panel.innerHTML = block() + block();
    await act(async () => {
      document.querySelector('main')!.append(panel);
      await new Promise((r) => setTimeout(r, 0)); // flush the MutationObserver
    });

    const figures = labels('figure.shiki');
    const regions = labels('div[role="region"]');
    expect(figures).toEqual([
      'Code example 1',
      'Code example 2',
      'Code example 3',
      'Code example 4',
    ]);
    expect(new Set(regions).size).toBe(4);
    await act(async () => root.unmount());
  });

  it('leaves a label it did not set alone', async () => {
    document.body.innerHTML = `<figure class="shiki" aria-label="Install"><div role="region"></div></figure><div id="host"></div>`;
    const root = createRoot(document.getElementById('host')!);
    await act(async () => root.render(<CodeBlockLabeller />));
    expect(labels('figure.shiki')).toEqual(['Install']);
    await act(async () => root.unmount());
  });
});
