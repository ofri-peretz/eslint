import * as React from 'react';

import { Button } from '../primitives/button.js';
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel, Form } from '../primitives/form.js';
import { Input } from '../primitives/input.js';
import { Stack } from '../primitives/stack.js';
import { Typography } from '../primitives/typography.js';

/**
 * @interlace/ui — SignInForm
 *
 * Canonical sign-in pattern: title + email + password + submit. Composition
 * of the auth primitive set (Form / Field / Input / Button + Typography for
 * the title). The block owns *structure*; consumers wire `action` /
 * `onSubmit` and pass the brand specifics (provider name, password-reset
 * link, sign-up link) via props.
 *
 * ## Anatomy
 *
 *   SignInForm                       (block — data-min-viewport=320)
 *     ├─ Typography variant=h3       (title)
 *     ├─ Typography variant=body     (subtitle — optional)
 *     ├─ Form                        (the <form> element from primitives/form.tsx)
 *     │   ├─ Field name="email"
 *     │   │   ├─ FieldLabel
 *     │   │   └─ FieldControl render={<Input type="email" />}
 *     │   ├─ Field name="password"
 *     │   │   ├─ FieldLabel
 *     │   │   └─ FieldControl render={<Input type="password" />}
 *     │   └─ Button type="submit"
 *     └─ <slot for sign-up link>
 *
 * MIN_VIEWPORT — 320. Auth must work on the narrowest phone: this is the
 * smallest target the WCAG 2.5.5 floor allows for the input + submit pair.
 *
 * | Rule | Concept                          | Where in this file                                          |
 * | ---- | -------------------------------- | ----------------------------------------------------------- |
 * | R4   | Extends React.ComponentProps     | `React.ComponentProps<'form'> & SignInFormProps`            |
 * | R6   | data-slot on root                | `data-slot="sign-in-form"`                                  |
 * | R7   | className merged + ...rest       | `cn(...) + {...props}` on the Form root                     |
 * | R10  | Composition seam                 | `actions` + `footer` props slot consumer-supplied UI        |
 * | R13  | Ecosystem first                  | Built on the primitives layer; no bespoke form state        |
 * | R14  | Declares min viewport            | `data-min-viewport={String(MIN_VIEWPORT)}` + exported const |
 * | R18  | Tailwind only                    | Zero inline style; classes only                             |
 * | R19  | Tokens only                      | Spacing/typography from existing primitives                 |
 * | R25  | Server component                 | No hooks → no `'use client'`                                |
 * | R26  | A11y from primitives             | Base UI Field owns label association + aria-describedby    |
 */

export const MIN_VIEWPORT = 320 as const;

type SignInFormProps = React.ComponentProps<'form'> & {
  /** Headline above the form. Defaults to "Sign in". */
  title?: React.ReactNode;
  /** Optional supporting copy under the title. */
  subtitle?: React.ReactNode;
  /** Label on the submit button. Defaults to "Sign in". */
  submitLabel?: React.ReactNode;
  /** Slot beneath the submit button — typically a "Forgot password?" link. */
  actions?: React.ReactNode;
  /** Slot below the form — typically a "Don't have an account? Sign up." prompt. */
  footer?: React.ReactNode;
};

export function SignInForm({
  className,
  title = 'Sign in',
  subtitle,
  submitLabel = 'Sign in',
  actions,
  footer,
  ...props
}: SignInFormProps) {
  return (
    <Stack
      gap="lg"
      data-slot="sign-in-form"
      data-min-viewport={String(MIN_VIEWPORT)}
      className="w-full max-w-sm"
    >
      <div>
        <Typography as="h3" variant="h3">
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body" tone="muted" className="mt-2">
            {subtitle}
          </Typography>
        ) : null}
      </div>

      <Form className={className} {...props}>
        <Stack gap="md">
          <Field name="email">
            <FieldLabel>Email</FieldLabel>
            <FieldControl
              render={<Input type="email" autoComplete="email" required />}
            />
            <FieldError />
          </Field>

          <Field name="password">
            <FieldLabel>Password</FieldLabel>
            <FieldControl
              render={
                <Input type="password" autoComplete="current-password" required />
              }
            />
            <FieldDescription>
              Use a unique password. We never store it in plain text.
            </FieldDescription>
            <FieldError />
          </Field>

          <Button type="submit" className="mt-2 w-full">
            {submitLabel}
          </Button>

          {actions ? (
            <div className="text-center text-sm">{actions}</div>
          ) : null}
        </Stack>
      </Form>

      {footer ? (
        <Typography variant="ui-sm" tone="muted" align="center">
          {footer}
        </Typography>
      ) : null}
    </Stack>
  );
}
