import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch } from '@interlace/ui/switch';
import { Label } from '@interlace/ui/label';

const meta: Meta<typeof Switch> = {
  title: 'Primitives/Switch',
  component: Switch,
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Switch id="reduced-motion" />
      <Label htmlFor="reduced-motion">Respect reduced motion</Label>
    </div>
  ),
};
export const Checked: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Switch id="rm" defaultChecked />
      <Label htmlFor="rm">Reduced motion (on)</Label>
    </div>
  ),
};
