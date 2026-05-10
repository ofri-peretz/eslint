import type { Meta, StoryObj } from '@storybook/react-vite';
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
