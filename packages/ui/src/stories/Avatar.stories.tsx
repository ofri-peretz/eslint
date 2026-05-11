import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, AvatarImage, AvatarFallback } from '../primitives/avatar.js';

const meta: Meta<typeof Avatar> = {
  title: 'Primitives/Avatar',
  component: Avatar,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/ofri-peretz.png" alt="Ofri" />
      <AvatarFallback>OP</AvatarFallback>
    </Avatar>
  ),
};

export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>OP</AvatarFallback>
    </Avatar>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar className="size-6"><AvatarFallback>S</AvatarFallback></Avatar>
      <Avatar><AvatarFallback>M</AvatarFallback></Avatar>
      <Avatar className="size-12"><AvatarFallback>L</AvatarFallback></Avatar>
      <Avatar className="size-16"><AvatarFallback>XL</AvatarFallback></Avatar>
    </div>
  ),
};
