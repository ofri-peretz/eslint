import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from '../primitives/checkbox.js';

const meta: Meta<typeof Checkbox> = {
  title: 'Primitives/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => (
    // Base UI renders its own internal id on the role="checkbox" span, so
    // `<Label htmlFor="terms">` won't reach the interactive element. Use a
    // wrapping `<label>` so the click-target relationship + accessible name
    // both come from DOM nesting — axe's `aria-toggle-field-name` is
    // satisfied without depending on id-association.
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox aria-label="Accept terms and conditions" />
      <span>Accept terms and conditions</span>
    </label>
  ),
};
