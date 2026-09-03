/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
// Per-page "Edit on GitHub" pencil link.
// Industry-canon affordance (Stripe, Tailwind, fumadocs starter all ship it).
// Aligned with UX_PHILOSOPHY #2 (URL contract) and #4 (Momentum).
import * as React from 'react';
import { PencilIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface EditOnGitHubProps {
  /** Full URL to the source file on GitHub. */
  url: string;
  /** Override the default "Edit on GitHub" label. */
  label?: string;
  /** Class on the link element. */
  className?: string;
}

/**
 * Inline link inviting readers to fix the source. Renders as a small,
 * dimmed pencil-icon link that brightens on hover.
 *
 * @example
 * <EditOnGitHub url="https://github.com/owner/repo/edit/main/docs/foo.md" />
 */
export function EditOnGitHub({
  url,
  label = 'Edit on GitHub',
  className,
}: EditOnGitHubProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-slot="edit-on-github"
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors',
        className,
      )}
    >
      <PencilIcon className="size-3.5" aria-hidden />
      {label}
    </a>
  );
}
