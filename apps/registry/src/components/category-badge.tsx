import { CATEGORIES, type CategoryId } from '@/lib/categories';

const TONE: Record<CategoryId, string> = {
  foundation: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300',
  form: 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-300',
  overlay: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300',
  feedback: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300',
  navigation: 'border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-300',
  data: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
  decorative: 'border-pink-500/40 bg-pink-500/10 text-pink-600 dark:text-pink-300',
  other: 'border-border bg-card text-muted-foreground',
};

type Props = { categoryId: CategoryId };

export function CategoryBadge({ categoryId }: Props) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return null;
  return (
    <span
      title={cat.description}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs ${TONE[categoryId]}`}
    >
      {cat.title.toLowerCase()}
    </span>
  );
}
