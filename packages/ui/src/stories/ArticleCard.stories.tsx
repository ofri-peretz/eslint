import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { ArticleCard } from '../blocks/article-card.js';

/**
 * `ArticleCard` is the single source of truth for article tiles across the
 * site (article grids, "featured article" heroes, external content lists,
 * Dev.to / Medium aggregations).
 *
 * Two layouts, **one component**:
 *  - `variant='stack'` (default) — image on top, content below. Used in grids.
 *  - `variant='overlay'` — image fills the whole card; content sits on a dark
 *    scrim. Shows a FEATURED chip. Used for hero / featured-article slots.
 *
 * These stories lock the visual + interactive contract in place so we never
 * regress the cards again. Every story is scanned by axe-core
 * (WCAG 2 A/AA/AAA + 2.1 + 2.2 + best-practice + ACT) on every CI run via
 * Storybook test-runner — see `packages/ui/.storybook/test-runner.ts`.
 */
const meta: Meta<typeof ArticleCard> = {
  title: 'Blocks/ArticleCard',
  component: ArticleCard,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['stack', 'overlay'],
      description:
        'Visual layout. `stack` = image-on-top grid card. `overlay` = full-image hero with content on a scrim.',
      table: { defaultValue: { summary: 'stack' } },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ArticleCard>;

const baseArgs = {
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
  meta: {
    reactions: 42,
    comments: 8,
    readingTimeMinutes: 7,
    views: 1240,
  },
  sourceLabel: 'Dev.to',
};

// -----------------------------------------------------------------------------
// Stack variant (default — the grid card)
// -----------------------------------------------------------------------------

/** Canonical grid card with image, author, tags, description, and meta footer. */
export const Stack: Story = {
  args: { ...baseArgs, variant: 'stack' },
  render: (args) => (
    <div style={{ width: 360 }}>
      <ArticleCard {...args} />
    </div>
  ),
  /**
   * Interaction contract — these are the invariants that must never regress
   * for grid cards. If any of these fail, the card has drifted from spec.
   */
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Rendered as a single link wrapping the whole card', async () => {
      const link = canvas.getByRole('link');
      expect(link).toHaveAttribute('href', baseArgs.href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('data-slot', 'article-card');
      expect(link).toHaveAttribute('data-variant', 'stack');
    });

    await step('Shows title, description, and tags', async () => {
      expect(canvas.getByTestId('article-card-title')).toHaveTextContent(baseArgs.title);
      expect(canvas.getByTestId('article-card-description')).toHaveTextContent(
        baseArgs.description,
      );
      const tagBlock = canvas.getByTestId('article-card-tags');
      for (const tag of baseArgs.tags) {
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

    await step('Shows the source label, no FEATURED chip in stack mode', async () => {
      expect(canvas.getByTestId('article-card-source')).toHaveTextContent('Dev.to');
      expect(canvas.queryByTestId('article-card-featured-chip')).toBeNull();
    });

    await step('Link is keyboard-focusable', async () => {
      const link = canvas.getByRole('link');
      link.focus();
      expect(link).toHaveFocus();
    });
  },
};

/** No cover image — the gradient title fallback takes over. */
export const StackWithoutCover: Story = {
  args: { ...baseArgs, variant: 'stack', imageUrl: undefined },
  render: (args) => (
    <div style={{ width: 360 }}>
      <ArticleCard {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // No <img>, but the title appears both in the cover fallback and in the body.
    const titleMatches = canvas.getAllByText(baseArgs.title);
    expect(titleMatches.length).toBeGreaterThanOrEqual(2);
  },
};

/**
 * Many tags — the card renders the first 3 as `#tag` badges and collapses
 * the rest into a `+N` overflow chip. Locks the overflow math.
 */
export const StackWithTagOverflow: Story = {
  args: {
    ...baseArgs,
    variant: 'stack',
    tags: ['accessibility', 'tailwind', 'fumadocs', 'mdx', 'next', 'react'],
  },
  render: (args) => (
    <div style={{ width: 360 }}>
      <ArticleCard {...args} />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('First 3 tags are shown verbatim', async () => {
      const tags = canvas.getByTestId('article-card-tags');
      expect(tags).toHaveTextContent('#accessibility');
      expect(tags).toHaveTextContent('#tailwind');
      expect(tags).toHaveTextContent('#fumadocs');
    });
    await step('Remaining tags collapse into +N chip (6 total → +3)', async () => {
      const tags = canvas.getByTestId('article-card-tags');
      expect(tags).toHaveTextContent('+3');
      // The 4th+ tags must NOT render as individual badges.
      expect(tags).not.toHaveTextContent('#mdx');
      expect(tags).not.toHaveTextContent('#next');
      expect(tags).not.toHaveTextContent('#react');
    });
  },
};

/** Sparse data — only required fields. The card still renders cleanly. */
export const StackMinimal: Story = {
  args: {
    title: 'Minimal card: only title + href',
    href: 'https://example.com',
    variant: 'stack',
  },
  render: (args) => (
    <div style={{ width: 360 }}>
      <ArticleCard {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('link')).toBeInTheDocument();
    expect(canvas.getByTestId('article-card-title')).toBeInTheDocument();
    // No meta → no meta chips.
    expect(canvas.queryByTestId('article-card-meta-reactions')).toBeNull();
    expect(canvas.queryByTestId('article-card-meta-comments')).toBeNull();
    expect(canvas.queryByTestId('article-card-meta-reading-time')).toBeNull();
    expect(canvas.queryByTestId('article-card-meta-views')).toBeNull();
    // No FEATURED chip on stack.
    expect(canvas.queryByTestId('article-card-featured-chip')).toBeNull();
  },
};

// -----------------------------------------------------------------------------
// Overlay variant (full-image hero — the "featured article" treatment)
// -----------------------------------------------------------------------------

/**
 * Canonical overlay card — full-image cover with content over a scrim.
 * This is what the `/articles` page renders for the featured slot.
 */
export const Overlay: Story = {
  args: { ...baseArgs, variant: 'overlay' },
  render: (args) => (
    <div style={{ width: 760 }}>
      <ArticleCard {...args} />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Rendered as a single link with overlay variant marker', async () => {
      const link = canvas.getByRole('link');
      expect(link).toHaveAttribute('href', baseArgs.href);
      expect(link).toHaveAttribute('data-variant', 'overlay');
    });

    await step('FEATURED chip is shown (top-left)', async () => {
      expect(canvas.getByTestId('article-card-featured-chip')).toHaveTextContent(/featured/i);
    });

    await step('Title, description, tags, source label, and meta are all present', async () => {
      expect(canvas.getByTestId('article-card-title')).toHaveTextContent(baseArgs.title);
      expect(canvas.getByTestId('article-card-description')).toHaveTextContent(
        baseArgs.description,
      );
      expect(canvas.getByTestId('article-card-tags')).toHaveTextContent('#accessibility');
      expect(canvas.getByTestId('article-card-source')).toHaveTextContent('Dev.to');
      expect(canvas.getByTestId('article-card-meta-reactions')).toHaveTextContent('42');
      expect(canvas.getByTestId('article-card-meta-views')).toHaveTextContent('1.2k');
    });

    await step('Link is keyboard-focusable', async () => {
      const link = canvas.getByRole('link');
      link.focus();
      expect(link).toHaveFocus();
    });
  },
};

/** Overlay variant without a cover image — gradient fallback shows the title. */
export const OverlayWithoutCover: Story = {
  args: { ...baseArgs, variant: 'overlay', imageUrl: undefined },
  render: (args) => (
    <div style={{ width: 760 }}>
      <ArticleCard {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId('article-card-featured-chip')).toBeInTheDocument();
    // Title appears in both the gradient fallback and the body.
    const titleMatches = canvas.getAllByText(baseArgs.title);
    expect(titleMatches.length).toBeGreaterThanOrEqual(2);
  },
};

/**
 * Both variants side by side — visual diff guard. If you change either
 * layout in a way that breaks parity-of-anatomy, this story will look wrong.
 * Useful as the canonical "are the cards consistent?" reference in Storybook.
 */
export const Parity: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="space-y-6 p-6 bg-fd-background">
      <ArticleCard {...baseArgs} variant="overlay" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ArticleCard {...baseArgs} variant="stack" />
        <ArticleCard {...baseArgs} variant="stack" title="Another grid card with a longer headline that wraps to two lines" />
        <ArticleCard {...baseArgs} variant="stack" imageUrl={undefined} title="Third tile uses the gradient title fallback" />
      </div>
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('Exactly one overlay card + three stack cards render', async () => {
      // 4 cards total → 4 links with data-slot="article-card".
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
