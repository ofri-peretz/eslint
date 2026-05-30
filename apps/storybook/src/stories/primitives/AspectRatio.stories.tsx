import type { Meta, StoryObj } from '@storybook/react-vite';
import { AspectRatio, MIN_VIEWPORT } from '@interlace/ui/aspect-ratio';
import { withDark, withRtl } from '@/decorators';

const meta = {
  title: 'Primitives/AspectRatio',
  component: AspectRatio,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'CLS=0 layout frame for async media (images, embeds, video). Reserves space at a fixed `ratio` via native CSS `aspect-ratio`. Children position absolutely or use `object-cover`. Server component; MIN_VIEWPORT = 320px.',
      },
    },
  },
  argTypes: {
    ratio: {
      control: { type: 'number', min: 0.25, max: 4, step: 0.05 },
      description: 'width / height (e.g. 16/9 ≈ 1.78, 4/3 ≈ 1.33, 1)',
    },
  },
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

const Placeholder = ({ label }: { label: string }) => (
  <div className="bg-muted text-muted-foreground absolute inset-0 flex items-center justify-center rounded-md text-sm">
    {label}
  </div>
);

export const Default: Story = {
  args: { ratio: 16 / 9 },
  render: (args) => (
    <div className="w-[480px]">
      <AspectRatio {...args}>
        <Placeholder label="16 / 9 — default" />
      </AspectRatio>
    </div>
  ),
};

// `ratio` is the single layout axis (R11), so "Variants" walks a tasteful
// sample of common values rather than enumerating an enum.
export const Variants: Story = {
  render: () => (
    <div className="grid w-[640px] grid-cols-2 gap-4">
      {[
        { ratio: 16 / 9, label: '16 / 9 — landscape' },
        { ratio: 4 / 3, label: '4 / 3 — classic' },
        { ratio: 1, label: '1 / 1 — square' },
        { ratio: 3 / 4, label: '3 / 4 — portrait' },
      ].map(({ ratio, label }) => (
        <AspectRatio key={label} ratio={ratio}>
          <Placeholder label={label} />
        </AspectRatio>
      ))}
    </div>
  ),
};

export const WithImage: Story = {
  render: () => (
    <div className="w-[480px]">
      <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-md">
        {/* Placeholder shape — no network — exercises the object-cover seam. */}
        <div className="from-primary/40 to-accent/40 absolute inset-0 bg-gradient-to-br" />
      </AspectRatio>
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
 * Below-min-viewport demo — wrap in a 319px container with the
 * `data-interlace-dev` flag so preflight's dashed warning outline appears.
 * Storybook renders both the warning and the still-functional frame.
 */
export const BelowMinViewport: Story = {
  render: () => (
    <div data-interlace-dev style={{ width: MIN_VIEWPORT - 1 }}>
      <AspectRatio ratio={16 / 9}>
        <Placeholder label={`< ${MIN_VIEWPORT}px — dev outline`} />
      </AspectRatio>
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
