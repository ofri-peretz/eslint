import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
  MIN_VIEWPORT,
} from '@interlace/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@interlace/ui/avatar';
import { withDark, withRtl } from '@/decorators';

const meta = {
  title: 'Primitives/HoverCard',
  component: HoverCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Pointer-anchored preview card. Surfaces a richer summary (avatar + bio) on hover/focus of a link. Tablet-and-up only; reach for Popover on touch devices.',
      },
    },
  },
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─────────────────────────────────────────────────────────────────
// Shared fixture — a username link + the bio card it opens.
// Kept inline so each story stays self-contained and the structure
// is obvious at a glance.
// ─────────────────────────────────────────────────────────────────
const BioCard = () => (
  <div className="flex gap-md">
    <Avatar className="size-12">
      <AvatarImage src="https://github.com/shadcn.png" alt="" />
      <AvatarFallback>OP</AvatarFallback>
    </Avatar>
    <div className="flex flex-col gap-xs">
      <p className="text-ui-sm font-semibold text-foreground">@ofriperetz</p>
      <p className="text-ui-sm text-muted-foreground">
        Builds the Interlace design system and the ESLint plugin ecosystem
        around it. Lives in tokens, sleeps in flat-config.
      </p>
      <p className="text-ui-xs text-muted-foreground">Joined December 2023</p>
    </div>
  </div>
);

const UsernameLink = () => (
  <a
    href="#ofriperetz"
    className="text-primary underline-offset-4 hover:underline"
  >
    @ofriperetz
  </a>
);

/**
 * Default story — opens with `open={true}` (Base UI controlled prop) so the
 * popup is visible without hover, which is essential for visual review and
 * for the autodocs page where pointer interaction isn't available.
 *
 * Callout: Tablet-and-up only; reach for Popover on touch devices.
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Tablet-and-up only; reach for Popover on touch devices. Rendered with `open={true}` so the popup is visible in autodocs.',
      },
    },
  },
  render: () => (
    <HoverCard open>
      <HoverCardTrigger render={<UsernameLink />} />
      <HoverCardContent className="w-80">
        <BioCard />
      </HoverCardContent>
    </HoverCard>
  ),
};

// ─────────────────────────────────────────────────────────────────
// Variants — the single layout axis is `side`; sample the four
// edges rather than enumerating every option. All forced open so
// the placement is visible at a glance.
// ─────────────────────────────────────────────────────────────────
export const Variants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-2xl p-2xl">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <div key={side} className="flex items-center justify-center">
          <HoverCard open>
            <HoverCardTrigger render={<UsernameLink />} />
            <HoverCardContent side={side} className="w-80">
              <BioCard />
            </HoverCardContent>
          </HoverCard>
        </div>
      ))}
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
 * Below-min-viewport demo — wrap in a `(MIN_VIEWPORT - 1)`px container with
 * the `data-interlace-dev` flag so preflight's dashed warning outline
 * appears. Storybook renders both the warning and the still-functional
 * card; on real touch devices the consumer should switch to Popover.
 */
export const BelowMinViewport: Story = {
  render: () => (
    <div data-interlace-dev style={{ width: MIN_VIEWPORT - 1 }}>
      <HoverCard open>
        <HoverCardTrigger render={<UsernameLink />} />
        <HoverCardContent className="w-72">
          <BioCard />
        </HoverCardContent>
      </HoverCard>
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
