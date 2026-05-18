import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section } from '@interlace/ui/section';
import { withDark, withRtl } from '@/decorators';

const meta: Meta<typeof Section> = {
  title: 'Primitives/Section',
  component: Section,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Vertical rhythm + tone + dividers + container — from LAYOUT_PHILOSOPHY.md §7-8. Pages compose `<Section>` × N; the page file describes what is *in* each section, never what each section wrapper looks like.',
      },
    },
  },
  argTypes: {
    spacing: { control: 'select', options: ['tight', 'comfortable', 'spacious', 'none'] },
    tone: { control: 'select', options: ['default', 'muted', 'inset'] },
    divider: { control: 'select', options: ['none', 'top', 'bottom', 'both'] },
    container: { control: 'select', options: ['prose', 'content', 'wide', 'full'] },
  },
};

export default meta;
type Story = StoryObj<typeof Section>;

const SectionBody = ({ label }: { label: string }) => (
  <div className="rounded-md border border-dashed border-fd-border bg-fd-card/40 p-6 text-sm text-fd-muted-foreground">
    {label}
  </div>
);

export const Default: Story = {
  args: { spacing: 'comfortable', tone: 'default', divider: 'none', container: 'content' },
  render: (args) => (
    <Section {...args}>
      <SectionBody label="Default — comfortable spacing, no tone, no divider, content container." />
    </Section>
  ),
};

export const MutedWithDivider: Story = {
  args: { spacing: 'comfortable', tone: 'muted', divider: 'both', container: 'wide' },
  render: (args) => (
    <Section {...args}>
      <SectionBody label="tone='muted' + divider='both' + container='wide' — the 'What it catches' geometry on the home." />
    </Section>
  ),
};

export const InsetStrip: Story = {
  args: { spacing: 'tight', tone: 'inset', divider: 'both', container: 'content' },
  render: (args) => (
    <Section {...args}>
      <div className="grid grid-cols-4 gap-6 text-center">
        <div><div className="text-3xl font-bold">18</div><div className="text-xs uppercase text-fd-muted-foreground">Plugins</div></div>
        <div><div className="text-3xl font-bold">350+</div><div className="text-xs uppercase text-fd-muted-foreground">Rules</div></div>
        <div><div className="text-3xl font-bold">11</div><div className="text-xs uppercase text-fd-muted-foreground">Security</div></div>
        <div><div className="text-3xl font-bold">7</div><div className="text-xs uppercase text-fd-muted-foreground">Quality</div></div>
      </div>
    </Section>
  ),
};

export const SpacingScale: Story = {
  render: () => (
    <div>
      {(['tight', 'comfortable', 'spacious'] as const).map((spacing) => (
        <Section key={spacing} spacing={spacing} divider="bottom" tone={spacing === 'comfortable' ? 'muted' : 'default'}>
          <SectionBody label={`spacing="${spacing}"`} />
        </Section>
      ))}
    </div>
  ),
};

export const ToneVariants: Story = {
  render: () => (
    <div>
      <Section spacing="comfortable" tone="default" divider="bottom">
        <SectionBody label='tone="default" — no background' />
      </Section>
      <Section spacing="comfortable" tone="muted" divider="bottom">
        <SectionBody label='tone="muted" — bg-fd-card/30' />
      </Section>
      <Section spacing="comfortable" tone="inset" divider="bottom">
        <SectionBody label='tone="inset" — bg-fd-card/50 with backdrop-blur' />
      </Section>
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
