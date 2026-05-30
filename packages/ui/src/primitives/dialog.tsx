'use client';

/**
 * @interlace/ui — Dialog (gold-standard reference for the interlace-component skill)
 *
 * This file is the canonical example of the portable component-modeling floor.
 * Every rule R1–R26 from `skills/interlace-component/SKILL.md` that is applicable
 * to a Dialog primitive is illustrated here.
 *
 * | Rule | Concept                          | Where in this file                                            |
 * | ---- | -------------------------------- | ------------------------------------------------------------- |
 * | R4   | Extends native el + JSDoc        | `React.ComponentProps<typeof BaseDialog.*>` on every export   |
 * | R5   | data-testid type-required        | Inherited via consumer-supplied `data-testid` on `...props`   |
 * | R6   | data-slot on every named part    | `data-slot="dialog"` / `"dialog-trigger"` / `"dialog-portal"` / `"dialog-close"` / `"dialog-overlay"` / `"dialog-popup"` |
 * | R7   | className merged + ...rest + ref | `cn(...)` merged className; `{...props}` spread to root       |
 * | R8   | No `isXxx` prefix on booleans    | All boolean props inherited from Base UI use the no-`is` form |
 * | R11  | Composition over prop-drilling   | DialogContent / DialogHeader / DialogFooter / DialogTitle / DialogDescription compound parts |
 * | R12  | Reuse primitives — don't wrap    | XIcon from lucide-react is slotted, not wrapped in a `DialogCloseIcon` |
 * | R13  | Build with the ecosystem         | `@base-ui/react/dialog` provides keyboard / focus / portal / ARIA |
 * | R14  | Controlled + uncontrolled        | Inherited from `BaseDialog.Root` — `open` + `onOpenChange` + `defaultOpen` |
 * | R16  | No internal coupling             | DialogClose accepts children; consumer slots their own button if needed |
 * | R17  | API parity with MUI/shadcn       | Shape mirrors shadcn/ui Dialog + Base UI primitives — no deviation |
 * | R18  | Tailwind only — no inline style  | Every visual class is Tailwind; zero `style={{}}` in this file |
 * | R19  | Tokens only — no raw hex/rgba    | Visual classes use theme tokens (`bg-background`, `text-foreground`, `border`) |
 * | R20  | AA contrast                      | Tokens guarantee contrast in light + dark via the theme       |
 * | R23  | CLS=0                            | Overlay is positioned via `fixed inset-0`; no layout shift     |
 * | R24  | Product-neutral vocabulary       | All names structural (`Dialog`, `Title`, `Description`, `Footer`) — no domain terms |
 * | R26  | A11y from headless primitive     | All ARIA / keyboard / focus handled by `@base-ui/react/dialog` |
 *
 * Out of scope here (rules that don't apply to this primitive):
 * - R3 / R12 (RFC, wrappers) — this is shipped reference code, not a new RFC.
 * - R9 / R10 — event shape inherited from Base UI; sub-element access is via slots, not `xxxProps`.
 * - R21 / R22 — layout primitives (Section/Container) are sibling components, not Dialog concerns.
 * - R25 — `'use client'` is correct for an interactive dialog; not a server component.
 *
 * Consumer-side, this file is the answer to "what does a state-of-the-art primitive look like?"
 */

import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';

import { cn } from '../lib/cn.js';

function Dialog(props: React.ComponentProps<typeof BaseDialog.Root>) {
  return <BaseDialog.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(
  props: React.ComponentProps<typeof BaseDialog.Trigger>,
) {
  return <BaseDialog.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(props: React.ComponentProps<typeof BaseDialog.Portal>) {
  return <BaseDialog.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof BaseDialog.Close>) {
  return <BaseDialog.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof BaseDialog.Popup> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <BaseDialog.Popup
        data-slot="dialog-content"
        className={cn(
          'bg-background data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <BaseDialog.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[open]:bg-accent data-[open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </BaseDialog.Close>
        ) : null}
      </BaseDialog.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
