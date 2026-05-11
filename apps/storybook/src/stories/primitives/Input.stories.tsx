import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '@interlace/ui/input';
import { Label } from '@interlace/ui/label';

const meta: Meta<typeof Input> = {
  title: 'Primitives/Input',
  component: Input,
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  render: () => (
    <div className="flex w-[320px] flex-col gap-2">
      <Label htmlFor="search">Search articles</Label>
      <Input id="search" placeholder="JWT, SQL, prototype pollution…" />
    </div>
  ),
};
export const Disabled: Story = {
  render: () => (
    <div className="flex w-[320px] flex-col gap-2">
      <Label htmlFor="search-d">Search</Label>
      <Input id="search-d" placeholder="Disabled" disabled />
    </div>
  ),
};
