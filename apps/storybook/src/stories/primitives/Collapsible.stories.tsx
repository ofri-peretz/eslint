import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
  MIN_VIEWPORT,
} from '@interlace/ui/collapsible';
import { withDark, withRtl } from '@/decorators';

const meta = {
  title: 'Primitives/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Single-section disclosure — one `CollapsibleTrigger` toggles one `CollapsiblePanel`. Use for "Show more" reveals, advanced-settings drawers, and footnotes. Compositional API: `Collapsible` (root) > `CollapsibleTrigger` + `CollapsiblePanel`. Per `MOTION_PHILOSOPHY.md` the open/close transition is killed under `prefers-reduced-motion`. MIN_VIEWPORT = 320px.',
      },
    },
  },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

const PanelBody = () => (
  <div className="space-y-sm p-md text-ui-sm text-muted-foreground">
    <p>
      <span className="text-foreground font-medium">eslint-plugin-jwt</span>{' '}
      surfaces three classes of token-handling defects:
    </p>
    <ul className="list-disc space-y-xs pl-md">
      <li>Hardcoded JWT secrets committed to source.</li>
      <li>
        Weak algorithms — <code className="font-mono">none</code> and{' '}
        <code className="font-mono">HS256</code> with sub-256-bit keys.
      </li>
      <li>Missing <code className="font-mono">exp</code> claim verification.</li>
    </ul>
    <p>
      Every finding maps to a CWE id and ships with an autofixer when the
      remediation is unambiguous.
    </p>
  </div>
);

// Default — opens with the panel already expanded so the rich content is
// visible without a click, per the spec.
export const Default: Story = {
  render: () => (
    <Collapsible defaultOpen className="w-[420px] rounded-md border">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-md py-sm text-left text-ui-sm font-medium">
        What does <span className="font-mono">eslint-plugin-jwt</span> detect?
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <PanelBody />
      </CollapsiblePanel>
    </Collapsible>
  ),
};

/**
 * Variants — open vs closed side by side so the two terminal states of the
 * disclosure are reviewable on a single sheet. Open uses `defaultOpen`; closed
 * is the implicit default.
 */
export const Variants: Story = {
  render: () => (
    <div className="grid w-[880px] grid-cols-2 gap-lg">
      <section className="flex flex-col gap-xs">
        <div className="text-ui-sm font-mono uppercase text-muted-foreground">
          open
        </div>
        <Collapsible defaultOpen className="rounded-md border">
          <CollapsibleTrigger className="flex w-full items-center justify-between px-md py-sm text-left text-ui-sm font-medium">
            What does <span className="font-mono">eslint-plugin-jwt</span> detect?
          </CollapsibleTrigger>
          <CollapsiblePanel>
            <PanelBody />
          </CollapsiblePanel>
        </Collapsible>
      </section>

      <section className="flex flex-col gap-xs">
        <div className="text-ui-sm font-mono uppercase text-muted-foreground">
          closed
        </div>
        <Collapsible className="rounded-md border">
          <CollapsibleTrigger className="flex w-full items-center justify-between px-md py-sm text-left text-ui-sm font-medium">
            What does <span className="font-mono">eslint-plugin-jwt</span> detect?
          </CollapsibleTrigger>
          <CollapsiblePanel>
            <PanelBody />
          </CollapsiblePanel>
        </Collapsible>
      </section>
    </div>
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
 * Below-min-viewport demo — wrap in a (MIN_VIEWPORT - 1)px container with the
 * `data-interlace-dev` flag so preflight's dashed warning outline appears.
 * The collapsible still functions; the outline is a dev-only signal that the
 * surface has dropped below its supported width.
 */
export const BelowMinViewport: Story = {
  render: () => (
    <div data-interlace-dev style={{ width: MIN_VIEWPORT - 1 }}>
      <Collapsible defaultOpen className="rounded-md border">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-md py-sm text-left text-ui-sm font-medium">
          {`< ${MIN_VIEWPORT}px — dev outline`}
        </CollapsibleTrigger>
        <CollapsiblePanel>
          <div className="p-md text-ui-sm text-muted-foreground">
            Panel content remains operable below the minimum viewport; the
            dashed warning outline is a development-mode signal only.
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </div>
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
