import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@interlace/ui/pagination';

interface ChangelogPaginationProps {
  page: number;
  pageCount: number;
  pkg?: string;
}

/** Preserve the active filter across page links, so paging never silently widens the view. */
function href(page: number, pkg?: string): string {
  const params = new URLSearchParams();
  if (pkg) params.set('pkg', pkg);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/changelog?${query}` : '/changelog';
}

/**
 * A window of page numbers around the current one.
 *
 * 449 releases is ~23 pages today and grows every week; rendering every number
 * turns the control into its own scrolling problem. Five is enough to show
 * position and offer a jump without becoming furniture.
 */
function pageWindow(page: number, pageCount: number): number[] {
  const size = Math.min(5, pageCount);
  let start = Math.max(1, page - Math.floor(size / 2));
  if (start + size - 1 > pageCount) start = pageCount - size + 1;
  return Array.from({ length: size }, (_, i) => start + i);
}

/**
 * Classic pagination with URL state, per PAGINATION_PHILOSOPHY.md — never
 * infinite scroll. A changelog is a reference document: people deep-link into
 * it, come back to it, and need the browser's back button to work.
 */
export function ChangelogPagination({
  page,
  pageCount,
  pkg,
}: ChangelogPaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <Pagination className="mt-12">
      <PaginationContent>
        {page > 1 ? (
          <PaginationItem>
            <PaginationPrevious href={href(page - 1, pkg)} />
          </PaginationItem>
        ) : null}

        {pageWindow(page, pageCount).map((n) => (
          <PaginationItem key={n}>
            <PaginationLink href={href(n, pkg)} active={n === page}>
              {n}
            </PaginationLink>
          </PaginationItem>
        ))}

        {page < pageCount ? (
          <PaginationItem>
            <PaginationNext href={href(page + 1, pkg)} />
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </Pagination>
  );
}
