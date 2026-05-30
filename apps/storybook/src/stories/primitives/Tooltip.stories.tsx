import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@interlace/ui/tooltip';
import { Button } from '@interlace/ui/button';
import { withDark, withReducedMotion, withRtl } from '@/decorators';

const meta: Meta<typeof Tooltip> = {
  title: 'Primitives/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Hover/focus-only hint. Never wrap interactive content — tooltips disappear on blur. The fade transition is killed under `prefers-reduced-motion` (see `ReducedMotion` story).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>
          Hover or focus me
        </TooltipTrigger>
        <TooltipContent>Sort direction (asc/desc)</TooltipContent>
      </Tooltip>
    </TooltipProvider>
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

export const ReducedMotion: Story = {
  ...Default,
  decorators: [withReducedMotion],
};
