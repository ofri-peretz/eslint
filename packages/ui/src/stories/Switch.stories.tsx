import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Switch } from '../primitives/switch.js';
import { Label } from '../primitives/label.js';

const meta: Meta<typeof Switch> = {
  title: 'Primitives/Switch',
  component: Switch,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="airplane" />
      <Label htmlFor="airplane">Airplane mode</Label>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="dis" disabled />
      <Label htmlFor="dis">Disabled switch</Label>
    </div>
  ),
};

/**
 * Interactive test: switch toggles via keyboard + mouse.
 * Storybook test-runner asserts these in CI.
 */
export const KeyboardToggle: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="kbd" />
      <Label htmlFor="kbd">Keyboard-operable</Label>
    </div>
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
