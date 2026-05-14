import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
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

// Base UI's Switch renders its own internal id on the role="switch" span,
// so `<Label htmlFor>` doesn't reach the interactive element. Wrap in a
// native `<label>` (DOM-nested association) + add `aria-label` as a
// belt-and-suspenders accessible-name source for axe.
export const KeyboardToggle: Story = {
  render: () => (
    <label className="flex items-center gap-2 cursor-pointer">
      <Switch aria-label="Keyboard-operable" />
      <span>Keyboard-operable</span>
    </label>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const sw = canvas.getByRole('switch');
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await step('Toggle via mouse click', async () => {
      await userEvent.click(sw);
      await expect(sw).toHaveAttribute('aria-checked', 'true');
    });
    await step('Toggle back via keyboard Space', async () => {
      sw.focus();
      await userEvent.keyboard(' ');
      await expect(sw).toHaveAttribute('aria-checked', 'false');
    });
  },
};
