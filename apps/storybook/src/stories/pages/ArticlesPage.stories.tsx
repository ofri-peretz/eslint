import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArticleCard } from '@interlace/ui/blocks/article-card';
import { Badge } from '@interlace/ui/badge';
import { Button } from '@interlace/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@interlace/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@interlace/ui/pagination';
import {
  ArrowUpDown,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Sparkles,
} from 'lucide-react';

import { articleFixtures } from '@/fixtures/articles';

/**
 * Static composition of the /articles page surface — this is the axe gate's
 * page-level coverage. It exercises the toolbar (search + sort + filter),
 * a featured card, the article grid, and pagination, all using only
 * @interlace/ui primitives + the ArticleCard block. No app-specific state,
 * no router — this is a render-only contract.
 */
const meta: Meta = {
  title: 'Pages/ArticlesPage',
  parameters: {
    layout: 'fullscreen',
    a11y: {
      element: '#storybook-root',
      // The page-level story renders three live regions, a toolbar with
      // labelled controls, a featured-article landmark, the grid, and a
      // navigation. axe asserts every label, landmark, and contrast pair.
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

const tags = [
  ['security', 12],
  ['eslint', 28],
  ['nodejs', 9],
  ['typescript', 14],
  ['jwt', 5],
  ['static-analysis', 6],
  ['cwe', 3],
] as const;

function PageHeader() {
  return (
    <header className="mx-auto max-w-3xl space-y-4 text-center">
      <div className="bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium">
        <BookOpen className="size-4" aria-hidden="true" />
        <span>{articleFixtures.length * 7} Articles Published</span>
      </div>
      <h1 className="text-foreground text-4xl font-bold tracking-tight md:text-5xl">
        Technical Insights
      </h1>
      <p className="text-muted-foreground text-lg leading-relaxed">
        Deep dives into ESLint security, JavaScript performance, and modern
        development practices.
      </p>
    </header>
  );
}

function Toolbar() {
  return (
    <div
      role="search"
      aria-label="Filter articles"
      className="bg-card border-border rounded-xl border p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-md flex-1">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <label className="sr-only" htmlFor="search">
            Search articles
          </label>
          <input
            id="search"
            type="search"
            placeholder="Search articles…"
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/30 w-full rounded-lg border py-2.5 pr-3 pl-10 transition-colors focus:outline-none focus:ring-2"
          />
        </div>
        <Select defaultValue="date">
          <SelectTrigger className="w-[150px]" aria-label="Sort by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Latest</SelectItem>
            <SelectItem value="reactions">Popular</SelectItem>
            <SelectItem value="comments">Discussed</SelectItem>
            <SelectItem value="reading_time">Long Reads</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" aria-label="Toggle sort direction">
          <ArrowUpDown className="size-4" aria-hidden="true" />
        </Button>
        <Button variant="outline">
          <Filter className="mr-2 size-4" aria-hidden="true" />
          Filters
        </Button>
        <p
          className="text-muted-foreground ml-auto text-sm"
          aria-live="polite"
          role="status"
        >
          {articleFixtures.length} results
        </p>
      </div>
      <div className="border-border mt-4 border-t pt-4">
        <p className="text-muted-foreground mb-3 text-xs uppercase tracking-wide">
          Filter by topic
        </p>
        <div className="flex flex-wrap gap-2">
          {tags.map(([tag, count]) => (
            <Badge
              key={tag}
              variant="outline"
              className="cursor-pointer text-xs font-medium"
            >
              #{tag}
              <span className="bg-muted text-muted-foreground ml-1 rounded-full px-1.5 py-0.5 text-[10px]">
                {count}
              </span>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeaturedCard() {
  const f = articleFixtures[2];
  return (
    <a
      href={f.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Featured: ${f.title}`}
      className="from-primary/10 via-primary/5 border-primary/30 hover:border-primary/60 focus-visible:ring-ring relative block overflow-hidden rounded-2xl border-2 bg-gradient-to-br to-transparent p-6 transition-all hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:p-10"
    >
      <span className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
        <Sparkles className="size-3" aria-hidden="true" />
        Featured
      </span>
      <h2 className="text-foreground mt-4 text-2xl font-bold leading-tight md:text-3xl">
        {f.title}
      </h2>
      {f.description ? (
        <p className="text-muted-foreground mt-3 max-w-3xl text-base leading-relaxed">
          {f.description}
        </p>
      ) : null}
    </a>
  );
}

function PaginationDemo() {
  return (
    <Pagination className="pt-4" aria-label="Article pagination">
      <PaginationContent className="gap-2">
        <PaginationItem>
          <Button variant="outline" disabled>
            <ChevronLeft className="mr-1 size-4" aria-hidden="true" />
            Previous
          </Button>
        </PaginationItem>
        {[1, 2, 3, 4, 5].map((n) => (
          <PaginationItem key={n}>
            <Button
              variant={n === 1 ? 'default' : 'ghost'}
              size="sm"
              className="size-10"
              aria-current={n === 1 ? 'page' : undefined}
            >
              {n}
            </Button>
          </PaginationItem>
        ))}
        <PaginationItem>
          <Button variant="outline">
            Next
            <ChevronRight className="ml-1 size-4" aria-hidden="true" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export const Default: Story = {
  render: () => (
    <main className="bg-background min-h-screen">
      <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8">
        <PageHeader />
        <Toolbar />
        <FeaturedCard />
        <section aria-label="Articles grid">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articleFixtures.concat(articleFixtures).slice(0, 9).map((a, i) => (
              <ArticleCard key={`${a.href}-${i}`} {...a} />
            ))}
          </div>
        </section>
        <PaginationDemo />
        <p className="text-muted-foreground pt-8 text-center text-sm">
          Last synced: May 10, 2026, 3:21 PM
        </p>
      </div>
    </main>
  ),
};

export const Dark: Story = {
  globals: { theme: 'dark' },
  parameters: { backgrounds: { default: 'dark' } },
  render: () => (
    <div className="dark">
      <main className="bg-background min-h-screen">
        <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8">
          <PageHeader />
          <Toolbar />
          <FeaturedCard />
          <section aria-label="Articles grid">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articleFixtures.concat(articleFixtures).slice(0, 6).map((a, i) => (
                <ArticleCard key={`${a.href}-${i}`} {...a} />
              ))}
            </div>
          </section>
          <PaginationDemo />
        </div>
      </main>
    </div>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <main className="bg-background min-h-screen">
      <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8">
        <PageHeader />
        <Toolbar />
        <div
          className="bg-muted/50 border-border flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center"
          role="status"
        >
          <Search
            className="text-muted-foreground/50 mb-4 size-12"
            aria-hidden="true"
          />
          <h3 className="text-foreground mb-2 text-xl font-semibold">
            No articles found
          </h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or filters
          </p>
          <Button>Clear all filters</Button>
        </div>
      </div>
    </main>
  ),
};
