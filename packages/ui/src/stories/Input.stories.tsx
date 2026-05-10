import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '../primitives/input.js';
import { Label } from '../primitives/label.js';

const meta: Meta<typeof Input> = {
  title: 'Primitives/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  render: () => (
    <div className="grid w-[300px] gap-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="grid w-[300px] gap-2">
      <Label htmlFor="email-disabled">Email</Label>
      <Input id="email-disabled" type="email" placeholder="you@example.com" disabled />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="grid w-[300px] gap-2">
      <Label htmlFor="email-err">Email</Label>
      <Input
        id="email-err"
        type="email"
        placeholder="you@example.com"
        aria-invalid="true"
        aria-describedby="email-err-msg"
      />
      <p id="email-err-msg" className="text-destructive text-xs">
        Enter a valid email address.
      </p>
    </div>
  ),
};
