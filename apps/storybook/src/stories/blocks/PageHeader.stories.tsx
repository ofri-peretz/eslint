import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus } from 'lucide-react';
import { Button } from '@interlace/ui/button';
import { PageHeader } from '@interlace/ui/blocks/page-header';

const meta: Meta<typeof PageHeader> = {
  title: 'Blocks/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Top-of-page header for admin / docs / settings surfaces. Breadcrumb + title + description + actions slot, all renders as a real <header> landmark.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Plugin catalog',
    description: 'Every Interlace ESLint plugin and its rules, grouped by domain.',
  },
};

export const WithActions: Story = {
  args: {
    title: 'Rules',
    description: '397 rules across 9 OWASP categories.',
    actions: (
      <Button>
        <Plus className="mr-1 size-4" aria-hidden />
        Add rule
      </Button>
    ),
  },
};

export const WithBreadcrumbAndMeta: Story = {
  args: {
    breadcrumb: (
      <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
        <a href="#" className="hover:text-foreground">
          Plugins
        </a>
        <span className="px-2" aria-hidden>
          /
        </span>
        <span>node-security</span>
      </nav>
    ),
    title: 'eslint-plugin-node-security',
    description: '42 rules locking down Node, Express, and MongoDB attack surfaces.',
    meta: (
      <>
        <span>v2.4.1</span>
        <span>·</span>
        <span>MIT license</span>
        <span>·</span>
        <span>70.3K weekly downloads</span>
      </>
    ),
    actions: <Button variant="outline">Install</Button>,
  },
};
