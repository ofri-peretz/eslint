/**
 * SAFE - A React component whose destination is a literal path.
 */
export function DashboardLink() {
  return <a href="/dashboard" onClick={() => window.location.assign('/dashboard')}>Dashboard</a>;
}
