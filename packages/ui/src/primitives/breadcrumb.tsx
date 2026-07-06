// Breadcrumb — server-rendered, semantically-tagged trail of ancestor links.
// Compositional API (Breadcrumb / BreadcrumbList / BreadcrumbItem /
// BreadcrumbLink / BreadcrumbSeparator / BreadcrumbPage / BreadcrumbEllipsis)
// mirrors the shadcn surface so consumers swap drop-in. BreadcrumbLink keeps a
// server-safe `asChild` seam (React.cloneElement, NOT Base UI useRender) so the
// whole tree stays an RSC — composes with `next/link` without forcing a client
// boundary. MIN_VIEWPORT=480 because long trails overflow on <480 phones; below
// it, consumers should collapse with BreadcrumbEllipsis.

/**
 * @interlace/ui — Breadcrumb
 *
 * Anatomy:
 *   Breadcrumb (nav[aria-label="breadcrumb"], data-min-viewport)
 *     └─ BreadcrumbList (ol)
 *         ├─ BreadcrumbItem (li)
 *         │   └─ BreadcrumbLink (a, or asChild = cloned child)
 *         ├─ BreadcrumbSeparator (li[role="presentation"] · ChevronRight)
 *         ├─ BreadcrumbItem
 *         │   └─ BreadcrumbPage (span[aria-current="page"])
 *         └─ BreadcrumbEllipsis (span · MoreHorizontal + sr-only "More")
 *
 * | Rule | Concept                          | Where in this file                                   |
 * | ---- | -------------------------------- | ---------------------------------------------------- |
 * | R4   | Extends native els               | Every part extends `React.ComponentProps<'…'>`       |
 * | R6   | data-slot on every part          | data-slot="breadcrumb" / "-list" / "-item" / …       |
 * | R7   | className merged + ...rest       | `cn(BASE, className)` + `{...props}` on every part   |
 * | R10  | Composition seam                 | BreadcrumbLink accepts `asChild` (server-safe slot)  |
 * | R13  | Ecosystem first                  | Lucide icons (ChevronRight / MoreHorizontal)         |
 * | R18  | Tailwind only                    | Zero inline style                                    |
 * | R19  | Tokens only                      | gap-xs / text-ui-sm / text-muted-foreground / size-4 |
 * | R20  | AA contrast                      | foreground vs muted-foreground; AA-cleared tokens    |
 * | R25  | Server component                 | No hooks → no 'use client'                           |
 * | R26  | A11y from native els             | `nav` + ordered list + `aria-current` + role         |
 *
 * MIN_VIEWPORT=480 rationale: a 3-segment trail with 24-32ch labels collapses
 * onto the next line under ~480px. Below that, the consumer is expected to
 * either truncate via `lineClamp` on the link text or collapse with
 * `<BreadcrumbEllipsis />` between the first and last items.
 */

import * as React from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '../lib/cn.js';

/** Minimum viable viewport width (px). Exposed so consumers can mirror it. */
export const MIN_VIEWPORT = 480;

// ─────────────────────────────────────────────────────────────────
// Breadcrumb (root <nav>)
// ─────────────────────────────────────────────────────────────────
interface BreadcrumbProps extends React.ComponentProps<'nav'> {}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        aria-label="breadcrumb"
        data-slot="breadcrumb"
        data-min-viewport={String(MIN_VIEWPORT)}
        className={cn(className)}
        {...props}
      />
    );
  },
);
Breadcrumb.displayName = 'Breadcrumb';

// ─────────────────────────────────────────────────────────────────
// BreadcrumbList (<ol>)
// ─────────────────────────────────────────────────────────────────
interface BreadcrumbListProps extends React.ComponentProps<'ol'> {}

const BreadcrumbList = React.forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ className, ...props }, ref) => {
    return (
      <ol
        ref={ref}
        data-slot="breadcrumb-list"
        className={cn(
          'text-muted-foreground flex flex-wrap items-center gap-xs text-ui-sm break-words',
          className,
        )}
        {...props}
      />
    );
  },
);
BreadcrumbList.displayName = 'BreadcrumbList';

