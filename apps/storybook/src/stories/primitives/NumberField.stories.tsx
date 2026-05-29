import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@interlace/ui/number-field';

const meta: Meta<typeof NumberField> = {
  title: 'Primitives/NumberField',
  component: NumberField,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A numeric input with increment/decrement controls. Wraps @base-ui/react/number-field — keyboard (Up/Down arrows), drag-to-scrub, clamping, and ARIA inherited from Base UI.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <NumberField defaultValue={5}>
      <NumberFieldGroup>
        <NumberFieldDecrement>−</NumberFieldDecrement>
        <NumberFieldInput />
        <NumberFieldIncrement>+</NumberFieldIncrement>
      </NumberFieldGroup>
    </NumberField>
  ),
};

export const Bounded: Story = {
  parameters: {
    docs: { description: { story: 'Bounded between 0 and 100, with a step of 5.' } },
  },
  render: () => (
    <NumberField defaultValue={50} min={0} max={100} step={5}>
      <NumberFieldGroup>
        <NumberFieldDecrement>−</NumberFieldDecrement>
        <NumberFieldInput />
        <NumberFieldIncrement>+</NumberFieldIncrement>
      </NumberFieldGroup>
    </NumberField>
  ),
};

export const Disabled: Story = {
  render: () => (
    <NumberField defaultValue={5} disabled>
      <NumberFieldGroup>
        <NumberFieldDecrement>−</NumberFieldDecrement>
        <NumberFieldInput />
        <NumberFieldIncrement>+</NumberFieldIncrement>
      </NumberFieldGroup>
    </NumberField>
  ),
};
