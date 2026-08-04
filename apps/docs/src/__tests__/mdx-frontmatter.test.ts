// @vitest-environment node
/**
 * MDX Frontmatter Validation Tests
 *
 * These tests verify the integrity of MDX frontmatter metadata across
 * the Getting Started documentation section.
 *
 * They prevent:
 * - Missing required fields (title, description)
 * - Invalid icon names
 * - Duplicate or placeholder descriptions
 * - Descriptions that are too short or too long
 *
 * CRITICAL: These tests lock metadata structure to prevent build failures.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { globSync } from 'glob';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================================
// Configuration
// ============================================================================

// Resolve paths from this file's location so the tests behave the same under
// vitest (cwd = apps/docs) and under turbo (cwd may be the workspace root).
const DOCS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTENT_ROOT = join(DOCS_ROOT, 'content/docs/getting-started');

// Valid Lucide React icon names - comprehensive list
// Updated 2026-02-01 - includes all icons used in content + common documentation icons
// Full list at: https://lucide.dev/icons
const VALID_LUCIDE_ICONS = new Set([
  // ========================================
  // CURRENTLY USED IN MDX CONTENT
  // ========================================
  'Accessibility',
  'Activity',
  'Bot',
  'BookOpen',
  'Boxes',
  'Brain',
  'Cloud',
  'Code2',
  'Database',
  'Download',
  'FileCode',
  'FileText',
  'Gauge',
  'GitBranch',
  'GitFork',
  'Globe',
  'History',
  'Key',
  'KeyRound',
  'Layers',
  'Lightbulb',
  'Map',
  'Monitor',
  'Network',
  'PackageX',
  'Puzzle',
  'RefreshCw',
  'Rocket',
  'Server',
  'Settings',
  'Shield',
  'Terminal',
  'TreeDeciduous',
  'Users',
  'Workflow',
  'Wrench',

  // ========================================
  // COMMON DOCUMENTATION ICONS
  // ========================================
  'Book',
  'Code',
  'Package',
  'Folder',
  'File',
  'Home',
  'Menu',
  'ChevronRight',
  'ChevronDown',
  'ArrowRight',
  'ShieldCheck',
  'Lock',
  'AlertTriangle',
  'CircleAlert',
  'Sparkles',
  'Zap',
  'Laptop',
  'Hammer',
  'Cog',
  'Check',
  'CheckCircle',
  'X',
  'XCircle',
  'Info',
  'Play',
  'Pause',
  'Search',
  'Filter',
  'Image',
  'Video',
  'Eye',
  'EyeOff',
  'MousePointer',

  // ========================================
  // LEGACY: DESIGN PHILOSOPHY ICONS
  // ========================================
  // These design-philosophy pages (apps/docs/content/docs/design/**)
  // were removed — see docs/remove-design-system-section — because
  // they leaked Interlace design-system content into this plugin-
  // product docs site. The canonical home is now the design system's
  // own repo (ofri-peretz/interlace). Kept here in case any legacy
  // content still declares these icons.
  'Palette',
  'MousePointerClick',
  'Table',
  'Link',
  'ClipboardList',
  'Languages',
  'Plug',
  'Keyboard',
  'Layout',
  'Loader',
  'Wand2',
  'ListOrdered',
  'Type',
  'Link2',
  'BarChart3',
  'Tag',

  // ========================================
  // DEPRECATED ICONS (For migration warnings)
  // These should NOT be used - kept for detection
  // ========================================
  // NOTE: HelpCircle -> CircleHelp (migrated 2026-02-01)
]);

// Minimum and maximum description lengths
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_DESCRIPTION_LENGTH = 200;

// ============================================================================
// Utility Functions
// ============================================================================

interface Frontmatter {
  title?: string;
  description?: string;
  icon?: string;
  [key: string]: unknown;
}

function extractFrontmatter(content: string): Frontmatter | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) {
    return null;
  }

  const frontmatter: Frontmatter = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      // Remove quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      frontmatter[key] = value;
    }
  }

  return frontmatter;
}

const CONTENT_ROOT_ALL = join(DOCS_ROOT, 'content');

/** One parsed page. `path` is absolute; the two rel forms match the old messages. */
interface Page {
  path: string;
  /** Relative to content/docs/getting-started (only meaningful for that subset). */
  rel: string;
  /** Relative to content/. */
  relAll: string;
  frontmatter: Frontmatter | null;
}

let cachedPages: Page[] | undefined;

/**
 * Read and parse every MDX page under content/ once, lazily. Lazy — not module
 * scope — so the read cost lands inside a test's timeout budget instead of
 * during collection, where vitest has no timeout to give it.
 *
 * The previous shape walked the tree five times (recursive readdirSync +
 * statSync per entry) and re-read + re-parsed the same files across ten tests.
 * Only the parsed frontmatter is retained — never the file bodies, which is
 * what made the old passes expensive.
 */
