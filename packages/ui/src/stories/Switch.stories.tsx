import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Switch } from '../primitives/switch.js';

const meta: Meta<typeof Switch> = {
  title: 'Primitives/Switch',
  component: Switch,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Switch>;

// Base UI's Switch renders its own internal id on the role="switch" span,
// so `<Label htmlFor>` doesn't reach the interactive element. Wrap in a
// native `<label>` (DOM-nested association) + add `aria-label` as a
// belt-and-suspenders accessible-name source for axe.
export const Default: Story = {
  render: () => (
    <label className="flex items-center gap-2 cursor-pointer">
      <Switch aria-label="Airplane mode" />
      <span>Airplane mode</span>
    </label>
  ),
};

export const Disabled: Story = {
  render: () => (
    <label className="flex items-center gap-2 cursor-pointer">
      <Switch aria-label="Disabled switch" disabled />
      <span>Disabled switch</span>
    </label>
  ),
};

/**
 * Interactive test: switch toggles via keyboard + mouse.
 * Storybook test-runner asserts these in CI.
 */
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
