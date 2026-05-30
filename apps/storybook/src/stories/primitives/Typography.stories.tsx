import type { Meta, StoryObj } from '@storybook/react-vite';
import { Typography } from '@interlace/ui/typography';
import { withDark, withRtl } from '@/decorators';

const meta: Meta<typeof Typography> = {
  title: 'Primitives/Typography',
  component: Typography,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The DS text primitive. Variants map to the `--text-*` token scale (h1..h6, body, long, ui, ui-sm, caption, code). `tone` / `align` / `lineClamp` are independent axes. RSC-safe.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'long', 'ui', 'ui-sm', 'caption', 'code'],
    },
    tone: { control: 'select', options: ['default', 'muted', 'primary', 'destructive'] },
    align: { control: 'select', options: ['start', 'center', 'end'] },
  },
};

export default meta;
type Story = StoryObj<typeof Typography>;

export const Default: Story = {
  args: { variant: 'body', children: 'The quick brown fox jumps over the lazy dog.' },
};

export const Headings: Story = {
  render: () => (
    <div className="space-y-3">
      <Typography variant="h1">Heading 1 — the display top of the scale</Typography>
      <Typography variant="h2">Heading 2 — section break</Typography>
      <Typography variant="h3">Heading 3 — sub-section</Typography>
      <Typography variant="h4">Heading 4 — block heading</Typography>
      <Typography variant="h5">Heading 5 — inline heading</Typography>
      <Typography variant="h6">Heading 6 — caption-sized heading</Typography>
    </div>
  ),
};

export const Body: Story = {
  render: () => (
    <div className="space-y-3 max-w-prose">
      <Typography variant="body">
        Body text is the default reading surface — 16/24, comfortable measure (~65ch), and the line-height
        balances dense UI against long-form prose.
      </Typography>
      <Typography variant="long">
        Long-form text bumps to 17/28 for sustained reading. Use it for article bodies, philosophy
        documents, and anything the reader is expected to scan deeply rather than glance at.
      </Typography>
      <Typography variant="ui">UI text — labels, buttons, controls.</Typography>
      <Typography variant="ui-sm">UI small — dense tables, meta info.</Typography>
      <Typography variant="caption">Caption — secondary metadata or attribution.</Typography>
      <Typography variant="code">const code = &quot;mono inline&quot;;</Typography>
    </div>
  ),
};

export const Tones: Story = {
  render: () => (
    <div className="space-y-2">
      <Typography tone="default">Default tone.</Typography>
      <Typography tone="muted">Muted tone — for secondary content.</Typography>
      <Typography tone="primary">Primary tone — for accent emphasis.</Typography>
      <Typography tone="destructive">Destructive tone — for warnings.</Typography>
    </div>
  ),
};

export const Dark: Story = {
  ...Headings,
  decorators: [withDark],
};

export const RTL: Story = {
  ...Headings,
  decorators: [withRtl],
};
