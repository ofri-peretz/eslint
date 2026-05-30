import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from '@interlace/ui/separator';
import { withDark, withRtl } from '@/decorators';

const meta: Meta<typeof Separator> = {
  title: 'Primitives/Separator',
  component: Separator,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Token-coloured divider — horizontal or vertical. Decorative by default; accessible via the underlying `Separator` role for assistive tech that needs the boundary cue.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-[320px]">
      <p className="text-sm font-semibold">Reactions</p>
      <p className="text-muted-foreground text-xs">218 across 12 articles</p>
      <Separator className="my-3" />
      <p className="text-sm font-semibold">Comments</p>
      <p className="text-muted-foreground text-xs">70 across 12 articles</p>
    </div>
  ),
};
export const Vertical: Story = {
  render: () => (
    <div className="flex h-12 items-center gap-3 text-sm">
      <span>Latest</span>
      <Separator orientation="vertical" />
      <span>Popular</span>
      <Separator orientation="vertical" />
      <span>Long reads</span>
    </div>
  ),
};

export const Dark: Story = {
  ...Horizontal,
  decorators: [withDark],
};

export const RTL: Story = {
  ...Horizontal,
  decorators: [withRtl],
};
