import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

// Same wrapper as /stats, /scorecard, /articles: without HomeLayout the
// page renders bare — no site nav, no way back home (reported 2026-08-24).
export default function ChangelogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HomeLayout {...baseOptions()}>{children}</HomeLayout>;
}
