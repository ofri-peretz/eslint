import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, AvatarImage, AvatarFallback } from '@interlace/ui/avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Primitives/Avatar',
  component: Avatar,
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarImage
        src="https://avatars.githubusercontent.com/u/8528983?v=4"
        alt="Ofri Peretz"
      />
      <AvatarFallback>OP</AvatarFallback>
    </Avatar>
  ),
};
export const FallbackOnly: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>OP</AvatarFallback>
    </Avatar>
  ),
};
