import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Form,
  Field,
  FieldLabel,
  FieldControl,
  FieldDescription,
  FieldError,
  MIN_VIEWPORT,
} from '@interlace/ui/form';
import { Input } from '@interlace/ui/input';
import { Button } from '@interlace/ui/button';
import { withDark, withRtl } from '@/decorators';

const meta = {
  title: 'Primitives/Form',
  component: Form,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Compositional form primitive — `Form` wraps a native `<form>`; `Field` groups one labelled control with its description + error. Label / control / description / error are wired by id per `FORM_PHILOSOPHY.md` so screen readers announce the full triplet. Server component; MIN_VIEWPORT = 320px because a sign-in form is the LAST surface allowed to degrade on a narrow viewport.',
      },
    },
  },
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default — canonical sign-in form. Two fields with descriptions plus a
 * submit. Walks the reader through the full composition (Form → Field →
 * FieldLabel + FieldControl + FieldDescription) once before the Variants
 * story shows the validity split.
 */
export const Default: Story = {
  render: () => (
    <Form className="w-[360px]">
      <Field name="email">
        <FieldLabel>Email</FieldLabel>
        <FieldControl render={<Input type="email" autoComplete="email" placeholder="you@interlace.tools" />} />
        <FieldDescription>We never share your address.</FieldDescription>
      </Field>
      <Field name="password">
        <FieldLabel>Password</FieldLabel>
        <FieldControl
          render={
            <Input type="password" autoComplete="current-password" placeholder="••••••••" />
          }
        />
        <FieldDescription>At least 12 characters.</FieldDescription>
      </Field>
      <Button type="submit">Sign in</Button>
    </Form>
  ),
};

/**
 * Variants — validity axis. Side-by-side `valid` (clean state, just a
 * description) and `invalid` (aria-invalid + FieldError announced via
 * aria-describedby) so the destructive ring + error text contract is
 * visible at a glance.
 */
export const Variants: Story = {
  render: () => (
    <div className="grid w-[720px] grid-cols-2 gap-md">
      <Form>
        <div className="mb-sm text-ui-sm font-mono uppercase text-muted-foreground">
          valid
        </div>
        <Field name="email-valid">
          <FieldLabel>Email</FieldLabel>
          <FieldControl
            render={
              <Input
                type="email"
                autoComplete="email"
                defaultValue="ofri@interlace.tools"
              />
            }
          />
          <FieldDescription>We never share your address.</FieldDescription>
        </Field>
      </Form>
      <Form>
        <div className="mb-sm text-ui-sm font-mono uppercase text-muted-foreground">
          invalid
        </div>
        <Field name="email-invalid" invalid>
          <FieldLabel>Email</FieldLabel>
          <FieldControl
            render={
              <Input type="email" autoComplete="email" defaultValue="not-an-email" />
            }
          />
          <FieldDescription>We never share your address.</FieldDescription>
          <FieldError>Enter a valid email address.</FieldError>
        </Field>
      </Form>
    </div>
  ),
};

export const Dark: Story = {
  ...Default,
  decorators: [withDark],
};

export const RTL: Story = {
  render: () => (
    <Form className="w-[360px]" dir="rtl" lang="ar">
      <Field name="email-rtl">
        <FieldLabel>البريد الإلكتروني</FieldLabel>
        <FieldControl
          render={<Input type="email" autoComplete="email" placeholder="you@interlace.tools" />}
        />
        <FieldDescription>لن نشارك عنوانك أبدًا.</FieldDescription>
      </Field>
      <Field name="password-rtl">
        <FieldLabel>كلمة المرور</FieldLabel>
        <FieldControl
          render={
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
            />
          }
        />
        <FieldDescription>على الأقل 12 حرفًا.</FieldDescription>
      </Field>
      <Button type="submit">تسجيل الدخول</Button>
    </Form>
  ),
  decorators: [withRtl],
};

/**
 * Below-min-viewport demo — wrap the sign-in form in a (MIN_VIEWPORT - 1)px
 * container with `data-interlace-dev` so preflight's dashed warning outline
 * fires. The form still renders + still works; the outline simply flags
 * that the consumer is asking the primitive to operate under its declared
 * floor (R14).
 */
export const BelowMinViewport: Story = {
  render: () => (
    <div data-interlace-dev style={{ width: MIN_VIEWPORT - 1 }}>
      <Form>
        <Field name="email-narrow">
          <FieldLabel>Email</FieldLabel>
          <FieldControl
            render={<Input type="email" autoComplete="email" placeholder="you@…" />}
          />
          <FieldDescription>{`< ${MIN_VIEWPORT}px — dev outline`}</FieldDescription>
        </Field>
        <Button type="submit">Sign in</Button>
      </Form>
    </div>
  ),
  decorators: [
    (Story) => (
      <div
        ref={(node) => {
          if (node && typeof document !== 'undefined') {
            document.body.setAttribute('data-interlace-dev', '');
          }
        }}
      >
        <Story />
      </div>
    ),
  ],
};
