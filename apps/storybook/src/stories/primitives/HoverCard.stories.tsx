import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardPortal,
  HoverCardPositioner,
  HoverCardPopup,
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
 * Default story — opens with `open={true}` so the popup is visible without
 * hover, essential for visual review and autodocs where pointer interaction
 * is not available.
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
      <HoverCardPortal>
        <HoverCardPositioner className="w-80">
          <HoverCardPopup>
            <BioCard />
          </HoverCardPopup>
        </HoverCardPositioner>
      </HoverCardPortal>
    </HoverCard>
  ),
};

// ─────────────────────────────────────────────────────────────────
// Variants — sample the four side placements, all forced open.
// ─────────────────────────────────────────────────────────────────
export const Variants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-2xl p-2xl">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <div key={side} className="flex items-center justify-center">
          <HoverCard open>
            <HoverCardTrigger render={<UsernameLink />} />
            <HoverCardPortal>
              <HoverCardPositioner side={side} className="w-80">
                <HoverCardPopup>
                  <BioCard />
                </HoverCardPopup>
              </HoverCardPositioner>
            </HoverCardPortal>
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
 * the `data-interlace-dev` flag so preflight's dashed warning outline appears.
 */
export const BelowMinViewport: Story = {
  render: () => (
    <div data-interlace-dev style={{ width: MIN_VIEWPORT - 1 }}>
      <HoverCard open>
        <HoverCardTrigger render={<UsernameLink />} />
        <HoverCardPortal>
          <HoverCardPositioner className="w-72">
            <HoverCardPopup>
              <BioCard />
            </HoverCardPopup>
          </HoverCardPositioner>
        </HoverCardPortal>
      </HoverCard>
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
