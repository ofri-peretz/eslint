import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '../primitives/popover.js';
import { Button } from '../primitives/button.js';

const meta: Meta<typeof Popover> = {
  title: 'Primitives/Popover',
  component: Popover,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline">Open</Button>} />
      <PopoverContent>
        <div className="grid gap-2">
          <h4 className="font-medium">Dimensions</h4>
          <p className="text-sm">Set the dimensions for the layer.</p>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
