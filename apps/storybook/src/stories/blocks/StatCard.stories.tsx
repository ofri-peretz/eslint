import type { Meta, StoryObj } from '@storybook/react-vite';
import { Activity, Download, Shield, TrendingUp } from 'lucide-react';
import { StatCard } from '@interlace/ui/blocks/stat-card';

const meta: Meta<typeof StatCard> = {
  title: 'Blocks/StatCard',
  component: StatCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A single labeled metric. Building block of dashboards, scorecards, and KPI rows. Numbers render with tabular numerals so digits don\'t jump as values update.',
      },
    },
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['default', 'success', 'warning', 'danger'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Weekly downloads',
    value: '70,348',
    delta: '+12.3% · 30d',
  },
};

export const WithIcon: Story = {
  args: {
    label: 'Rules shipped',
    value: '397',
    delta: '+24 this quarter',
    icon: <Shield className="size-4" />,
    tone: 'success',
  },
};

export const Grid: Story = {
  parameters: {
    docs: { description: { story: 'KPI row — typical dashboard composition.' } },
  },
  render: () => (
    <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Reach"
        value="103,412"
        delta="+8.2% · 30d"
        icon={<Activity className="size-4" />}
        tone="success"
      />
      <StatCard
        label="Stars"
        value="1,247"
        delta="+47 · 30d"
        icon={<TrendingUp className="size-4" />}
        tone="success"
      />
      <StatCard
        label="Downloads"
        value="70.3K"
        delta="+12.3% · 30d"
        icon={<Download className="size-4" />}
      />
      <StatCard
        label="Engagement rate"
        value="4.1%"
        delta="-0.2pp · 30d"
        tone="warning"
      />
    </div>
  ),
};

export const Tones: Story = {
  render: () => (
    <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Default" value="1,234" delta="+5% · 30d" tone="default" />
      <StatCard label="Success" value="98.3%" delta="+0.4pp" tone="success" />
      <StatCard label="Warning" value="412ms" delta="+18ms" tone="warning" />
      <StatCard label="Danger" value="3 issues" delta="+2 today" tone="danger" />
    </div>
  ),
};
