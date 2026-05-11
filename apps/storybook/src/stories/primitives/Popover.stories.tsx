import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@interlace/ui/popover';
import { Button } from '@interlace/ui/button';
import { Label } from '@interlace/ui/label';
import { Input } from '@interlace/ui/input';

const meta: Meta<typeof Popover> = {
  title: 'Primitives/Popover',
  component: Popover,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        Open
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="flex flex-col gap-2">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" />
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" />
        </div>
      </PopoverContent>
    </Popover>
  ),
};
