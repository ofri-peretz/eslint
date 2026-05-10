import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from '@interlace/ui/label';
import { Input } from '@interlace/ui/input';

const meta: Meta<typeof Label> = {
  title: 'Primitives/Label',
  component: Label,
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  render: () => (
    <div className="flex w-[260px] flex-col gap-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};
