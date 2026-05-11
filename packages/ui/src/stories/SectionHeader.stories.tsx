import type { Meta, StoryObj } from '@storybook/react-vite';
import { Trophy } from 'lucide-react';
import { SectionHeader } from '../blocks/section-header.js';

const meta: Meta<typeof SectionHeader> = {
  title: 'Blocks/SectionHeader',
  component: SectionHeader,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The "text-center mb-12 + h2 + tagline" pattern from LAYOUT_PHILOSOPHY.md §1, lifted into a single primitive. Replaces six near-identical hand-coded section headers on the homepage.',
      },
    },
  },
  argTypes: {
    align: { control: 'select', options: ['center', 'start'] },
    spacing: { control: 'select', options: ['md', 'lg'] },
    as: { control: 'select', options: ['h1', 'h2', 'h3'] },
  },
};

export default meta;
type Story = StoryObj<typeof SectionHeader>;

export const Default: Story = {
  args: {
    title: 'See it in action',
    tagline:
      'Clean configuration, powerful protection. Works with ESLint 8 and 9, flat config or legacy.',
  },
};

export const WithEyebrow: Story = {
  args: {
    eyebrow: (
      <span className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-3 py-1 text-xs font-medium text-fd-muted-foreground">
        <Trophy className="size-3.5 text-orange-500" aria-hidden />
        Featured in DEV Community Top 7
      </span>
    ),
    title: 'Trusted by developers',
    tagline: 'Security insights from teams shipping production JavaScript.',
  },
};

export const TitleOnly: Story = {
  args: {
    title: 'How it works',
  },
};

export const LeftAligned: Story = {
  args: {
    title: 'Long-form rule docs',
    tagline:
      'When the section sits inside a prose-width container, the start alignment keeps the eye on the gutter.',
    align: 'start',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div>
      <SectionHeader title="Centered (default)" tagline="Tagline takes max-w-prose under the headline." />
      <SectionHeader
        align="start"
        title="Left-aligned"
        tagline="Used inside prose-width containers."
      />
      <SectionHeader
        eyebrow={
          <span className="rounded-full border border-fd-border bg-fd-card px-3 py-1 text-xs font-medium text-fd-muted-foreground">
            With eyebrow
          </span>
        }
        title="Eyebrow above"
        tagline="Use the eyebrow slot for chips / badges that frame the section."
      />
    </div>
  ),
};
