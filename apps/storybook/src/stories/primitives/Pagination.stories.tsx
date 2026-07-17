import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@interlace/ui/pagination';
import { withDark, withRtl } from '@/decorators';

const meta: Meta<typeof Pagination> = {
  title: 'Primitives/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Classic numbered pagination per `PAGINATION_PHILOSOPHY.md` — explicit page links, URL state, never infinite scroll. The active page is marked with `aria-current="page"` for assistive tech.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  // Pagination anchors are `size-9` (36×36 — well above WCAG 2.2's 24×24
  // target-size threshold). The earlier suppression existed because the
  // adjacent `gap-1` (4px) put axe's spacing-exception circle math into a
  // borderline state. Override the default content gap to a comfortable
  // `gap-2` (8px) — boundary-to-boundary spacing is now well clear of the
  // target-size threshold, and the suppression is no longer needed.
  render: () => (
    <Pagination>
      <PaginationContent className="gap-2">
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" active>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
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