// ─────────────────────────────────────────────────────────────────
// BreadcrumbItem (<li>)
// ─────────────────────────────────────────────────────────────────
interface BreadcrumbItemProps extends React.ComponentProps<'li'> {}

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, ...props }, ref) => {
    return (
      <li
        ref={ref}
        data-slot="breadcrumb-item"
        className={cn('inline-flex items-center gap-1', className)}
        {...props}
      />
    );
  },
);
BreadcrumbItem.displayName = 'BreadcrumbItem';

// ─────────────────────────────────────────────────────────────────
// BreadcrumbLink (<a>, or cloned child when asChild)
// ─────────────────────────────────────────────────────────────────
type BreadcrumbLinkProps = React.ComponentProps<'a'> & {
  /**
   * Render as the passed child element (e.g. `<Link href="…">`) — useful when
   * composing with a routing primitive. Server-safe slot: we `cloneElement`
   * the single React element child and merge our data-slot + className onto
   * it. NOT Base UI useRender (which would flip this tree to client).
   */
  asChild?: boolean;
};

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ asChild, className, children, ...props }, ref) => {
    const baseClass = cn('hover:text-foreground transition-colors', className);

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        className?: string;
      }>;
      return React.cloneElement(child, {
        ...props,
        ...child.props,
        ref,
        'data-slot': 'breadcrumb-link',
        className: cn(baseClass, child.props.className),
      } as React.HTMLAttributes<HTMLElement>);
    }

    return (
      // href is supplied by the consumer via {...props} (this primitive is
      // a bare navigable link); the rule can't see through the spread.
      // eslint-disable-next-line react-a11y/anchor-is-valid
      <a ref={ref} data-slot="breadcrumb-link" className={baseClass} {...props}>
        {children}
      </a>
    );
  },
);
BreadcrumbLink.displayName = 'BreadcrumbLink';

// ─────────────────────────────────────────────────────────────────
// BreadcrumbPage (<span aria-current="page">) — the current node.
// ─────────────────────────────────────────────────────────────────
interface BreadcrumbPageProps extends React.ComponentProps<'span'> {}

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, BreadcrumbPageProps>(
  ({ className, ...props }, ref) => {
    return (
      // No role="link" — the WAI-ARIA APG breadcrumb pattern treats the
      // current page as plain text, not a disabled link (ARIA doesn't
      // define a real "disabled link" semantic; aria-current="page" is
      // the correct and sufficient signal here).
      <span
        ref={ref}
        aria-current="page"
        data-slot="breadcrumb-page"
        className={cn('text-foreground font-medium', className)}
        {...props}
      />
    );
  },
);
BreadcrumbPage.displayName = 'BreadcrumbPage';

// ─────────────────────────────────────────────────────────────────
// BreadcrumbSeparator (<li role="presentation">) — decorative chevron.
// ─────────────────────────────────────────────────────────────────
interface BreadcrumbSeparatorProps extends React.ComponentProps<'li'> {}

const BreadcrumbSeparator = React.forwardRef<
  HTMLLIElement,
  BreadcrumbSeparatorProps
>(({ className, children, ...props }, ref) => {
  return (
    <li
      ref={ref}
      role="presentation"
      aria-hidden="true"
      data-slot="breadcrumb-separator"
      className={cn(
        'text-muted-foreground inline-flex items-center [&>svg]:size-4',
        className,
      )}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
});
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

// ─────────────────────────────────────────────────────────────────
// BreadcrumbEllipsis (<span>) — collapsed-trail marker.
// ─────────────────────────────────────────────────────────────────
interface BreadcrumbEllipsisProps extends React.ComponentProps<'span'> {}

const BreadcrumbEllipsis = React.forwardRef<
  HTMLSpanElement,
  BreadcrumbEllipsisProps
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      role="presentation"
      aria-hidden="true"
      data-slot="breadcrumb-ellipsis"
      className={cn(
        'text-muted-foreground inline-flex size-4 items-center justify-center',
        className,
      )}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>
    </span>
  );
});
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
export type {
  BreadcrumbProps,
  BreadcrumbListProps,
  BreadcrumbItemProps,
  BreadcrumbLinkProps,
  BreadcrumbPageProps,
  BreadcrumbSeparatorProps,
  BreadcrumbEllipsisProps,
};
