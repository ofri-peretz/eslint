import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastProvider,
  ToastTrigger,
  MIN_VIEWPORT,
} from '@interlace/ui/toast';
import { Button } from '@interlace/ui/button';
import { Info, CheckCircle2, AlertTriangle, OctagonAlert } from 'lucide-react';
import { withDark, withRtl } from '@/decorators';

/**
 * Transient, dismissible notification surfaced via a portal. Per
 * `ERROR_PHILOSOPHY.md` + `MOTION_PHILOSOPHY.md`, every tone must read
 * without colour alone (paired icon + label) and animate within the
 * reduced-motion budget. MIN_VIEWPORT = 320px — toasts must remain
 * legible on a 320 CSS-px iPhone SE.
 */
const meta = {
  title: 'Primitives/Toast',
  component: Toast,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    // Toast uses @base-ui/react async portal internals that cause asyncGeneratorStep
    // errors in Playwright's axe runner. Skip until base-ui async test compat is resolved.
    a11y: { skip: true },
    docs: {
      description: {
        component:
          'Transient, portal-mounted notification. Four semantic tones (`info`, `success`, `warning`, `danger`) each pair an icon with a label so they read without colour alone. Default story renders the four tones statically for the screenshot harness; `Variants` wires `ToastTrigger` buttons inside a `ToastProvider` to fire each tone imperatively.',
      },
    },
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['info', 'success', 'warning', 'danger'],
    },
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

const TONES = [
  {
    tone: 'info' as const,
    Icon: Info,
    title: 'Sync running',
    description: 'Refreshing the article cache in the background.',
  },
  {
    tone: 'success' as const,
    Icon: CheckCircle2,
    title: 'Saved',
    description: 'Your preferences were updated.',
  },
  {
    tone: 'warning' as const,
    Icon: AlertTriangle,
    title: 'Cache stale',
    description: 'Article counts are more than 7 days old.',
  },
  {
    tone: 'danger' as const,
    Icon: OctagonAlert,
    title: 'Sync failed',
    description: 'Falling back to last successful snapshot.',
  },
];

/**
 * Static render of all four tones — no real timers / dispatch — so the
 * Chromatic / Playwright screenshot is deterministic.
 */
export const Default: Story = {
  render: () => (
    // ToastProvider required: Toast uses @base-ui/react context (error #66 without it)
    <ToastProvider>
      <div className="flex w-[420px] flex-col gap-sm">
        {TONES.map(({ tone, Icon, title, description }) => (
          <Toast key={tone} tone={tone}>
            <Icon className="size-4" aria-hidden />
            <ToastTitle>{title}</ToastTitle>
            <ToastDescription>{description}</ToastDescription>
          </Toast>
        ))}
      </div>
    </ToastProvider>
  ),
};

/**
 * Imperative trigger — wraps the canvas in `ToastProvider`, renders one
 * `ToastTrigger` per tone. Click any trigger to dispatch the matching
 * toast through the provider's portal.
 */
export const Variants: Story = {
  render: () => (
    <ToastProvider>
      <div className="flex flex-wrap gap-sm">
        {TONES.map(({ tone, title, description }) => (
          <ToastTrigger
            key={tone}
            tone={tone}
            title={title}
            description={description}
            render={<Button variant="outline">Fire {tone}</Button>}
          />
        ))}
      </div>
    </ToastProvider>
  ),
};

export const Dark: Story = {
  ...Default,
  decorators: [withDark],
};

export const RTL: Story = {
  ...Default,
  decorators: [withRtl],
};

/**
 * Below-min-viewport demo — wrap in a (MIN_VIEWPORT - 1)px container
 * with the `data-interlace-dev` flag so preflight's dashed dev-mode
 * warning outline appears. The toast still renders; the outline is the
 * authoring-time signal that we have dropped below the documented
 * minimum.
 */
export const BelowMinViewport: Story = {
  render: () => (
    <ToastProvider>
      <div data-interlace-dev style={{ width: MIN_VIEWPORT - 1 }}>
        <Toast tone="info">
          <Info className="size-4" aria-hidden />
          <ToastTitle>{`< ${MIN_VIEWPORT}px — dev outline`}</ToastTitle>
          <ToastDescription>
            Toast still renders below the documented minimum viewport.
          </ToastDescription>
        </Toast>
      </div>
    </ToastProvider>
  ),
  decorators: [
    (Story) => (
      // Promote the body flag for this story so the preflight selector matches.
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
