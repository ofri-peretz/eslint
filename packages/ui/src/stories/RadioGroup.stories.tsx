import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup, RadioGroupItem } from '../primitives/radio-group.js';

const meta: Meta<typeof RadioGroup> = {
  title: 'Primitives/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: () => (
    // Base UI's RadioGroupItem renders its own internal id on the
    // role="radio" span, so `<Label htmlFor>` doesn't reach the interactive
    // element. Wrap each item in `<label>` instead — DOM nesting carries the
    // accessible-name relationship (axe `aria-toggle-field-name` is happy
    // and screen readers announce the label on focus).
    <RadioGroup defaultValue="comfortable">
      <label className="flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="default" aria-label="Default" />
        <span>Default</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="comfortable" aria-label="Comfortable" />
        <span>Comfortable</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="compact" aria-label="Compact" />
        <span>Compact</span>
      </label>
    </RadioGroup>
  ),
};
