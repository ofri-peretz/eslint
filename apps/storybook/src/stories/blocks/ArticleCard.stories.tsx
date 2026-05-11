import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ArticleCard } from '@interlace/ui/blocks/article-card';
import { articleFixtures } from '@/fixtures/articles';

const meta: Meta<typeof ArticleCard> = {
  title: 'Blocks/ArticleCard',
  component: ArticleCard,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof ArticleCard>;

export const Default: Story = {
  args: articleFixtures[0],
  decorators: [
    (Story) => (
      <div className="w-[380px]">
        <Story />
      </div>
    ),
  ],
};

export const WithoutImage: Story = {
  args: articleFixtures[1],
  decorators: [
    (Story) => (
      <div className="w-[380px]">
        <Story />
      </div>
    ),
  ],
};

export const ManyTags: Story = {
  args: {
    ...articleFixtures[0],
    tags: ['security', 'eslint', 'nodejs', 'static-analysis', 'taint', 'cwe'],
  },
  decorators: [
    (Story) => (
      <div className="w-[380px]">
        <Story />
      </div>
    ),
  ],
};

export const Dark: Story = {
  args: articleFixtures[2],
  globals: { theme: 'dark' },
  parameters: { backgrounds: { default: 'dark' } },
  decorators: [
    (Story) => (
      <div className="w-[380px] dark">
        <Story />
      </div>
    ),
  ],
};

export const Grid: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="grid grid-cols-1 gap-6 p-8 md:grid-cols-2 lg:grid-cols-3">
      {articleFixtures.map((a) => (
        <ArticleCard key={a.href} {...a} />
      ))}
    </div>
  ),
};

// ─── LCP priority lock ────────────────────────────────────────────────────────
// The `/articles` page renders one featured overlay above the fold; that
// cover image is the LCP element and must opt into eager loading +
// fetchpriority="high". These stories lock that contract and are scanned by
// axe via the storybook a11y workflow.

/** Cover image eager-loaded + high priority — the featured/overlay slot. */
export const OverlayPriority: Story = {
  args: { ...articleFixtures[0], variant: 'overlay', priority: true },
  decorators: [
    (Story) => (
      <div className="w-[760px]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole('link');
    const img = link.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('fetchpriority', 'high');
  },
};

/** Default overlay (no priority hint) — cover stays lazy + auto-priority. */
export const OverlayLazy: Story = {
  args: { ...articleFixtures[0], variant: 'overlay' },
  decorators: [
    (Story) => (
      <div className="w-[760px]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole('link');
    const img = link.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('fetchpriority', 'auto');
  },
};

/** Stack variant honouring the priority hint — useful for above-the-fold grid tiles. */
export const StackPriority: Story = {
  args: { ...articleFixtures[0], variant: 'stack', priority: true },
  decorators: [
    (Story) => (
      <div className="w-[380px]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole('link');
    const img = link.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('fetchpriority', 'high');
  },
};
