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

// ─── Contract locks (play functions assert testids + DOM contract) ───────────
// These lock the component's contract — testid surface, link semantics, tag
// overflow math, FEATURED chip semantics, Parity diff. They sit on inline
// baseArgs (independent of articleFixtures) so they can't be invalidated by a
// fixture refactor.

const lockArgs = {
  title: 'How we shipped strict accessibility in our docs site',
  description:
    'A walkthrough of axe-core, color contrast, reduced motion, and the layered self-test model.',
  href: 'https://example.com/post',
  imageUrl:
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80&auto=format&fit=crop',
  tags: ['accessibility', 'tailwind', 'fumadocs'],
  author: {
    name: 'Ofri Peretz',
    imageUrl:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&q=80&auto=format&fit=crop',
  },
  publishedAt: '2026-05-10',
  meta: { reactions: 42, comments: 8, readingTimeMinutes: 7, views: 1240 },
  sourceLabel: 'Dev.to',
};

export const StackContract: Story = {
  args: { ...lockArgs, variant: 'stack' },
  decorators: [(Story) => <div style={{ width: 360 }}><Story /></div>],
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Rendered as a single link wrapping the whole card', async () => {
      const link = canvas.getByRole('link');
      expect(link).toHaveAttribute('href', lockArgs.href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('data-slot', 'article-card');
      expect(link).toHaveAttribute('data-variant', 'stack');
    });

    await step('Shows title, description, and tags', async () => {
      expect(canvas.getByTestId('article-card-title')).toHaveTextContent(lockArgs.title);
      expect(canvas.getByTestId('article-card-description')).toHaveTextContent(
        lockArgs.description,
      );
      const tagBlock = canvas.getByTestId('article-card-tags');
      for (const tag of lockArgs.tags) {
        expect(tagBlock).toHaveTextContent(`#${tag}`);
      }
    });

    await step('Renders all four meta chips with stable text', async () => {
      expect(canvas.getByTestId('article-card-meta-reactions')).toHaveTextContent('42');
      expect(canvas.getByTestId('article-card-meta-comments')).toHaveTextContent('8');
      expect(canvas.getByTestId('article-card-meta-reading-time')).toHaveTextContent('7 min');
      // 1240 views renders abbreviated.
      expect(canvas.getByTestId('article-card-meta-views')).toHaveTextContent('1.2k');
    });

    await step('Shows source label, no FEATURED chip in stack mode', async () => {
      expect(canvas.getByTestId('article-card-source')).toHaveTextContent('Dev.to');
      expect(canvas.queryByTestId('article-card-featured-chip')).toBeNull();
    });
  },
};

export const StackTagOverflow: Story = {
  args: {
    ...lockArgs,
    variant: 'stack',
    tags: ['accessibility', 'tailwind', 'fumadocs', 'mdx', 'next', 'react'],
  },
  decorators: [(Story) => <div style={{ width: 360 }}><Story /></div>],
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('First 3 tags shown verbatim', async () => {
      const tags = canvas.getByTestId('article-card-tags');
      expect(tags).toHaveTextContent('#accessibility');
      expect(tags).toHaveTextContent('#tailwind');
      expect(tags).toHaveTextContent('#fumadocs');
    });
    await step('Remaining tags collapse into +N chip (6 total → +3)', async () => {
      const tags = canvas.getByTestId('article-card-tags');
      expect(tags).toHaveTextContent('+3');
      expect(tags).not.toHaveTextContent('#mdx');
      expect(tags).not.toHaveTextContent('#next');
      expect(tags).not.toHaveTextContent('#react');
    });
  },
};

export const StackMinimal: Story = {
  args: {
    title: 'Minimal card: only title + href',
    href: 'https://example.com',
    variant: 'stack',
  },
  decorators: [(Story) => <div style={{ width: 360 }}><Story /></div>],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('link')).toBeInTheDocument();
    expect(canvas.getByTestId('article-card-title')).toBeInTheDocument();
    expect(canvas.queryByTestId('article-card-meta-reactions')).toBeNull();
    expect(canvas.queryByTestId('article-card-meta-comments')).toBeNull();
    expect(canvas.queryByTestId('article-card-meta-reading-time')).toBeNull();
    expect(canvas.queryByTestId('article-card-meta-views')).toBeNull();
    expect(canvas.queryByTestId('article-card-featured-chip')).toBeNull();
  },
};

export const OverlayContract: Story = {
  args: { ...lockArgs, variant: 'overlay' },
  decorators: [(Story) => <div style={{ width: 760 }}><Story /></div>],
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Single link with overlay variant marker', async () => {
      const link = canvas.getByRole('link');
      expect(link).toHaveAttribute('href', lockArgs.href);
      expect(link).toHaveAttribute('data-variant', 'overlay');
    });

    await step('FEATURED chip shown (top-left)', async () => {
      expect(canvas.getByTestId('article-card-featured-chip')).toHaveTextContent(/featured/i);
    });

    await step('Title, description, tags, source, meta all present', async () => {
      expect(canvas.getByTestId('article-card-title')).toHaveTextContent(lockArgs.title);
      expect(canvas.getByTestId('article-card-description')).toHaveTextContent(lockArgs.description);
      expect(canvas.getByTestId('article-card-tags')).toHaveTextContent('#accessibility');
      expect(canvas.getByTestId('article-card-source')).toHaveTextContent('Dev.to');
      expect(canvas.getByTestId('article-card-meta-reactions')).toHaveTextContent('42');
      expect(canvas.getByTestId('article-card-meta-views')).toHaveTextContent('1.2k');
    });
  },
};

export const OverlayWithoutCover: Story = {
  args: { ...lockArgs, variant: 'overlay', imageUrl: undefined },
  decorators: [(Story) => <div style={{ width: 760 }}><Story /></div>],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId('article-card-featured-chip')).toBeInTheDocument();
    // Title appears in both the gradient fallback and the body.
    const titleMatches = canvas.getAllByText(lockArgs.title);
    expect(titleMatches.length).toBeGreaterThanOrEqual(2);
  },
};

/**
 * Visual diff guard: overlay + 3 stack cards side by side. If you change
 * either variant in a way that breaks parity-of-anatomy, this lays it bare.
 */
export const Parity: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="space-y-6 p-6 bg-fd-background">
      <ArticleCard {...lockArgs} variant="overlay" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ArticleCard {...lockArgs} variant="stack" />
        <ArticleCard {...lockArgs} variant="stack" title="Another grid card with a longer headline that wraps to two lines" />
        <ArticleCard {...lockArgs} variant="stack" imageUrl={undefined} title="Third tile uses the gradient title fallback" />
      </div>
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('1 overlay + 3 stack cards render', async () => {
      const links = canvasElement.querySelectorAll('a[data-slot="article-card"]');
      expect(links.length).toBe(4);

      const overlayLinks = canvasElement.querySelectorAll('a[data-variant="overlay"]');
      expect(overlayLinks.length).toBe(1);

      const stackLinks = canvasElement.querySelectorAll('a[data-variant="stack"]');
      expect(stackLinks.length).toBe(3);
    });

    await step('Only the overlay card carries the FEATURED chip', async () => {
      const featuredChips = canvas.queryAllByTestId('article-card-featured-chip');
      expect(featuredChips.length).toBe(1);
    });
  },
};
