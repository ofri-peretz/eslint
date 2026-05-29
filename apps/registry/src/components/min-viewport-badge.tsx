/**
 * `MIN_VIEWPORT` declared by a primitive (DESIGN_PRINCIPLES #14). Rendered as
 * a chip that links to the principle so reviewers can jump straight to the
 * contract.
 */
type Props = { value: number };

const TONE: Record<number, { bg: string; ring: string; tag: string }> = {
  320: { bg: 'bg-emerald-500/10', ring: 'border-emerald-500/40', tag: 'text-emerald-600 dark:text-emerald-300' },
  480: { bg: 'bg-amber-500/10', ring: 'border-amber-500/40', tag: 'text-amber-600 dark:text-amber-300' },
  768: { bg: 'bg-rose-500/10', ring: 'border-rose-500/40', tag: 'text-rose-600 dark:text-rose-300' },
};

export function MinViewportBadge({ value }: Props) {
  const tone = TONE[value] ?? TONE[320];
  return (
    <span
      title={`Renders cleanly at ${value} CSS px and above. Below it, the preflight contract draws a dev-mode outline.`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs ${tone.bg} ${tone.ring} ${tone.tag}`}
    >
      <span aria-hidden>▥</span>
      <span>≥ {value}px</span>
    </span>
  );
}
