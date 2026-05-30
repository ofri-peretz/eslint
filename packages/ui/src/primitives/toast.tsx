'use client';

/**
 * @interlace/ui — Toast
 *
 * Transient, portal-mounted notification. Wraps `@base-ui/react/toast`
 * (Provider, Portal, Viewport, Root, Title, Description, Close) and overlays
 * the Interlace tone system on top — four semantic tones (`info`, `success`,
 * `warning`, `danger`) that each render a 4px left accent strip, so the toast
 * reads without colour alone (paired with a consumer-supplied icon per
 * `ERROR_PHILOSOPHY` + `DESIGN_PRINCIPLES` #9).
 *
 * ## Anatomy
 *
 *   ToastProvider (Base UI manager — owns the timer/limit context)
 *     └─ ToastViewport (data-slot, portalled container)
 *         └─ Toast (root · data-slot · data-min-viewport · tone strip)
 *             ├─ ToastTitle      (data-slot)
 *             ├─ ToastDescription (data-slot, muted)
 *             └─ ToastClose      (data-slot, top-right X)
 *
 * ## MIN_VIEWPORT — 320
 *
 * Toasts must remain readable on the smallest baseline viewport (iPhone SE,
 * 320 CSS-px). The viewport positions itself away from the safe-area edges
 * via padding from `--spacing-sm`, the surface itself ships at full-width
 * within the viewport container, and the tone strip never displaces text —
 * so the visual weight is identical at 320px and at 1280px.
 *
 * | Rule | Concept                          | Where in this file                                          |
 * | ---- | -------------------------------- | ----------------------------------------------------------- |
 * | R4   | Extends Base UI part + variants  | `React.ComponentProps<typeof BaseToast.Root>` + cva tone    |
 * | R6   | data-slot on every named part    | data-slot="toast" / "-title" / "-description" / "-close" / "-viewport" / "-provider" |
 * | R7   | className merged + ...rest       | `cn(toastVariants({ tone }), className)` + `{...props}` on every part |
 * | R8   | No `isXxx`; enum for >2 states   | `tone` enum: info / success / warning / danger              |
 * | R13  | Build with the ecosystem         | `@base-ui/react/toast` owns lifecycle, ARIA, focus, portal  |
 * | R14  | Declares min viewport            | `data-min-viewport={String(MIN_VIEWPORT)}` + exported const |
 * | R17  | API parity with Base UI + shadcn | Re-exports mirror Base UI part names with Interlace prefix  |
 * | R18  | Tailwind only                    | Zero inline `style`; cva + static animation classes only    |
 * | R19  | Tokens only                      | `bg-card` / `text-card-foreground` / `border-border` / `rounded-md` / `shadow-lg` / padding from `--spacing-md` |
 * | R20  | AA contrast                      | card + card-foreground are AA-cleared in light + dark; tone strip is a non-text channel |
 * | R23  | CLS=0                            | Animations are transform/opacity only; viewport portals out of the layout flow |
 * | R26  | A11y from headless primitive     | role / aria-live / focus-trap inherited from Base UI Root   |
 *
 * Motion contract (DESIGN_PRINCIPLES #7, MOTION_PHILOSOPHY): slide-from-right
 * + fade-in over 180ms ease-out on open; reverse on close. `useReducedMotion`
 * gates the slide so reduced-motion users get a fade-only transition (still
 * ≤200ms, no transform).
 */

