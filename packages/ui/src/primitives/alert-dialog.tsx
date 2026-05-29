'use client';

/**
 * @interlace/ui — AlertDialog
 *
 * A modal confirmation dialog for *destructive or otherwise consequential*
 * actions ("Delete project", "Sign out everywhere"). Distinct from `Dialog`:
 * the underlying Base UI primitive disables outside-click and Escape-only
 * dismissal so the user MUST acknowledge with a deliberate Cancel/Confirm
 * action (WAI-ARIA `alertdialog` pattern). All keyboard / focus / ARIA come
 * from `@base-ui/react/alert-dialog`; this file is a pure styled surface.
 *
 * ## Anatomy
 *
 *   AlertDialog (Root, controlled or uncontrolled)
 *     ├─ AlertDialogTrigger (the originating button)
 *     └─ AlertDialogPortal (escape stacking context)
 *         ├─ AlertDialogBackdrop (fixed scrim — bg-foreground/60)
 *         └─ AlertDialogPopup (centered card — data-min-viewport root)
 *             ├─ AlertDialogTitle ("Delete project?")
 *             ├─ AlertDialogDescription ("This cannot be undone.")
 *             └─ AlertDialogClose (Cancel + Confirm slots — consumer-composed)
 *
 * ## MIN_VIEWPORT — 320
 *
 * A destructive confirmation must work on the narrowest supported phone
 * (iPhone SE, 320 CSS px). The popup is capped at `--container-prose`
 * (65ch) and centered with `inset-0` + flex — it gracefully shrinks below
 * its max-width on small viewports, so the 320-floor is structurally safe.
 *
 * | Rule | Concept                          | Where in this file                                            |
 * | ---- | -------------------------------- | ------------------------------------------------------------- |
 * | R4   | Extends Base UI part props       | `React.ComponentProps<typeof BaseAlertDialog.*>` on every part |
 * | R6   | data-slot on every named part    | `data-slot="alert-dialog"` / `"alert-dialog-trigger"` / `…-portal"` / `…-backdrop"` / `…-popup"` / `…-title"` / `…-description"` / `…-close"` |
 * | R7   | className merged + ...rest       | `cn(BASE, className)` + `{...props}` spread on every part      |
 * | R8   | No `isXxx` prefix on booleans    | All booleans inherited from Base UI use the no-`is` form       |
 * | R11  | Composition over prop-drilling   | Trigger / Portal / Backdrop / Popup / Title / Description / Close compound parts |
 * | R12  | Reuse — don't wrap               | No bespoke Cancel/Confirm buttons — consumers slot their own   |
 * | R13  | Build with the ecosystem         | `@base-ui/react/alert-dialog` owns keyboard / focus / portal / ARIA |
 * | R14  | Controlled + uncontrolled        | Inherited from `BaseAlertDialog.Root` — `open` + `onOpenChange` + `defaultOpen` |
 * | R17  | API parity with shadcn           | Part names mirror shadcn/ui AlertDialog                        |
 * | R18  | Tailwind only — no inline style  | Every visual class is Tailwind; zero `style={{}}`              |
 * | R19  | Tokens only — no raw hex/rgba    | `bg-foreground/60`, `bg-card`, `text-card-foreground`, `p-(--spacing-lg)`, `max-w-(--container-prose)`, `text-h4`, `text-body`, `text-muted-foreground` |
 * | R20  | AA contrast                      | `bg-card` + `text-card-foreground` token pair clears AA in light + dark |
 * | R23  | CLS=0                            | Backdrop + popup are `fixed`; never affect document flow       |
 * | R24  | Product-neutral vocabulary       | Structural names only (Title, Description, Close)             |
 * | R25  | Client component                 | `'use client'` — Base UI dialog needs hooks + portals          |
 * | R26  | A11y from headless primitive     | Base UI implements WAI-ARIA `alertdialog`; focus trap inherited |
 */

import * as React from 'react';
import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';

import { cn } from '../lib/cn.js';

/**
 * Minimum viable viewport (CSS px) for this primitive. The popup max-width
 * collapses to the available width below `--container-prose`, so a 320px
 * phone still renders a usable confirmation surface.
 */
export const MIN_VIEWPORT = 320 as const;

function AlertDialog(props: React.ComponentProps<typeof BaseAlertDialog.Root>) {
  return <BaseAlertDialog.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger(
  props: React.ComponentProps<typeof BaseAlertDialog.Trigger>,
) {
  return <BaseAlertDialog.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal(
  props: React.ComponentProps<typeof BaseAlertDialog.Portal>,
) {
  return <BaseAlertDialog.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogBackdrop({
  className,
  ...props
}: React.ComponentProps<typeof BaseAlertDialog.Backdrop>) {
  return (
    <BaseAlertDialog.Backdrop
      data-slot="alert-dialog-backdrop"
      className={cn(
        'fixed inset-0 z-50 bg-foreground/60 data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogPopup({
  className,
  ...props
}: React.ComponentProps<typeof BaseAlertDialog.Popup>) {
  return (
    <BaseAlertDialog.Popup
      data-slot="alert-dialog-popup"
      data-min-viewport={String(MIN_VIEWPORT)}
      className={cn(
        'fixed top-1/2 left-1/2 z-50 grid w-full max-w-(--container-prose) -translate-x-1/2 -translate-y-1/2 gap-md rounded-lg border bg-card p-(--spacing-lg) text-card-foreground shadow-xl outline-hidden data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof BaseAlertDialog.Title>) {
  return (
    <BaseAlertDialog.Title
      data-slot="alert-dialog-title"
      className={cn('font-body text-h4 font-semibold', className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof BaseAlertDialog.Description>) {
  return (
    <BaseAlertDialog.Description
      data-slot="alert-dialog-description"
      className={cn('font-body text-body text-muted-foreground', className)}
      {...props}
    />
  );
}

function AlertDialogClose(
  props: React.ComponentProps<typeof BaseAlertDialog.Close>,
) {
  return <BaseAlertDialog.Close data-slot="alert-dialog-close" {...props} />;
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogBackdrop,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogClose,
};
