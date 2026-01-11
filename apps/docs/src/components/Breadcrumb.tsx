'use client';

import { useBreadcrumb } from 'fumadocs-core/breadcrumb';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { source } from '@/lib/source';

interface BreadcrumbProps {
  /**
   * Additional CSS classes for the breadcrumb container
   */
  className?: string;
}

/**
 * Breadcrumb navigation component that displays the current page hierarchy.
 * Uses Fumadocs useBreadcrumb hook for automatic path resolution.
 *
 * Hierarchy: Home > Plugins > [Plugin Name] > Rules > [Rule Name]
 */
export function Breadcrumb({ className }: BreadcrumbProps) {
  const pathname = usePathname();
  const tree = source.getPageTree();
  const items = useBreadcrumb(pathname, tree);

  // Don't render breadcrumb on home/root docs page
  if (pathname === '/docs' || pathname === '/docs/') {
    return null;
  }

  // Build URLs for items that don't have them by constructing from path segments
  const pathSegments = pathname.split('/').filter(Boolean);
  
  const itemsWithUrls = items.map((item, index) => {
    if (item.url) return item;
    
    // Construct URL from path segments up to this point
    // The first breadcrumb item corresponds to the first segment after /docs
    const segmentIndex = index + 2; // +2 because we skip "docs" and start from plugin name
    if (segmentIndex <= pathSegments.length) {
      const constructedUrl = '/' + pathSegments.slice(0, segmentIndex).join('/');
      return { ...item, url: constructedUrl };
    }
    
    return item;
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className={`breadcrumb-nav ${className ?? ''}`}
    >
      <ol className="breadcrumb-list">
        {/* Home link always first */}
        <li className="breadcrumb-item">
          <Link href="/docs" className="breadcrumb-link breadcrumb-home">
            <Home className="breadcrumb-home-icon" aria-hidden="true" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {itemsWithUrls.map((item, index) => {
          // Determine if this is the current page by comparing URLs
          // Parent folders should always be clickable, only current page is not
          const itemUrl = item.url || '';
          const isCurrentPage = itemUrl === pathname || itemUrl === pathname + '/';

          return (
            <li key={item.url ?? index} className="breadcrumb-item">
              <ChevronRight
                className="breadcrumb-separator"
                aria-hidden="true"
              />
              {!isCurrentPage && itemUrl ? (
                <Link href={itemUrl} className="breadcrumb-link">
                  {item.name}
                </Link>
              ) : (
                <span
                  className="breadcrumb-current"
                  aria-current={isCurrentPage ? 'page' : undefined}
                >
                  {item.name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