import * as React from 'react';
import { Toast as BaseToast } from '@base-ui/react/toast';
import { useRender } from '@base-ui/react/use-render';
import { XIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn.js';
import { useReducedMotion } from '../lib/use-reduced-motion.js';

// Signals that Toast sub-parts are inside a static (screenshot) render
// path — no BaseToast.Root context available. Sub-parts fall back to
// plain semantic HTML so they render without Base UI's Root context.
const ToastStaticCtx = React.createContext(false);

/**
 * Minimum viable viewport (CSS px) for this primitive. Toasts must remain
 * legible on a 320 CSS-px iPhone SE; below this width, the preflight
 * `data-interlace-dev` outline flags the regression in development.
 */
export const MIN_VIEWPORT = 320 as const;

// ─────────────────────────────────────────────────────────────────
// Tone variants — 4px left accent strip + matching outline ring on
// keyboard focus. The strip is the ONLY tone-coloured channel on the
// surface (the body stays neutral `bg-card`) so the tone reads as a
// secondary signal beside the consumer-supplied icon, never as the
// sole carrier of meaning (DESIGN_PRINCIPLES #9).
// ─────────────────────────────────────────────────────────────────
const toastVariants = cva(
  [
    'pointer-events-auto relative flex w-full items-start gap-sm overflow-hidden',
    'border border-border bg-card text-card-foreground',
    'rounded-md shadow-lg',
    'p-md pl-[calc(var(--spacing-md)+0.25rem)]',
    'before:absolute before:left-0 before:top-0 before:h-full before:w-1',
    'before:content-[""]',
  ].join(' '),
  {
    variants: {
      tone: {
        info: 'before:bg-primary',
        success: 'before:bg-[color:var(--interlace-success)]',
        warning: 'before:bg-[color:var(--interlace-warning)]',
        danger: 'before:bg-destructive',
      },
    },
    defaultVariants: {
      tone: 'info',
    },
  },
);

// ─────────────────────────────────────────────────────────────────
// Animation classes — slide-from-right + fade. Reduced-motion path
// strips the translate so users get fade-only within the same 180ms
// envelope.
// ─────────────────────────────────────────────────────────────────
const ANIMATE_BASE =
  'transition-[transform,opacity] duration-[180ms] ease-out will-change-[transform,opacity]';
const ANIMATE_FULL =
  'data-[starting-style]:translate-x-full data-[starting-style]:opacity-0 data-[ending-style]:translate-x-full data-[ending-style]:opacity-0';
const ANIMATE_REDUCED =
  'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0';

// ─────────────────────────────────────────────────────────────────
// ToastProvider — owns the toast manager (timer/limit/queue). Server
// components can render the JSX tree containing a ToastProvider, but
// the provider itself is a client surface; this file's `use client`
// pragma scopes that boundary.
// ─────────────────────────────────────────────────────────────────
function ToastProvider(
  props: React.ComponentProps<typeof BaseToast.Provider>,
) {
  return <BaseToast.Provider data-slot="toast-provider" {...props} />;
}

// ─────────────────────────────────────────────────────────────────
// ToastViewport — portalled container that pins toasts to a screen
// corner. Padding from `--spacing-md` keeps the stack clear of the
// safe-area edges on mobile (R19 / DESIGN_PRINCIPLES #5).
// ─────────────────────────────────────────────────────────────────
type ToastViewportProps = React.ComponentProps<typeof BaseToast.Viewport>;

const ToastViewport = React.forwardRef<HTMLDivElement, ToastViewportProps>(
  function ToastViewport({ className, ...props }, ref) {
    return (
      <BaseToast.Portal>
        <BaseToast.Viewport
          ref={ref}
          data-slot="toast-viewport"
          data-min-viewport={String(MIN_VIEWPORT)}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex w-full flex-col gap-sm p-md',
            'sm:inset-x-auto sm:right-0 sm:bottom-0 sm:max-w-[420px]',
            'outline-none',
            className,
          )}
          {...props}
        />
      </BaseToast.Portal>
    );
  },
);
ToastViewport.displayName = 'ToastViewport';

// ─────────────────────────────────────────────────────────────────
// Toast (root) — the styled surface. When wired through ToastProvider
// + useToastManager, consumers pass the `toast` object Base UI hands
// them; for static / screenshot stories the prop is optional and we
// render a structurally-identical surface via `useRender` (a `<div>`)
// so the visual snapshot stays deterministic without spinning up a
// real manager.
// ─────────────────────────────────────────────────────────────────
type ToastRootBaseProps = React.ComponentProps<typeof BaseToast.Root>;

type ToastProps = Omit<ToastRootBaseProps, 'toast'> &
  VariantProps<typeof toastVariants> & {
    /** Base UI toast object from `useToastManager().toasts[i]`. Optional for static render. */
    toast?: ToastRootBaseProps['toast'];
  };

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(function Toast(
  { className, tone = 'info', toast, ...props },
  ref,
) {
  const reduceMotion = useReducedMotion();
  const animation = cn(
    ANIMATE_BASE,
    reduceMotion ? ANIMATE_REDUCED : ANIMATE_FULL,
  );

  const sharedProps = {
    'data-slot': 'toast',
    'data-min-viewport': String(MIN_VIEWPORT),
    'data-tone': tone ?? undefined,
    className: cn(toastVariants({ tone }), animation, className),
    ...props,
  } as const;

  // When `toast` is wired (production path), delegate to Base UI Root so the
  // manager owns lifecycle / focus / swipe / aria-live.
  if (toast) {
    return <BaseToast.Root ref={ref} toast={toast} {...sharedProps} />;
  }

  // Static path — no manager required. Render a `<div>` with the same
  // surface so screenshot stories stay deterministic. Base UI's Root
  // allows `style` to be a `(state) => CSSProperties` callback; a plain
  // `<div>` only accepts a static `CSSProperties`, so we narrow here.
  // ToastStaticCtx signals to sub-parts (Title, Description, Close) that
  // they should also render as plain HTML — Base UI's Title/Description/
  // Close require Toast.Root context which doesn't exist in the static path.
  const { style: rawStyle, ...divProps } =
    sharedProps as typeof sharedProps & {
      style?: React.CSSProperties | ((state: unknown) => React.CSSProperties | undefined);
    };
  const style = typeof rawStyle === 'function' ? undefined : rawStyle;
  return (
    <ToastStaticCtx.Provider value={true}>
      <div ref={ref} {...divProps} style={style} />
    </ToastStaticCtx.Provider>
  );
});
Toast.displayName = 'Toast';

