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

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ============================================================================
// Configuration
// ============================================================================

const CONTENT_ROOT = join(process.cwd(), 'content/docs/getting-started');

// Valid Lucide React icon names - comprehensive list
// Updated 2026-02-01 - includes all icons used in content + common documentation icons
// Full list at: https://lucide.dev/icons
const VALID_LUCIDE_ICONS = new Set([
  // ========================================
  // CURRENTLY USED IN MDX CONTENT
  // ========================================
  'Accessibility', 'Activity', 'Bot', 'BookOpen', 'Brain',
  'Cloud', 'Database', 'Download',
  'FileCode', 'FileText', 'Gauge', 'GitBranch', 'Globe',
  'History', 'Key', 'Layers', 'Lightbulb', 'Map', 'Monitor',
  'Puzzle', 'RefreshCw', 'Rocket', 'Server', 'Settings',
  'Shield', 'Terminal', 'TreeDeciduous', 'Users', 'Workflow',
  'Wrench',
  
  // ========================================
  // COMMON DOCUMENTATION ICONS
  // ========================================
  'Book', 'Code', 'Package', 'Folder', 'File',
  'Home', 'Menu', 'ChevronRight', 'ChevronDown', 'ArrowRight',
  'ShieldCheck', 'Lock', 'AlertTriangle', 'CircleAlert',
  'Sparkles', 'Zap', 'Laptop', 'Hammer', 'Cog',
  'Check', 'CheckCircle', 'X', 'XCircle', 'Info',
  'Play', 'Pause', 'Search', 'Filter',
  'Image', 'Video', 'Eye', 'EyeOff',
  
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
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      frontmatter[key] = value;
    }
  }
  
  return frontmatter;
}

function getAllMdxFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!existsSync(dir)) {
    return files;
  }
  
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && entry !== '.plan') {
      files.push(...getAllMdxFiles(fullPath));
    } else if (entry.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function getRelativePath(fullPath: string): string {
  return fullPath.replace(CONTENT_ROOT + '/', '');
}

// ============================================================================
// Tests: Required Frontmatter Fields
// ============================================================================

describe('MDX Frontmatter - Required Fields', () => {
  let mdxFiles: string[];
  
  beforeAll(() => {
    mdxFiles = getAllMdxFiles(CONTENT_ROOT);
  });

  it('should find MDX files to test', () => {
    expect(mdxFiles.length).toBeGreaterThan(0);
  });

  describe('Every MDX file should have a title', () => {
    it('all files have title in frontmatter', () => {
      const missingTitle: string[] = [];
      
      for (const file of mdxFiles) {
        const content = readFileSync(file, 'utf-8');
        const frontmatter = extractFrontmatter(content);
        
        if (!frontmatter?.title || frontmatter.title.trim() === '') {
          missingTitle.push(getRelativePath(file));
        }
      }
      
      expect(
        missingTitle,
        `Files missing title: ${missingTitle.join(', ')}`
      ).toHaveLength(0);
    });
  });

  describe('Every MDX file should have a description', () => {
    it('all files have description in frontmatter', () => {
      const missingDescription: string[] = [];
      
      for (const file of mdxFiles) {
        const content = readFileSync(file, 'utf-8');
        const frontmatter = extractFrontmatter(content);
        
        if (!frontmatter?.description || frontmatter.description.trim() === '') {
          missingDescription.push(getRelativePath(file));
        }
      }
      
      expect(
        missingDescription,
        `Files missing description: ${missingDescription.join(', ')}`
      ).toHaveLength(0);
    });
  });
});

// ============================================================================
// Tests: Icon Validation
// ============================================================================

// Deprecated icons that should NOT be used (with their replacements)
const DEPRECATED_ICONS: Record<string, string> = {
  'HelpCircle': 'CircleHelp',
  'AlertCircle': 'CircleAlert',
  // Add more deprecated icons here as Lucide updates
};

describe('MDX Frontmatter - Icon Validation', () => {
  let mdxFiles: string[];
  
  beforeAll(() => {
    mdxFiles = getAllMdxFiles(CONTENT_ROOT);
  });

  it('icon names should be valid Lucide React icons', () => {
    const invalidIcons: { file: string; icon: string }[] = [];
    
    for (const file of mdxFiles) {
      const content = readFileSync(file, 'utf-8');
      const frontmatter = extractFrontmatter(content);
      
      if (frontmatter?.icon) {
        const iconName = String(frontmatter.icon);
        if (!VALID_LUCIDE_ICONS.has(iconName)) {
          invalidIcons.push({
            file: getRelativePath(file),
            icon: iconName,
          });
        }
      }
    }
    
    // Strict validation - fail if unknown icons are found
    expect(
      invalidIcons,
      `Unknown icons detected. Add them to VALID_LUCIDE_ICONS or fix: ${JSON.stringify(invalidIcons, null, 2)}`
    ).toHaveLength(0);
  });

  it('should not use deprecated Lucide icons', () => {
    const deprecatedUsages: { file: string; icon: string; replacement: string }[] = [];
    
    for (const file of mdxFiles) {
      const content = readFileSync(file, 'utf-8');
      const frontmatter = extractFrontmatter(content);
      
      if (frontmatter?.icon) {
        const iconName = String(frontmatter.icon);
        if (DEPRECATED_ICONS[iconName]) {
          deprecatedUsages.push({
            file: getRelativePath(file),
            icon: iconName,
            replacement: DEPRECATED_ICONS[iconName],
          });
        }
      }
    }
    
    expect(
      deprecatedUsages,
      `Deprecated icons found. Update to new names:\n${deprecatedUsages.map(d => `  ${d.file}: ${d.icon} → ${d.replacement}`).join('\n')}`
    ).toHaveLength(0);
  });
});

// ============================================================================
// Tests: Site-Wide Icon Validation (All Content)
// ============================================================================

const CONTENT_ROOT_ALL = join(process.cwd(), 'content');

describe('MDX Frontmatter - Site-Wide Icon Validation', () => {
  let allMdxFiles: string[];
  
  beforeAll(() => {
    allMdxFiles = getAllMdxFiles(CONTENT_ROOT_ALL);
  });

  it('should find MDX files across all content', () => {
    expect(allMdxFiles.length).toBeGreaterThan(0);
  });

  it('ALL MDX files should use valid Lucide icons', () => {
    const invalidIcons: { file: string; icon: string }[] = [];
    
    for (const file of allMdxFiles) {
      const content = readFileSync(file, 'utf-8');
      const frontmatter = extractFrontmatter(content);
      
      if (frontmatter?.icon) {
        const iconName = String(frontmatter.icon);
        if (!VALID_LUCIDE_ICONS.has(iconName)) {
          invalidIcons.push({
            file: file.replace(CONTENT_ROOT_ALL + '/', ''),
            icon: iconName,
          });
        }
      }
    }
    
    expect(
      invalidIcons,
      `Site-wide icon validation failed. Unknown icons:\n${invalidIcons.map(i => `  ${i.file}: "${i.icon}"`).join('\n')}\n\nAdd valid icons to VALID_LUCIDE_ICONS set.`
    ).toHaveLength(0);
  });

  it('NO MDX files should use deprecated Lucide icons', () => {
    const deprecatedUsages: { file: string; icon: string; replacement: string }[] = [];
    
    for (const file of allMdxFiles) {
      const content = readFileSync(file, 'utf-8');
      const frontmatter = extractFrontmatter(content);
      
      if (frontmatter?.icon) {
        const iconName = String(frontmatter.icon);
        if (DEPRECATED_ICONS[iconName]) {
          deprecatedUsages.push({
            file: file.replace(CONTENT_ROOT_ALL + '/', ''),
            icon: iconName,
            replacement: DEPRECATED_ICONS[iconName],
          });
        }
      }
    }
    
    expect(
      deprecatedUsages,
      `Deprecated icons found site-wide:\n${deprecatedUsages.map(d => `  ${d.file}: ${d.icon} → ${d.replacement}`).join('\n')}`
    ).toHaveLength(0);
  });
});

// ============================================================================
// Tests: Description Quality
// ============================================================================

describe('MDX Frontmatter - Description Quality', () => {
  let mdxFiles: string[];
  
  beforeAll(() => {
    mdxFiles = getAllMdxFiles(CONTENT_ROOT);
  });

  it('descriptions should be at least 20 characters', () => {
    const tooShort: { file: string; description: string; length: number }[] = [];
    
    for (const file of mdxFiles) {
      const content = readFileSync(file, 'utf-8');
      const frontmatter = extractFrontmatter(content);
      const description = frontmatter?.description;
      
      if (description && description.length < MIN_DESCRIPTION_LENGTH) {
        tooShort.push({
          file: getRelativePath(file),
          description,
          length: description.length,
        });
      }
    }
    
    expect(
      tooShort,
      `Descriptions too short: ${tooShort.map(t => `${t.file} (${t.length} chars)`).join(', ')}`
    ).toHaveLength(0);
  });

  it('descriptions should be at most 200 characters', () => {
    const tooLong: { file: string; length: number }[] = [];
    
    for (const file of mdxFiles) {
      const content = readFileSync(file, 'utf-8');
      const frontmatter = extractFrontmatter(content);
      const description = frontmatter?.description;
      
      if (description && description.length > MAX_DESCRIPTION_LENGTH) {
        tooLong.push({
          file: getRelativePath(file),
          length: description.length,
        });
      }
    }
    
    expect(
      tooLong,
      `Descriptions too long: ${tooLong.map(t => `${t.file} (${t.length} chars)`).join(', ')}`
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
    
    const placeholderDescriptions: { file: string; description: string }[] = [];
    
    for (const file of mdxFiles) {
      const content = readFileSync(file, 'utf-8');
      const frontmatter = extractFrontmatter(content);
      const description = frontmatter?.description?.toLowerCase() ?? '';
      
      for (const placeholder of placeholders) {
        if (description.includes(placeholder)) {
          placeholderDescriptions.push({
            file: getRelativePath(file),
            description: frontmatter?.description ?? '',
          });
          break;
        }
      }
    }
    
    expect(
      placeholderDescriptions,
      `Placeholder descriptions found: ${placeholderDescriptions.map(p => p.file).join(', ')}`
    ).toHaveLength(0);
  });

  it('descriptions should not equal the title', () => {
    const sameAsTitleDescriptions: { file: string; title: string }[] = [];
    
    for (const file of mdxFiles) {
      const content = readFileSync(file, 'utf-8');
      const frontmatter = extractFrontmatter(content);
      
      if (frontmatter?.title && frontmatter?.description) {
        const title = String(frontmatter.title).toLowerCase().trim();
        const description = String(frontmatter.description).toLowerCase().trim();
        
        if (title === description) {
          sameAsTitleDescriptions.push({
            file: getRelativePath(file),
            title: frontmatter.title,
          });
        }
      }
    }
    
    expect(
      sameAsTitleDescriptions,
      `Description equals title: ${sameAsTitleDescriptions.map(s => s.file).join(', ')}`
    ).toHaveLength(0);
  });
});

// ============================================================================
// Tests: No Duplicate Descriptions
// ============================================================================

describe('MDX Frontmatter - Uniqueness', () => {
  let mdxFiles: string[];
  
  beforeAll(() => {
    mdxFiles = getAllMdxFiles(CONTENT_ROOT);
  });

  it('should not have duplicate descriptions across pages', () => {
    const descriptionMap = new Map<string, string[]>();
    
    for (const file of mdxFiles) {
      const content = readFileSync(file, 'utf-8');
      const frontmatter = extractFrontmatter(content);
      const description = frontmatter?.description;
      
      if (description) {
        const normalizedDesc = description.toLowerCase().trim();
        const existing = descriptionMap.get(normalizedDesc) ?? [];
        existing.push(getRelativePath(file));
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
      `Duplicate descriptions found: ${duplicates.map(d => `"${d.description}" in [${d.files.join(', ')}]`).join('; ')}`
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
