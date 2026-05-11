import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from '../primitives/separator.js';

const meta: Meta<typeof Separator> = {
  title: 'Primitives/Separator',
  component: Separator,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-[300px]">
      <p className="mb-3 text-sm">Above</p>
      <Separator />
      <p className="mt-3 text-sm">Below</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-10 items-center gap-3 text-sm">
      <span>Left</span>
      <Separator orientation="vertical" />
      <span>Center</span>
      <Separator orientation="vertical" />
      <span>Right</span>
    </div>
  ),
};
