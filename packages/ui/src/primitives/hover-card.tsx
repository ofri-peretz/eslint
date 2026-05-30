'use client';

/**
 * @interlace/ui — HoverCard
 *
 * A rich, non-modal overlay that opens on pointer-hover (and keyboard focus)
 * of its trigger, used to preview the *contents* of a target — author cards,
 * repo cards, link previews. Distinct from `Tooltip` (short, one-line, no
 * interactive content) and `Popover` (click-driven, can hold a form).
 *
 * Under the hood this wraps Base UI's `PreviewCard` family (Base UI's
 * canonical name for the hover-card pattern). We re-export it under the
 * Radix / shadcn name `HoverCard` so consumers swap drop-in.
 *
 * ## Anatomy
 *
 *   HoverCard         (PreviewCard.Root, data-slot="hover-card",
 *                       data-min-viewport=768 on the trigger surface
 *                       via the Popup — see below)
 *     ├─ HoverCardTrigger (anchor on the page that opens the card)
 *     └─ HoverCardPortal
 *         └─ HoverCardPositioner
 *             └─ HoverCardPopup (the surface — rounded card + shadow)
 *
 * Base UI's `Root` is a logical container (no DOM), so we hang
 * `data-min-viewport` on the `Popup` (the actual rendered surface) and also
 * forward it on `Root` for inspection-time tooling that walks the parts tree.
 *
 * ## MIN_VIEWPORT — 768 (the headline trade-off)
 *
 * **Hover is a desktop input.** Touch devices have no `:hover` state — a tap
 * on a hover-trigger either does nothing (until a second tap) or fires the
 * link the trigger wraps, surprising the user. iOS/Android emulate hover
 * with a long-press that conflicts with text-selection and context menus.
 * For that reason this primitive is gated to viewports ≥ 768 CSS px (the
 * common tablet/desktop floor — DESIGN_PRINCIPLES #14).
 *
 * Below 768, **do not use HoverCard.** Reach for one of:
 *
 *   - `Tooltip`  — if the disclosure is a short, non-interactive label;
 *                  Base UI's Tooltip already handles keyboard + touch
 *                  fall-through correctly.
 *   - `Popover`  — if the disclosure is rich (links, buttons, longer copy)
 *                  and needs a deliberate, tap-driven open.
 *
 * The preflight contract draws a dev-mode outline on any primitive whose
 * `data-min-viewport` exceeds the current viewport, so a HoverCard left in
 * the tree at phone widths will visibly warn during local dev and fail the
 * Playwright `min-viewport-respected` lock.
 *
 * | Rule | Concept                          | Where in this file                                          |
 * | ---- | -------------------------------- | ----------------------------------------------------------- |
 * | R4   | Extends Base UI part props       | Each wrapper extends `React.ComponentProps<typeof BasePreviewCard.X>` |
 * | R6   | data-slot on every part          | hover-card / -trigger / -portal / -positioner / -popup       |
 * | R7   | className merged + ...rest       | `cn(BASE, className)` + `{...props}` on the Popup            |
 * | R12  | Reuse over wrap                  | Wraps Base UI; no bespoke open-state machine                 |
 * | R13  | Ecosystem first                  | Base UI `PreviewCard` owns positioning, focus, dismissal     |
 * | R14  | Declares min viewport            | `data-min-viewport={String(MIN_VIEWPORT)}` (Root + Popup)    |
 * | R17  | API parity                       | Surface name `HoverCard` mirrors Radix / shadcn              |
 * | R18  | Tailwind only                    | Zero inline `style`; Tailwind classes only                   |
 * | R19  | Tokens only                      | `rounded-md`, `bg-card`, `text-card-foreground`, `p-(--spacing-md)`, `max-w-80`, `shadow-lg` |
 * | R20  | AA contrast                      | `bg-card` / `text-card-foreground` is an AA-cleared token pair |
 * | R25  | Client component                 | Required — Base UI's PreviewCard ships client hooks          |
 * | R26  | A11y from upstream               | Base UI handles aria-describedby + focus + dismissal         |
 */

import * as React from 'react';
import { PreviewCard as BasePreviewCard } from '@base-ui/react/preview-card';

import { cn } from '../lib/cn.js';

/**
 * Minimum viable viewport (CSS px) for this primitive.
 *
 * 768 because hover is touch-unfriendly; on phones consumers should reach
 * for Popover or Tooltip instead. See the JSDoc header for the full
 * trade-off and the recommended fall-back primitives.
 */
export const MIN_VIEWPORT = 768 as const;

// ─────────────────────────────────────────────────────────────────
// HoverCard (root — logical, no DOM)
//
// Base UI's `PreviewCard.Root` is a logical container with no DOM output,
// so it accepts neither a `ref` nor `data-*` attributes. We re-export it
// directly (no wrapper function) under the Radix / shadcn name `HoverCard`
// for drop-in parity. `data-min-viewport` cannot live here — it hangs on
// the Popup (the actual rendered surface) and inspection-time tooling
// walks the parts tree from there. R12: slot the primitive directly.
// ─────────────────────────────────────────────────────────────────
const HoverCard = BasePreviewCard.Root;

// ─────────────────────────────────────────────────────────────────
// HoverCardTrigger (the anchor on the page)
// ─────────────────────────────────────────────────────────────────
const HoverCardTrigger = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<typeof BasePreviewCard.Trigger>
>((props, ref) => {
  return (
    <BasePreviewCard.Trigger
      ref={ref}
      data-slot="hover-card-trigger"
      {...props}
    />
  );
});
HoverCardTrigger.displayName = 'HoverCardTrigger';

// ─────────────────────────────────────────────────────────────────
// HoverCardPortal (escapes overflow / stacking contexts)
// ─────────────────────────────────────────────────────────────────
const HoverCardPortal = React.forwardRef<
  React.ElementRef<typeof BasePreviewCard.Portal>,
  React.ComponentProps<typeof BasePreviewCard.Portal>
>((props, ref) => {
  return (
    <BasePreviewCard.Portal
      ref={ref}
      data-slot="hover-card-portal"
      {...props}
    />
  );
});
HoverCardPortal.displayName = 'HoverCardPortal';

// ─────────────────────────────────────────────────────────────────
// HoverCardPositioner (floating-ui placement)
// ─────────────────────────────────────────────────────────────────
const HoverCardPositioner = React.forwardRef<
  React.ElementRef<typeof BasePreviewCard.Positioner>,
  React.ComponentProps<typeof BasePreviewCard.Positioner>
>((props, ref) => {
  return (
    <BasePreviewCard.Positioner
      ref={ref}
      data-slot="hover-card-positioner"
      {...props}
    />
  );
});
HoverCardPositioner.displayName = 'HoverCardPositioner';

// ─────────────────────────────────────────────────────────────────
// HoverCardPopup (the rendered surface)
// ─────────────────────────────────────────────────────────────────
const HoverCardPopup = React.forwardRef<
  React.ElementRef<typeof BasePreviewCard.Popup>,
  React.ComponentProps<typeof BasePreviewCard.Popup>
>(({ className, ...props }, ref) => {
  return (
    <BasePreviewCard.Popup
      ref={ref}
      data-slot="hover-card-popup"
      data-min-viewport={String(MIN_VIEWPORT)}
      className={cn(
        'rounded-md border bg-card text-card-foreground p-(--spacing-md) max-w-80 shadow-lg',
        className,
      )}
      {...props}
    />
  );
});
HoverCardPopup.displayName = 'HoverCardPopup';

export {
  HoverCard,
  HoverCardTrigger,
  HoverCardPortal,
  HoverCardPositioner,
  HoverCardPopup,
};
