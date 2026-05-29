/**
 * Component categorization for the registry index.
 *
 * Each category groups primitives by *what consumers are trying to do* —
 * "I need a form field", "I need an overlay" — not by implementation lineage.
 * Mirrors LAYOUT_PHILOSOPHY / COLOR_PHILOSOPHY domain split.
 *
 * Any primitive whose name isn't listed falls into the `other` bucket
 * so a newly-added primitive surfaces immediately on the index without
 * a manual categorize step.
 */

export type CategoryId =
  | 'foundation'
  | 'form'
  | 'overlay'
  | 'feedback'
  | 'navigation'
  | 'data'
  | 'decorative'
  | 'other';

export type Category = {
  id: CategoryId;
  title: string;
  description: string;
};

export const CATEGORIES: Category[] = [
  {
    id: 'foundation',
    title: 'Foundation',
    description:
      'Layout, typography, and surface primitives — the structural floor every page composes on top of.',
  },
  {
    id: 'form',
    title: 'Form & input',
    description:
      'Text input, choice controls, and form composition primitives. All inherit the WCAG 2.2 SC 2.4.13 focus ring from preflight.',
  },
  {
    id: 'overlay',
    title: 'Overlay',
    description:
      'Floating surfaces — dialogs, popovers, menus, tooltips. Base UI owns focus + dismissal; we own surface + motion.',
  },
  {
    id: 'feedback',
    title: 'Feedback',
    description:
      'Communicate state — toast, alert, progress, skeleton, badge. Tone tokens (info / success / warning / danger) keep semantics consistent.',
  },
  {
    id: 'navigation',
    title: 'Navigation',
    description:
      'Wayfinding — tabs, breadcrumb, pagination. Keyboard-equivalent everywhere (DESIGN_PRINCIPLES #10).',
  },
  {
    id: 'data',
    title: 'Data display',
    description:
      'Aspect-ratio frames, avatars, separators, scroll areas — the chrome around content.',
  },
  {
    id: 'decorative',
    title: 'Decorative',
    description:
      'Motion-aware visual flair. Always reduced-motion-respecting.',
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Uncategorized — falls here so newly added primitives surface immediately.',
  },
];

const ASSIGNMENTS: Record<string, CategoryId> = {
  // Foundation
  typography: 'foundation',
  box: 'foundation',
  grid: 'foundation',
  stack: 'foundation',
  container: 'foundation',
  section: 'foundation',
  card: 'foundation',
  label: 'foundation',

  // Form & input
  input: 'form',
  textarea: 'form',
  form: 'form',
  checkbox: 'form',
  'radio-group': 'form',
  switch: 'form',
  select: 'form',
  button: 'form',

  // Overlay
  dialog: 'overlay',
  'alert-dialog': 'overlay',
  sheet: 'overlay',
  popover: 'overlay',
  tooltip: 'overlay',
  'hover-card': 'overlay',
  'dropdown-menu': 'overlay',

  // Feedback
  toast: 'feedback',
  progress: 'feedback',
  skeleton: 'feedback',
  alert: 'feedback',
  badge: 'feedback',

  // Navigation
  tabs: 'navigation',
  breadcrumb: 'navigation',
  pagination: 'navigation',

  // Data display
  'aspect-ratio': 'data',
  avatar: 'data',
  separator: 'data',
  'scroll-area': 'data',
  collapsible: 'data',
  accordion: 'data',

  // Decorative
  meteors: 'decorative',
};

export function categoryFor(name: string): CategoryId {
  return ASSIGNMENTS[name] ?? 'other';
}

export function groupByCategory<T extends { name: string }>(
  items: T[],
): Map<CategoryId, T[]> {
  const groups = new Map<CategoryId, T[]>();
  for (const c of CATEGORIES) groups.set(c.id, []);
  for (const item of items) {
    const id = categoryFor(item.name);
    const bucket = groups.get(id);
    if (bucket) bucket.push(item);
  }
  // Sort each bucket by name.
  for (const bucket of groups.values()) {
    bucket.sort((a, b) => a.name.localeCompare(b.name));
  }
  return groups;
}