function pages(): Page[] {
  if (cachedPages) return cachedPages;

  cachedPages = globSync('**/*.mdx', {
    cwd: CONTENT_ROOT_ALL,
    absolute: true,
    nodir: true,
    ignore: ['**/.plan/**', '**/node_modules/**'],
  }).map((path) => ({
    path,
    rel: path.replace(CONTENT_ROOT + '/', ''),
    relAll: path.replace(CONTENT_ROOT_ALL + '/', ''),
    frontmatter: extractFrontmatter(readFileSync(path, 'utf-8')),
  }));

  return cachedPages;
}

/** The `content/docs/getting-started` subset, derived — not a second walk. */
function gettingStartedPages(): Page[] {
  return pages().filter((p) => p.path.startsWith(CONTENT_ROOT + '/'));
}

// ============================================================================
// Tests: Required Frontmatter Fields
// ============================================================================

describe('MDX Frontmatter - Required Fields', () => {
  // Every check in this file asserts "no violations found", which a corpus of
  // zero files satisfies perfectly. This guard is the only thing standing
  // between a broken glob and a green, meaningless suite.
  it('should find MDX files to test', () => {
    expect(gettingStartedPages().length).toBeGreaterThan(3);
  });

  describe('Every MDX file should have a title', () => {
    it('all files have title in frontmatter', () => {
      const missingTitle = gettingStartedPages()
        .filter(
          (p) => !p.frontmatter?.title || p.frontmatter.title.trim() === '',
        )
        .map((p) => p.rel);

      expect(
        missingTitle,
        `Files missing title: ${missingTitle.join(', ')}`,
      ).toHaveLength(0);
    });
  });

  describe('Every MDX file should have a description', () => {
    it('all files have description in frontmatter', () => {
      const missingDescription = gettingStartedPages()
        .filter(
          (p) =>
            !p.frontmatter?.description ||
            p.frontmatter.description.trim() === '',
        )
        .map((p) => p.rel);

      expect(
        missingDescription,
        `Files missing description: ${missingDescription.join(', ')}`,
      ).toHaveLength(0);
    });
  });
});

// ============================================================================
// Tests: Icon Validation
// ============================================================================

// Deprecated icons that should NOT be used (with their replacements)
const DEPRECATED_ICONS: Record<string, string> = {
  HelpCircle: 'CircleHelp',
  AlertCircle: 'CircleAlert',
  // Add more deprecated icons here as Lucide updates
};

/** Pages carrying an `icon`, paired with the relative form the message wants. */
function iconsOf(subset: Page[], rel: (p: Page) => string) {
  return subset
    .filter((p) => p.frontmatter?.icon)
    .map((p) => ({ file: rel(p), icon: String(p.frontmatter!.icon) }));
}

describe('MDX Frontmatter - Icon Validation', () => {
  it('icon names should be valid Lucide React icons', () => {
    const invalidIcons = iconsOf(gettingStartedPages(), (p) => p.rel).filter(
      (i) => !VALID_LUCIDE_ICONS.has(i.icon),
    );

    // Strict validation - fail if unknown icons are found
    expect(
      invalidIcons,
      `Unknown icons detected. Add them to VALID_LUCIDE_ICONS or fix: ${JSON.stringify(invalidIcons, null, 2)}`,
    ).toHaveLength(0);
  });

  it('should not use deprecated Lucide icons', () => {
    const deprecatedUsages = iconsOf(gettingStartedPages(), (p) => p.rel)
      .filter((i) => DEPRECATED_ICONS[i.icon])
      .map((i) => ({ ...i, replacement: DEPRECATED_ICONS[i.icon] }));

    expect(
      deprecatedUsages,
      `Deprecated icons found. Update to new names:\n${deprecatedUsages.map((d) => `  ${d.file}: ${d.icon} → ${d.replacement}`).join('\n')}`,
    ).toHaveLength(0);
  });
});

// ============================================================================
// Tests: Site-Wide Icon Validation (All Content)
// ============================================================================

describe('MDX Frontmatter - Site-Wide Icon Validation', () => {
  // Anti-vacuous guard for every site-wide check below.
  it('should find MDX files across all content', () => {
    expect(pages().length).toBeGreaterThan(400);
  });

  it('ALL MDX files should use valid Lucide icons', () => {
    const invalidIcons = iconsOf(pages(), (p) => p.relAll).filter(
      (i) => !VALID_LUCIDE_ICONS.has(i.icon),
    );

    expect(
      invalidIcons,
      `Site-wide icon validation failed. Unknown icons:\n${invalidIcons.map((i) => `  ${i.file}: "${i.icon}"`).join('\n')}\n\nAdd valid icons to VALID_LUCIDE_ICONS set.`,
    ).toHaveLength(0);
  });

  it('NO MDX files should use deprecated Lucide icons', () => {
    const deprecatedUsages = iconsOf(pages(), (p) => p.relAll)
      .filter((i) => DEPRECATED_ICONS[i.icon])
      .map((i) => ({ ...i, replacement: DEPRECATED_ICONS[i.icon] }));

    expect(
      deprecatedUsages,
      `Deprecated icons found site-wide:\n${deprecatedUsages.map((d) => `  ${d.file}: ${d.icon} → ${d.replacement}`).join('\n')}`,
    ).toHaveLength(0);
  });
});

