'use client';

import { useBreadcrumb } from 'fumadocs-core/breadcrumb';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbProps {
  /**
   * Additional CSS classes for the breadcrumb container
   */
  className?: string;
  /**
   * The page tree from Fumadocs source
   */
  tree: any;
}

/**
 * Breadcrumb navigation component that displays the current page hierarchy.
 * Uses Fumadocs useBreadcrumb hook for automatic path resolution.
 *
 * Hierarchy: Home > Plugins > [Plugin Name] > Rules > [Rule Name]
 */
export function Breadcrumb({ className, tree }: BreadcrumbProps) {
  const pathname = usePathname();
  const items = useBreadcrumb(pathname, tree);

  // Don't render breadcrumb on home/root docs page
  if (pathname === '/docs' || pathname === '/docs/') {
    return null;
  }

  // Build URLs for items that don't have them by constructing from path segments
  const pathSegments = pathname.split('/').filter(Boolean);
  
  // Ensure every breadcrumb item has a valid URL by mapping segments
  const itemsWithUrls = items.map((item) => {
    if (item.url) return item;
    
    const name = item.name;
    if (name === null || name === undefined) return item;
    if (typeof name !== 'string' && typeof name !== 'number') return item;
    
    const nameStr = String(name);
    const normalizedName = nameStr.toLowerCase().replace(/s$/, '').replace(/ /g, '-');
    let segmentIndex = -1;
    
    // Search for a matching segment in the actual path
    for (let i = 0; i < pathSegments.length; i++) {
        const seg = pathSegments[i].toLowerCase();
        if (seg === normalizedName || seg === nameStr.toLowerCase() || seg.includes(normalizedName) || normalizedName.includes(seg)) {
            segmentIndex = i;
            break;
        }
    }

    if (segmentIndex !== -1) {
      return {
        ...item,
        url: '/' + pathSegments.slice(0, segmentIndex + 1).join('/'),
      };
    }
    return item;
  });

  // High-fidelity fix: ensure the current page is always the final breadcrumb item
  const lastSegment = pathSegments[pathSegments.length - 1];
  
  // Debug Data
  const debugData = {
    pathname,
    pathSegments,
    itemsFromHook: items.map(i => i.name)
  };
  
  const isTerminalPresent = itemsWithUrls.some(item => {
    const name = item.name;
    if (name === null || name === undefined) return false;
    if (typeof name !== 'string' && typeof name !== 'number') return false;
    
    const nameStr = String(name);
    const itemName = nameStr.toLowerCase().replace(/ /g, '-').replace(/s$/, '');
    const cleanLastSeg = lastSegment.toLowerCase().replace(/s$/, '');
    return itemName === cleanLastSeg || itemName.includes(cleanLastSeg) || cleanLastSeg.includes(itemName);
  });

  if (!isTerminalPresent && lastSegment) {
    const name = lastSegment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
      
    itemsWithUrls.push({
      name,
      url: pathname
    });
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`mb-6 pb-3 border-b border-fd-border ${className ?? ''}`}
    >
      <ol className="flex flex-row flex-wrap items-center gap-2 m-0 p-0 list-none text-sm">
        {/* Home link - Root Overview */}
        <li className="flex items-center">
          <Link 
            href="/docs" 
            className="p-1 rounded-md text-fd-muted-foreground hover:text-fd-primary hover:bg-fd-primary/10 transition-colors"
            title="Overview"
          >
            <Home className="size-4" aria-hidden="true" />
            <span className="sr-only">Overview</span>
          </Link>
        </li>

        {itemsWithUrls.map((item, index) => {
          const itemUrl = item.url || '';
          const isLast = index === itemsWithUrls.length - 1;

          return (
            <li key={itemUrl || index} className="flex items-center gap-2">
              <ChevronRight
                className="size-3.5 text-fd-muted-foreground opacity-40 shrink-0"
                aria-hidden="true"
              />
              {!isLast ? (
                <Link 
                  href={itemUrl} 
                  className="p-1 px-1.5 rounded-md text-fd-muted-foreground hover:text-fd-primary hover:bg-fd-primary/10 transition-colors whitespace-nowrap font-medium"
                >
                  {item.name}
                </Link>
              ) : (
                <span
                  className="p-1 px-1.5 text-fd-foreground font-semibold whitespace-nowrap bg-fd-primary/5 rounded-md border border-fd-primary/10"
                  aria-current="page"
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
