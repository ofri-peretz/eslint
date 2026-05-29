import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progress, MIN_VIEWPORT } from '@interlace/ui/progress';
import { withDark, withRtl } from '@/decorators';

const meta = {
  title: 'Primitives/Progress',
  component: Progress,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Determinate progress indicator. Three sizes (sm / md / lg) × four tones (default / success / warning / danger) per `COLOR_PHILOSOPHY.md`. Token-only fills; never paint with raw hex. Server-safe; MIN_VIEWPORT = 320px.',
      },
    },
  },
  argTypes: {
    value: {
      control: { type: 'number', min: 0, max: 100, step: 1 },
      description: 'Progress percentage (0–100).',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    tone: {
      control: 'select',
      options: ['default', 'success', 'warning', 'danger'],
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

const SIZES = ['sm', 'md', 'lg'] as const;
const TONES = ['default', 'success', 'warning', 'danger'] as const;

export const Default: Story = {
  args: { value: 66, size: 'md', tone: 'default' },
  render: (args) => (
    <div className="w-[320px]">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">Uploading…</span>
        <span className="text-muted-foreground tabular-nums">
          {args.value}%
        </span>
      </div>
      <Progress {...args} />
    </div>
  ),
};

// Grid: size (rows) × tone (cols). One slow-paced sample value per row so the
// reader's eye walks the tone palette without numeric noise.
export const Variants: Story = {
  render: () => (
    <div className="w-[640px]">
      <div
        className="grid items-center gap-x-6 gap-y-4"
        style={{ gridTemplateColumns: 'auto repeat(4, minmax(0, 1fr))' }}
      >
        <div />
        {TONES.map((tone) => (
          <div
            key={tone}
            className="text-muted-foreground text-xs font-mono uppercase"
          >
            {tone}
          </div>
        ))}
        {SIZES.map((size, rowIdx) => {
          // Spread sample values across rows so each cell isn't identical:
          // sm=25, md=50, lg=75.
          const value = 25 + rowIdx * 25;
          return (
            <SizeRow key={size} size={size} value={value} />
          );
        })}
      </div>
    </div>
  ),
};

function SizeRow({
  size,
  value,
}: {
  size: (typeof SIZES)[number];
  value: number;
}) {
  return (
    <>
      <div className="text-muted-foreground text-xs font-mono uppercase">
        {size}
      </div>
      {TONES.map((tone) => (
        <Progress key={`${size}-${tone}`} size={size} tone={tone} value={value} />
      ))}
    </>
  );
}

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
 */
export const BelowMinViewport: Story = {
  render: () => (
    <div data-interlace-dev style={{ width: MIN_VIEWPORT - 1 }}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">
          {`< ${MIN_VIEWPORT}px — dev outline`}
        </span>
        <span className="text-muted-foreground tabular-nums">66%</span>
      </div>
      <Progress value={66} size="md" tone="default" />
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