// ============================================================================
// Tests: Description Quality
// ============================================================================

describe('MDX Frontmatter - Description Quality', () => {
  it('descriptions should be at least 20 characters', () => {
    const tooShort = gettingStartedPages()
      .filter(
        (p) =>
          p.frontmatter?.description &&
          p.frontmatter.description.length < MIN_DESCRIPTION_LENGTH,
      )
      .map((p) => ({
        file: p.rel,
        length: p.frontmatter!.description!.length,
      }));

    expect(
      tooShort,
      `Descriptions too short: ${tooShort.map((t) => `${t.file} (${t.length} chars)`).join(', ')}`,
    ).toHaveLength(0);
  });

  it('descriptions should be at most 200 characters', () => {
    const tooLong = gettingStartedPages()
      .filter(
        (p) =>
          p.frontmatter?.description &&
          p.frontmatter.description.length > MAX_DESCRIPTION_LENGTH,
      )
      .map((p) => ({
        file: p.rel,
        length: p.frontmatter!.description!.length,
      }));

    expect(
      tooLong,
      `Descriptions too long: ${tooLong.map((t) => `${t.file} (${t.length} chars)`).join(', ')}`,
    ).toHaveLength(0);
  });

  it('descriptions should not be placeholder text', () => {
    const placeholders = [
      'todo',
      'placeholder',
      'description here',
      'add description',
      'coming soon',
      'tbd',
      'wip',
    ];

    const placeholderDescriptions = gettingStartedPages()
      .filter((p) => {
        const description = p.frontmatter?.description?.toLowerCase() ?? '';
        return placeholders.some((ph) => description.includes(ph));
      })
      .map((p) => ({ file: p.rel }));

    expect(
      placeholderDescriptions,
      `Placeholder descriptions found: ${placeholderDescriptions.map((p) => p.file).join(', ')}`,
    ).toHaveLength(0);
  });

  it('descriptions should not equal the title', () => {
    const sameAsTitleDescriptions = gettingStartedPages()
      .filter((p) => {
        const { title, description } = p.frontmatter ?? {};
        return (
          !!title &&
          !!description &&
          String(title).toLowerCase().trim() ===
            String(description).toLowerCase().trim()
        );
      })
      .map((p) => ({ file: p.rel }));

    expect(
      sameAsTitleDescriptions,
      `Description equals title: ${sameAsTitleDescriptions.map((s) => s.file).join(', ')}`,
    ).toHaveLength(0);
  });
});

// ============================================================================
// Tests: No Duplicate Descriptions
// ============================================================================

describe('MDX Frontmatter - Uniqueness', () => {
  it('should not have duplicate descriptions across pages', () => {
    const descriptionMap = new Map<string, string[]>();

    for (const page of gettingStartedPages()) {
      const description = page.frontmatter?.description;

      if (description) {
        const normalizedDesc = description.toLowerCase().trim();
        const existing = descriptionMap.get(normalizedDesc) ?? [];
        existing.push(page.rel);
        descriptionMap.set(normalizedDesc, existing);
      }
    }

    const duplicates: { description: string; files: string[] }[] = [];

    for (const [description, files] of descriptionMap) {
      if (files.length > 1) {
        duplicates.push({ description, files });
      }
    }

    expect(
      duplicates,
      `Duplicate descriptions found: ${duplicates.map((d) => `"${d.description}" in [${d.files.join(', ')}]`).join('; ')}`,
    ).toHaveLength(0);
  });
});

// ============================================================================
// Tests: Specific Page Requirements
// ============================================================================

describe('MDX Frontmatter - Specific Pages', () => {
  it('index.mdx should have icon: Rocket', () => {
    const indexPath = join(CONTENT_ROOT, 'index.mdx');
    const content = readFileSync(indexPath, 'utf-8');
    const frontmatter = extractFrontmatter(content);

    expect(frontmatter?.icon).toBe('Rocket');
  });

  it('installation.mdx should have icon: Download', () => {
    const installPath = join(CONTENT_ROOT, 'installation.mdx');
    const content = readFileSync(installPath, 'utf-8');
    const frontmatter = extractFrontmatter(content);

    expect(frontmatter?.icon).toBe('Download');
  });

  it('configuration.mdx should have icon: Settings', () => {
    const configPath = join(CONTENT_ROOT, 'configuration.mdx');
    const content = readFileSync(configPath, 'utf-8');
    const frontmatter = extractFrontmatter(content);

    expect(frontmatter?.icon).toBe('Settings');
  });
});
