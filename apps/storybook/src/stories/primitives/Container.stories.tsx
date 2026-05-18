import type { Meta, StoryObj } from '@storybook/react-vite';
import { Container } from '@interlace/ui/container';

const meta: Meta<typeof Container> = {
  title: 'Primitives/Container',
  component: Container,
  parameters: {
    docs: {
      description: {
        component:
          'Width contract from LAYOUT_PHILOSOPHY.md §2. Four sizes only — mixing ad-hoc `max-w-3xl` / `max-w-5xl` is forbidden. Owns the responsive horizontal padding scale `px-4 sm:px-6 lg:px-8`.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['prose', 'content', 'wide', 'full'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Container>;

const Sample = ({ label }: { label: string }) => (
  <div className="rounded-md border border-dashed border-fd-border bg-fd-card/40 p-6 text-sm text-fd-muted-foreground">
    {label} — children fit inside the configured max-width with responsive horizontal padding.
  </div>
);

export const Prose: Story = {
  args: { size: 'prose' },
  render: (args) => (
    <Container {...args}>
      <Sample label="size=prose (65ch)" />
    </Container>
  ),
};

export const Content: Story = {
  args: { size: 'content' },
  render: (args) => (
    <Container {...args}>
      <Sample label="size=content (1024px) — default for landing sections" />
    </Container>
  ),
};

export const Wide: Story = {
  args: { size: 'wide' },
  render: (args) => (
    <Container {...args}>
      <Sample label="size=wide (1280px) — card-grid heavy sections" />
    </Container>
  ),
};

export const Full: Story = {
  args: { size: 'full' },
  render: (args) => (
    <Container {...args}>
      <Sample label="size=full (no max-width) — full-bleed hero, decorative bands" />
    </Container>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['prose', 'content', 'wide', 'full'] as const).map((size) => (
        <Container key={size} size={size}>
          <Sample label={`size=${size}`} />
        </Container>
      ))}
    </div>
  ),
};
