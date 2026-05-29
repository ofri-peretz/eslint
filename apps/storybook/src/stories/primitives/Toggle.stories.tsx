import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bold, Italic, Underline } from 'lucide-react';
import { Toggle, ToggleGroup } from '@interlace/ui/toggle';

const meta: Meta<typeof Toggle> = {
  title: 'Primitives/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A two-state button (pressed / not-pressed). Wraps @base-ui/react/toggle. Compose multiple inside ToggleGroup for mutually-exclusive or multi-select clusters (e.g. text-formatting toolbars).',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['default', 'outline'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { variant: 'default', size: 'md' },
  render: (args) => (
    <Toggle {...args} aria-label="Toggle bold">
      <Bold className="size-4" aria-hidden />
    </Toggle>
  ),
};

export const Outline: Story = {
  args: { variant: 'outline', size: 'md' },
  render: (args) => (
    <Toggle {...args} aria-label="Toggle italic">
      <Italic className="size-4" aria-hidden />
    </Toggle>
  ),
};

export const Sizes: Story = {
  parameters: {
    docs: { description: { story: 'Three sizes match the WCAG 2.5.5 target-size floor at sm.' } },
  },
  render: () => (
    <div className="flex items-center gap-3">
      <Toggle size="sm" aria-label="sm">
        <Bold className="size-3.5" aria-hidden />
      </Toggle>
      <Toggle size="md" aria-label="md">
        <Bold className="size-4" aria-hidden />
      </Toggle>
      <Toggle size="lg" aria-label="lg">
        <Bold className="size-5" aria-hidden />
      </Toggle>
    </div>
  ),
};

export const Group: Story = {
  parameters: {
    docs: { description: { story: 'Multi-select group — three independent toggles, classic formatting toolbar.' } },
  },
  render: () => (
    <ToggleGroup>
      <Toggle aria-label="Bold">
        <Bold className="size-4" aria-hidden />
      </Toggle>
      <Toggle aria-label="Italic">
        <Italic className="size-4" aria-hidden />
      </Toggle>
      <Toggle aria-label="Underline">
        <Underline className="size-4" aria-hidden />
      </Toggle>
    </ToggleGroup>
  ),
};
