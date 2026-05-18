import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Cluster } from '@interlace/ui/stack';

const meta: Meta<typeof Stack> = {
  title: 'Primitives/Stack',
  component: Stack,
  parameters: {
    docs: {
      description: {
        component:
          'Gap rhythm from LAYOUT_PHILOSOPHY.md §3. `Stack` lays children out vertically; `Cluster` lays them out horizontally with wrap. Every gap maps to one of six tokens — never a per-page guess.',
      },
    },
  },
  argTypes: {
    direction: { control: 'select', options: ['vertical', 'horizontal'] },
    gap: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    align: { control: 'select', options: ['start', 'center', 'end', 'stretch', 'baseline'] },
    justify: { control: 'select', options: ['start', 'center', 'end', 'between', 'around'] },
  },
};

export default meta;
type Story = StoryObj<typeof Stack>;

const Pill = ({ label }: { label: string }) => (
  <div className="rounded-md border border-fd-border bg-fd-card/40 px-4 py-2 text-sm">
    {label}
  </div>
);

export const Vertical: Story = {
  args: { direction: 'vertical', gap: 'md' },
  render: (args) => (
    <Stack {...args}>
      <Pill label="Item 1" />
      <Pill label="Item 2" />
      <Pill label="Item 3" />
    </Stack>
  ),
};

export const Horizontal: Story = {
  args: { direction: 'horizontal', gap: 'sm' },
  render: (args) => (
    <Stack {...args}>
      <Pill label="Item 1" />
      <Pill label="Item 2" />
      <Pill label="Item 3" />
      <Pill label="Item 4" />
    </Stack>
  ),
};

export const GapScale: Story = {
  render: () => (
    <Stack gap="lg">
      {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((gap) => (
        <div key={gap}>
          <div className="mb-2 text-xs font-mono uppercase text-fd-muted-foreground">
            gap=&quot;{gap}&quot;
          </div>
          <Stack direction="horizontal" gap={gap}>
            <Pill label="A" />
            <Pill label="B" />
            <Pill label="C" />
          </Stack>
        </div>
      ))}
    </Stack>
  ),
};

export const ClusterChips: Story = {
  render: () => (
    <Cluster gap="xs">
      {['Browser', 'JWT', 'Express', 'Node.js', 'MongoDB', 'NestJS', 'Lambda', 'Vercel AI'].map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-medium text-orange-900 dark:text-orange-100"
        >
          {tag}
        </span>
      ))}
    </Cluster>
  ),
};
