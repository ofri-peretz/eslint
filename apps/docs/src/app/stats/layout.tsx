import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return <HomeLayout {...baseOptions()}>{children}</HomeLayout>;
}
