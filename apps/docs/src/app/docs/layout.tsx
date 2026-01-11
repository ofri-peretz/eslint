import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { SidebarShortcut } from '@/components/SidebarShortcut';
import { TeamSwitcher } from '@/components/TeamSwitcher';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DocsLayout 
      tree={source.getPageTree()} 
      {...baseOptions()}
      sidebar={{
        banner: <TeamSwitcher />,
        tabs: false,
      }}
    >
      <SidebarShortcut />
      {children}
    </DocsLayout>
  );
}
