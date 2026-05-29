import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@interlace/ui/box';
import { withDark, withRtl } from '@/decorators';

const meta: Meta<typeof Box> = {
  title: 'Primitives/Box',
  component: Box,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The token-aware surface primitive. Variants for `surface` (background + foreground pair), `padding`, `radius`, and `border` come from the foundation tokens — no per-component utilities.',
      },
    },
  },
  argTypes: {
    surface: { control: 'select', options: ['none', 'card', 'popover', 'muted', 'primary'] },
    padding: { control: 'select', options: ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    radius: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
    border: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Box>;

export const Default: Story = {
  args: { surface: 'card', padding: 'md', radius: 'md', border: true },
  render: (args) => (
    <Box {...args}>The token-aware surface primitive.</Box>
  ),
};

export const Surfaces: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Box surface="card" padding="md" radius="md" border>card</Box>
      <Box surface="popover" padding="md" radius="md" border>popover</Box>
      <Box surface="muted" padding="md" radius="md">muted</Box>
      <Box surface="primary" padding="md" radius="md">primary</Box>
    </div>
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
