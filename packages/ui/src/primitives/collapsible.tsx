'use client';

/**
 * @interlace/ui — Collapsible
 *
 * A single open/close disclosure surface. Wraps Base UI's `Collapsible.Root`,
 * `Collapsible.Trigger`, `Collapsible.Panel` so consumers get the controlled /
 * uncontrolled state machine, ARIA wiring (`aria-controls`, `aria-expanded`,
 * `id`), keyboard semantics (Enter / Space on the trigger), and Base UI's
 * built-in panel sizing — for free. Reduced-motion is honoured globally via
 * `preflight.css` (every animation collapses to 0.01ms when
 * `prefers-reduced-motion: reduce`), so this file owns no motion timing.
 *
 * ## Anatomy
 *
 *   Collapsible (Base.Root, data-min-viewport)
 *     ├─ CollapsibleTrigger (Base.Trigger — button surface)
 *     └─ CollapsiblePanel   (Base.Panel — height-animated container)
 *
 * ## MIN_VIEWPORT — 320
 *
 * A disclosure is one of the smallest interactive surfaces a page can offer:
 * a single trigger + a single content region. It works down to the 320 CSS-px
 * iPhone SE viewport — the trigger inherits focus-visible / target-size
 * affordances from `preflight.css`, and the panel is width-constrained by its
 * parent, never the viewport. Below 320, preflight's dev-mode outline warns.
 *
 * | Rule | Concept                          | Where in this file                                                  |
 * | ---- | -------------------------------- | ------------------------------------------------------------------- |
 * | R4   | Extends Base UI part props       | Each part: `React.ComponentProps<typeof BaseCollapsible.X>`         |
 * | R6   | data-slot on every part          | data-slot="collapsible" / "collapsible-trigger" / "collapsible-panel" |
 * | R7   | className merged + ...rest       | `cn(BASE, className)` + `{...props}` on every part                  |
 * | R10  | Composition seam                 | Base UI parts are renderable / slot-friendly out of the box         |
 * | R13  | Ecosystem first                  | Base UI Collapsible — no bespoke disclosure state machine           |
 * | R14  | Declares min viewport            | `data-min-viewport={String(MIN_VIEWPORT)}` + exported const         |
 * | R18  | Tailwind only                    | Zero inline `style`; classes only                                   |
 * | R19  | Tokens only                      | `text-ui font-medium` from foundation tokens (no raw px / colors)   |
 * | R20  | AA contrast                      | Trigger inherits foreground; focus ring from preflight              |
 * | R25  | Client component                 | Base UI Collapsible is a client surface → `'use client'` required   |
 * | R26  | A11y from Base UI                | aria-expanded / aria-controls / Enter+Space owned by Base UI        |
 *
 * API parity: Radix / shadcn `Collapsible` (Root + Trigger + Content) — we
 * keep the same three-part shape, renaming `Content` → `Panel` to match Base
 * UI's vocabulary. Consumers wanting Radix-style naming can re-alias on import.
 */

import * as React from 'react';
import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';

import { cn } from '../lib/cn.js';

/**
 * Minimum viable viewport (CSS px) for this primitive. Below it, the
 * preflight contract draws a dev-mode outline; in prod the component still
 * renders. Exported so consumers / tests can read it.
 */
export const MIN_VIEWPORT = 320 as const;

// ─────────────────────────────────────────────────────────────────
// Collapsible (Base.Root) — owns the open/closed state machine.
// ─────────────────────────────────────────────────────────────────
const Collapsible = React.forwardRef<
  React.ElementRef<typeof BaseCollapsible.Root>,
  React.ComponentProps<typeof BaseCollapsible.Root>
>(function Collapsible({ className, ...props }, ref) {
  return (
    <BaseCollapsible.Root
      ref={ref}
      data-slot="collapsible"
      data-min-viewport={String(MIN_VIEWPORT)}
      className={cn(className)}
      {...props}
    />
  );
});
Collapsible.displayName = 'Collapsible';

// ─────────────────────────────────────────────────────────────────
// CollapsibleTrigger (Base.Trigger) — the button surface.
// Inherits focus-visible ring + target-size floor from preflight.css.
// ─────────────────────────────────────────────────────────────────
const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof BaseCollapsible.Trigger>,
  React.ComponentProps<typeof BaseCollapsible.Trigger>
>(function CollapsibleTrigger({ className, ...props }, ref) {
  return (
    <BaseCollapsible.Trigger
      ref={ref}
      data-slot="collapsible-trigger"
      className={cn(
        'text-ui font-medium outline-none disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});
CollapsibleTrigger.displayName = 'CollapsibleTrigger';

// ─────────────────────────────────────────────────────────────────
// CollapsiblePanel (Base.Panel) — height-animated content region.
// Base UI sets the `height` CSS var across open/closed; we only need to
// clip overflow so the animation reads cleanly. `data-[starting-style]` /
// `data-[ending-style]` collapse height to 0 at the boundary; reduced-motion
// short-circuits the animation duration to 0.01ms via preflight.
// ─────────────────────────────────────────────────────────────────
const CollapsiblePanel = React.forwardRef<
  React.ElementRef<typeof BaseCollapsible.Panel>,
  React.ComponentProps<typeof BaseCollapsible.Panel>
>(function CollapsiblePanel({ className, ...props }, ref) {
  return (
    <BaseCollapsible.Panel
      ref={ref}
      data-slot="collapsible-panel"
      className={cn(
        'overflow-hidden transition-[height] data-[ending-style]:h-0 data-[starting-style]:h-0',
        className,
      )}
      {...props}
    />
  );
});
CollapsiblePanel.displayName = 'CollapsiblePanel';

export { Collapsible, CollapsibleTrigger, CollapsiblePanel };
