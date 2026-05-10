import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from '@interlace/ui/checkbox';
import { Label } from '@interlace/ui/label';

const meta: Meta<typeof Checkbox> = {
  title: 'Primitives/Checkbox',
  component: Checkbox,
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="rule" defaultChecked />
      <Label htmlFor="rule">Include type-aware rules</Label>
    </div>
  ),
};
export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="rule-d" disabled />
      <Label htmlFor="rule-d">Type-aware (disabled)</Label>
    </div>
  ),
};