// ─────────────────────────────────────────────────────────────────
// ToastTitle / ToastDescription — typography parts. Title carries the
// document outline ARIA, description is muted-foreground per the
// reading-vs-UI typography contract.
// ─────────────────────────────────────────────────────────────────
type ToastTitleProps = React.ComponentProps<typeof BaseToast.Title>;

const ToastTitle = React.forwardRef<HTMLHeadingElement, ToastTitleProps>(
  function ToastTitle({ className, ...props }, ref) {
    const isStatic = React.useContext(ToastStaticCtx);
    const cls = cn('font-body text-ui font-semibold text-card-foreground', className);
    if (isStatic) {
      return <strong ref={ref as React.Ref<HTMLElement>} data-slot="toast-title" className={cls} {...(props as React.HTMLAttributes<HTMLElement>)} />;
    }
    return (
      <BaseToast.Title
        ref={ref}
        data-slot="toast-title"
        className={cls}
        {...props}
      />
    );
  },
);
ToastTitle.displayName = 'ToastTitle';

type ToastDescriptionProps = React.ComponentProps<typeof BaseToast.Description>;

const ToastDescription = React.forwardRef<
  HTMLParagraphElement,
  ToastDescriptionProps
>(function ToastDescription({ className, ...props }, ref) {
  const isStatic = React.useContext(ToastStaticCtx);
  const cls = cn('font-body text-ui-sm text-muted-foreground', className);
  if (isStatic) {
    return <p ref={ref} data-slot="toast-description" className={cls} {...(props as React.HTMLAttributes<HTMLParagraphElement>)} />;
  }
  return (
    <BaseToast.Description
      ref={ref}
      data-slot="toast-description"
      className={cls}
      {...props}
    />
  );
});
ToastDescription.displayName = 'ToastDescription';

// ─────────────────────────────────────────────────────────────────
// ToastClose — the dismiss affordance. Lucide X icon (R13: outlined
// iconography only) inside a Base UI Close that owns the focus +
// keyboard contract.
// ─────────────────────────────────────────────────────────────────
type ToastCloseProps = React.ComponentProps<typeof BaseToast.Close>;

const ToastClose = React.forwardRef<HTMLButtonElement, ToastCloseProps>(
  function ToastClose({ className, children, ...props }, ref) {
    const isStatic = React.useContext(ToastStaticCtx);
    const cls = cn(
      'ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded-sm',
      'text-muted-foreground hover:text-foreground',
      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
      'transition-colors',
      className,
    );
    const content = children ?? (
      <>
        <XIcon className="size-4" aria-hidden />
        <span className="sr-only">Close</span>
      </>
    );
    if (isStatic) {
      return (
        <button ref={ref} type="button" data-slot="toast-close" aria-label="Close" className={cls} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
          {content}
        </button>
      );
    }
    return (
      <BaseToast.Close
        ref={ref}
        data-slot="toast-close"
        aria-label="Close"
        className={cls}
        {...props}
      >
        {content}
      </BaseToast.Close>
    );
  },
);
ToastClose.displayName = 'ToastClose';

// ─────────────────────────────────────────────────────────────────
// ToastTrigger — convenience trigger that, on click, dispatches a
// toast through Base UI's manager. Lives here (rather than in the
// story) so consumers get a typed, ref-forwarding, slot-renderable
// trigger out of the box. Mirrors Button's `render` prop seam (R12)
// so a consumer can swap the rendered element for a Button without
// double-wrapping.
// ─────────────────────────────────────────────────────────────────
type ToastTriggerProps = Omit<React.ComponentProps<'button'>, 'title'> & {
  /** Toast title surfaced to assistive tech. */
  title?: React.ReactNode;
  /** Toast body text. */
  description?: React.ReactNode;
  /** Tone forwarded to Toast root via `type` so consumers can branch on it. */
  tone?: NonNullable<VariantProps<typeof toastVariants>['tone']>;
  /** Replace the rendered element (e.g. `<Button>`). Same seam as Button. */
  render?: useRender.RenderProp;
};

function ToastTrigger({
  className,
  title,
  description,
  tone = 'info',
  render,
  onClick,
  ...props
}: ToastTriggerProps) {
  const manager = BaseToast.useToastManager();

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      manager.add({ title, description, type: tone });
    },
    [manager, onClick, title, description, tone],
  );

  const element = useRender({
    render: render ?? <button type="button" />,
    props: {
      'data-slot': 'toast-trigger',
      'data-tone': tone,
      className: cn(className),
      onClick: handleClick,
      ...props,
    },
  });

  return element;
}

export {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastTrigger,
  ToastViewport,
  toastVariants,
};
export type {
  ToastCloseProps,
  ToastDescriptionProps,
  ToastProps,
  ToastTitleProps,
  ToastTriggerProps,
  ToastViewportProps,
};
