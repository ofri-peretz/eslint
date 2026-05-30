import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, AvatarImage, AvatarFallback } from '@interlace/ui/avatar';
import { withDark, withRtl } from '@/decorators';

const meta: Meta<typeof Avatar> = {
  title: 'Primitives/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Identity surface — image with semantic fallback initials. Image errors fall through to `AvatarFallback` so the surface never breaks; the fallback is the accessible name source when the image fails to load.',
      },
    },
  },
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

export const Dark: Story = {
  ...Default,
  decorators: [withDark],
};

export const RTL: Story = {
  ...Default,
  decorators: [withRtl],
};
