/**
 * @interlace/ui — Form
 *
 * A composition primitive over `@base-ui/react/field`. The form ecosystem owns
 * a long tail of subtle a11y wiring — label/control association via generated
 * ids, `aria-describedby` for description + error, `aria-invalid` flipping on
 * validity, focus management when validation fails. Base UI's `Field.*` parts
 * already encode that contract; this file is the DS skin (R13: ecosystem
 * first — wrap, never re-implement).
 *
 * Two layers ship here:
 *
 *   1. `Form` — a server-component `<form>` wrapper with a server-safe
 *      `asChild` seam (R10). Forwards `action` / `method` / `onSubmit` /
 *      `className` / `...rest` so it composes with both React Server Action
 *      forms (`action={serverAction}`) and classic POST forms.
 *   2. `Field` / `FieldLabel` / `FieldControl` / `FieldDescription` /
 *      `FieldError` / `FieldValidity` — DS-styled re-exports of the Base UI
 *      `Field.*` parts. `Field` (= `Field.Root`) and `FieldControl` are pure
 *      passthrough (Base UI owns their structure + styling hooks); the other
 *      three add token-only Tailwind classes for the canonical label /
 *      description / error type ramps.
 *
 * ## Anatomy
 *
 *   <Form action={serverAction}>
 *     <Field name="email">
 *       <FieldLabel>Email</FieldLabel>
 *       <FieldControl render={<Input type="email" required />} />
 *       <FieldDescription>We'll never share it.</FieldDescription>
 *       <FieldError />
 *     </Field>
 *     <Button type="submit">Sign in</Button>
 *   </Form>
 *
 * ## MIN_VIEWPORT — 320
 *
 * Forms are the LAST surface that may degrade on a narrow screen: a sign-in,
 * search, or contact form must work on a 320 CSS-px iPhone SE. The
 * sub-primitives (Input / Textarea / FieldLabel / FieldError) inherit the
 * 320 floor; this root mirrors it so audits keyed off `data-min-viewport`
 * see the same value at the form scope.
 *
 * | Rule | Concept                          | Where in this file                                                 |
 * | ---- | -------------------------------- | ------------------------------------------------------------------ |
 * | R4   | Extends native el                | `Form` extends `React.ComponentProps<'form'>`                      |
 * | R6   | data-slot on every part          | `data-slot="form"` + Base UI parts emit their own slot attrs        |
 * | R7   | className merged + ...rest       | `cn(className)` + `{...props}` on every part                       |
 * | R9   | Native onSubmit stays native     | `onSubmit` / `action` / `method` pass through `{...props}`         |
 * | R10  | Composition seam                 | `Form` accepts `asChild` via a server-safe React.cloneElement slot |
 * | R13  | Ecosystem first                  | Base UI `Field.*` owns id wiring + ARIA + validity state           |
 * | R14  | Declares min viewport            | `data-min-viewport={String(MIN_VIEWPORT)}` + exported const        |
 * | R18  | Tailwind only                    | Zero inline `style`; classes only                                  |
 * | R19  | Tokens only                      | `text-ui` / `text-ui-sm` / `text-muted-foreground` / `text-destructive` |
 * | R20  | AA contrast                      | description / error tokens are AA-cleared in foundation             |
 * | R25  | Server component                 | No hooks, no `'use client'`; Base UI `Field.*` is the client part  |
 * | R26  | A11y from native el + headless   | Native `<form>` + Base UI `Field.*` ARIA wiring                    |
 */

import * as React from 'react';
import { Field as BaseField } from '@base-ui/react/field';

import { cn } from '../lib/cn.js';

/** Smallest viable viewport (CSS px) for this primitive. */
export const MIN_VIEWPORT = 320 as const;

// ─────────────────────────────────────────────────────────────────
// Form (root <form>) — server component with a server-safe asChild seam.
// ─────────────────────────────────────────────────────────────────

interface FormProps extends React.ComponentProps<'form'> {
  /**
   * Render as the passed child element (e.g. a framework-specific `<Form>`
   * from `react-router` / `remix-run`). Server-safe slot: when set and a
   * single React element child is provided, we `cloneElement` and merge our
   * `data-slot` / `data-min-viewport` / `className` onto it. Not Base UI
   * `useRender` (which would flip this tree to a client boundary).
   */
  asChild?: boolean;
}

/** Form root. Server component (no hooks, no `'use client'`). */
const Form = React.forwardRef<HTMLFormElement, FormProps>(function Form(
  { asChild, className, children, ...props },
  ref,
) {
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      ...props,
      ...child.props,
      ref,
      'data-slot': 'form',
      'data-min-viewport': String(MIN_VIEWPORT),
      className: cn(className, child.props.className),
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <form
      ref={ref}
      data-slot="form"
      data-min-viewport={String(MIN_VIEWPORT)}
      className={cn(className)}
      {...props}
    >
      {children}
    </form>
  );
});
Form.displayName = 'Form';

// ─────────────────────────────────────────────────────────────────
// Field (= Base UI Field.Root) — passthrough; Base UI owns structure.
// ─────────────────────────────────────────────────────────────────

const Field = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof BaseField.Root>
>(function Field({ className, ...props }, ref) {
  return (
    <BaseField.Root
      ref={ref}
      data-slot="field"
      className={cn(className)}
      {...props}
    />
  );
});
Field.displayName = 'Field';

// ─────────────────────────────────────────────────────────────────
// FieldLabel — DS-styled label using --text-ui.
// ─────────────────────────────────────────────────────────────────

const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.ComponentProps<typeof BaseField.Label>
>(function FieldLabel({ className, ...props }, ref) {
  return (
    <BaseField.Label
      ref={ref}
      data-slot="field-label"
      className={cn(
        'block font-body text-ui font-medium leading-none',
        className,
      )}
      {...props}
    />
  );
});
FieldLabel.displayName = 'FieldLabel';

// ─────────────────────────────────────────────────────────────────
// FieldControl — passthrough; the rendered input owns its own visual.
// ─────────────────────────────────────────────────────────────────

const FieldControl = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof BaseField.Control>
>(function FieldControl({ className, ...props }, ref) {
  return (
    <BaseField.Control
      ref={ref}
      data-slot="field-control"
      className={cn(className)}
      {...props}
    />
  );
});
FieldControl.displayName = 'FieldControl';

// ─────────────────────────────────────────────────────────────────
// FieldDescription — DS-styled helper text (--text-ui-sm + muted).
// ─────────────────────────────────────────────────────────────────

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentProps<typeof BaseField.Description>
>(function FieldDescription({ className, ...props }, ref) {
  return (
    <BaseField.Description
      ref={ref}
      data-slot="field-description"
      className={cn('font-body text-ui-sm text-muted-foreground', className)}
      {...props}
    />
  );
});
FieldDescription.displayName = 'FieldDescription';

// ─────────────────────────────────────────────────────────────────
// FieldError — DS-styled error text (--text-ui-sm + destructive).
// ─────────────────────────────────────────────────────────────────

const FieldError = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentProps<typeof BaseField.Error>
>(function FieldError({ className, ...props }, ref) {
  return (
    <BaseField.Error
      ref={ref}
      data-slot="field-error"
      className={cn('font-body text-ui-sm text-destructive', className)}
      {...props}
    />
  );
});
FieldError.displayName = 'FieldError';

// ─────────────────────────────────────────────────────────────────
// FieldValidity — render-prop helper from Base UI; pure re-export.
// ─────────────────────────────────────────────────────────────────

const FieldValidity = BaseField.Validity;

export {
  Form,
  Field,
  FieldLabel,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldValidity,
};
export type { FormProps };
