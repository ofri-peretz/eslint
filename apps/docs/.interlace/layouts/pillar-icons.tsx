/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Gradient color presets for sidebar pillar icons.
 * Maps to Tailwind gradient classes.
 */
const GRADIENT_COLORS: Record<string, string> = {
  purple: 'from-purple-600 to-purple-500',
  blue: 'from-blue-600 to-blue-500',
  emerald: 'from-emerald-600 to-emerald-500',
  red: 'from-red-600 to-red-500',
  amber: 'from-amber-600 to-amber-500',
  cyan: 'from-cyan-600 to-cyan-500',
  pink: 'from-pink-600 to-pink-500',
  indigo: 'from-indigo-600 to-indigo-500',
};

/**
 * Configuration for a sidebar pillar icon.
 */
export interface PillarConfig {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Gradient color preset */
  color: keyof typeof GRADIENT_COLORS;
}

/**
 * Build a pillar icon map for fumadocs sidebar tabs.
 *
 * Returns a record mapping folder slugs to styled icon elements,
 * plus a `transform` function compatible with `DocsLayout.sidebar.tabs.transform`.
 *
 * @example
 * ```tsx
 * import { buildPillarIcons } from '@interlace/docs-baseline/layouts/pillar-icons';
 * import { Shield, Wrench, BookOpen } from 'lucide-react';
 *
 * const { icons, transform } = buildPillarIcons({
 *   plugins: { icon: Shield, color: 'purple' },
 *   'serverless-devkit': { icon: Wrench, color: 'blue' },
 *   guides: { icon: BookOpen, color: 'emerald' },
 * });
 * ```
 */
export function buildPillarIcons(pillars: Record<string, PillarConfig>) {
  // Build icon elements
  const icons: Record<string, ReactNode> = {};

  for (const [slug, config] of Object.entries(pillars)) {
    const Icon = config.icon;
    const gradient = GRADIENT_COLORS[config.color] ?? GRADIENT_COLORS.purple;

    icons[slug] = (
      <div
        className={`flex size-5 shrink-0 items-center justify-center rounded bg-gradient-to-t ${gradient} text-white`}
      >
        <Icon className="size-3.5" />
      </div>
    );
  }

  // Build the transform function for DocsLayout sidebar tabs.
  // Generic over the input shape so it satisfies fumadocs's `LayoutTab`-typed
  // `transform` slot without the consumer needing a cast.
  const transform = <T extends { icon?: ReactNode }>(
    option: T,
    node: { name: string | ReactNode },
  ): T => {
    const nodeName = typeof node.name === 'string' ? node.name : '';
    const folderName = nodeName.toLowerCase().replace(/\s+/g, '-');

    const slug =
      icons[folderName] !== undefined
        ? folderName
        : Object.keys(pillars).find((key) => folderName.includes(key)) ?? folderName;

    return {
      ...option,
      icon: icons[slug] ?? option.icon,
    };
  };

  return { icons, transform };
}
