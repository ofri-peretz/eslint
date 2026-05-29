/**
 * "use client" tier indicator. Server primitives are the default in
 * @interlace/ui (DESIGN_PRINCIPLES #11); client tier is reserved for
 * interactivity / hooks / Base UI client surfaces.
 */
type Props = { isClient: boolean };

export function ClientServerBadge({ isClient }: Props) {
  if (isClient) {
    return (
      <span
        title="Renders on the client. Includes the React 'use client' directive — required by hooks / Base UI client surfaces."
        className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 font-mono text-xs text-sky-600 dark:text-sky-300"
      >
        <span aria-hidden>⚡</span>
        <span>client</span>
      </span>
    );
  }
  return (
    <span
      title="Server-component-safe. Renders during SSR / RSC without hydration."
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-600 dark:text-emerald-300"
    >
      <span aria-hidden>◐</span>
      <span>server</span>
    </span>
  );
}
