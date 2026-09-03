/**
 * BreadcrumbPage a11y lock.
 *
 * Per CLAUDE.md ("Regressions are the issue. Lock everything you fix."):
 * `role="link" aria-disabled="true"` on a `<span>` faked a disabled link —
 * not a pattern ARIA actually defines (aria-disabled has no effect on the
 * synthetic "link" role for assistive tech). The WAI-ARIA APG breadcrumb
 * pattern treats the current page as plain text with `aria-current="page"`,
 * nothing more. This pins that fix so a future refactor can't silently
 * re-introduce the unsupported role/aria-disabled combination.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BreadcrumbPage } from '../../../../packages/ui/src/primitives/breadcrumb';

describe('BreadcrumbPage a11y (WAI-ARIA APG breadcrumb pattern)', () => {
  it('has aria-current="page" and no role or aria-disabled', () => {
    const html = renderToStaticMarkup(<BreadcrumbPage>Docs</BreadcrumbPage>);

    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain('role=');
    expect(html).not.toContain('aria-disabled');
  });
});
