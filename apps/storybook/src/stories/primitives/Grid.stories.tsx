import type { Meta, StoryObj } from '@storybook/react-vite';
import { Grid, GridItem } from '@interlace/ui/grid';
import { withDark, withRtl } from '@/decorators';

const meta: Meta<typeof Grid> = {
  title: 'Primitives/Grid',
  component: Grid,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Two-dimensional layout primitive on top of the foundation spacing scale. `cols` / `mdCols` / `lgCols` declare responsive column counts; `gap` reuses the six-step `--spacing-*` token set.',
      },
    },
  },
  argTypes: {
    cols: { control: 'select', options: [1, 2, 3, 4, 6, 12] },
    gap: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
};

export default meta;
type Story = StoryObj<typeof Grid>;

const Cell = ({ label }: { label: string }) => (
  <div className="rounded-md border border-fd-border bg-fd-card/40 px-4 py-3 text-sm">
    {label}
  </div>
);

export const Default: Story = {
  args: { cols: 3, gap: 'md' },
  render: (args) => (
    <Grid {...args}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Cell key={i} label={`Cell ${i + 1}`} />
      ))}
    </Grid>
  ),
};

export const Responsive: Story = {
  render: () => (
    <Grid cols={1} mdCols={2} lgCols={4} gap="md">
      {Array.from({ length: 8 }).map((_, i) => (
        <Cell key={i} label={`Cell ${i + 1}`} />
      ))}
    </Grid>
  ),
};

export const WithSpan: Story = {
  render: () => (
    <Grid cols={6} gap="md">
      <GridItem span={2}><Cell label="span 2" /></GridItem>
      <GridItem span={4}><Cell label="span 4" /></GridItem>
      <GridItem span={3}><Cell label="span 3" /></GridItem>
      <GridItem span={3}><Cell label="span 3" /></GridItem>
    </Grid>
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
