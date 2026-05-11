import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../primitives/tooltip.js';
import { Button } from '../primitives/button.js';

const meta: Meta<typeof Tooltip> = {
  title: 'Primitives/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline">Hover me</Button>} />
      <TooltipContent>Hello from a tooltip</TooltipContent>
    </Tooltip>
  ),
};
