import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { SidebarShortcut } from '@/components/SidebarShortcut';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DocsLayout 
      tree={source.getPageTree()} 
      {...baseOptions()}
      sidebar={{
        tabs: false,
      }}
    >
      <SidebarShortcut />
      {children}
    </DocsLayout>
  );
}
