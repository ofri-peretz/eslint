'use client';

import { cn } from '@/lib/utils';

/**
 * Compact Badge System
 * 
 * High-density badge container with consistent sizing and minimal spacing.
 * Designed for shield.io badges and similar image-based badges.
 * 
 * @see PRD: Compact Badge System (UI/UX Refactor)
 */

interface Badge {
  src: string;
  alt: string;
  href?: string;
}

interface CompactBadgesProps {
  badges: Badge[];
  className?: string;
  /** Badge height in pixels (default: 20) */
  height?: number;
  /** Gap between badges in pixels (default: 4) */
  gap?: number;
}

/**
 * CompactBadges - High-density badge container
 * 
 * Features:
 * - Flexbox with flex-wrap for natural line breaking
 * - Consistent 20px height for all badges
 * - Tight 4px gap between badges
 * - Zero external margins
 * - No horizontal overflow on mobile
 */
export function CompactBadges({ 
  badges, 
  className,
  height = 20,
  gap = 4,
}: CompactBadgesProps) {
  if (badges.length === 0) return null;

  return (
    <div 
      className={cn(
        "flex flex-wrap items-center",
        "max-w-full overflow-hidden",
        className
      )}
      style={{ 
        gap: `${gap}px`,
        lineHeight: `${height + 4}px`,
      }}
    >
      {badges.map((badge, index) => {
        const imgElement = (
          <img
            key={index}
            src={badge.src}
            alt={badge.alt}
            loading="lazy"
            className="block shrink-0"
            style={{ 
              height: `${height}px`,
              maxWidth: '100%',
            }}
          />
        );

        if (badge.href) {
          return (
            <a
              key={index}
              href={badge.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block shrink-0 hover:opacity-80 transition-opacity"
            >
              {imgElement}
            </a>
          );
        }

        return imgElement;
      })}
    </div>
  );
}

/**
 * Common badge presets for npm packages
 */
export function createNpmBadges(packageName: string, options?: {
  showVersion?: boolean;
  showDownloads?: boolean;
  showLicense?: boolean;
  showBundleSize?: boolean;
}) {
  const { 
    showVersion = true, 
    showDownloads = true, 
    showLicense = true,
    showBundleSize = false,
  } = options || {};

  const badges: Badge[] = [];
  const encodedName = encodeURIComponent(packageName);

  if (showVersion) {
    badges.push({
      src: `https://img.shields.io/npm/v/${encodedName}?style=flat-square&color=7c3aed`,
      alt: 'npm version',
      href: `https://www.npmjs.com/package/${packageName}`,
    });
  }

  if (showDownloads) {
    badges.push({
      src: `https://img.shields.io/npm/dm/${encodedName}?style=flat-square&color=10b981`,
      alt: 'monthly downloads',
      href: `https://www.npmjs.com/package/${packageName}`,
    });
  }

  if (showLicense) {
    badges.push({
      src: `https://img.shields.io/npm/l/${encodedName}?style=flat-square&color=06b6d4`,
      alt: 'license',
    });
  }

  if (showBundleSize) {
    badges.push({
      src: `https://img.shields.io/bundlephobia/minzip/${encodedName}?style=flat-square&color=f59e0b`,
      alt: 'bundle size',
      href: `https://bundlephobia.com/package/${packageName}`,
    });
  }

  return badges;
}

/**
 * GitHub repository badges
 */
export function createGitHubBadges(repo: string, options?: {
  showStars?: boolean;
  showForks?: boolean;
  showIssues?: boolean;
  showLastCommit?: boolean;
  showWorkflow?: string;
}) {
  const {
    showStars = true,
    showForks = false,
    showIssues = false,
    showLastCommit = false,
    showWorkflow,
  } = options || {};

  const badges: Badge[] = [];

  if (showStars) {
    badges.push({
      src: `https://img.shields.io/github/stars/${repo}?style=flat-square&color=f59e0b`,
      alt: 'GitHub stars',
      href: `https://github.com/${repo}`,
    });
  }

  if (showForks) {
    badges.push({
      src: `https://img.shields.io/github/forks/${repo}?style=flat-square&color=6366f1`,
      alt: 'GitHub forks',
      href: `https://github.com/${repo}/fork`,
    });
  }

  if (showIssues) {
    badges.push({
      src: `https://img.shields.io/github/issues/${repo}?style=flat-square&color=ef4444`,
      alt: 'GitHub issues',
      href: `https://github.com/${repo}/issues`,
    });
  }

  if (showLastCommit) {
    badges.push({
      src: `https://img.shields.io/github/last-commit/${repo}?style=flat-square&color=10b981`,
      alt: 'last commit',
      href: `https://github.com/${repo}/commits`,
    });
  }

  if (showWorkflow) {
    badges.push({
      src: `https://img.shields.io/github/actions/workflow/status/${repo}/${showWorkflow}?style=flat-square`,
      alt: 'build status',
      href: `https://github.com/${repo}/actions`,
    });
  }

  return badges;
}

/**
 * Coverage badge (Codecov)
 */
export function createCoverageBadge(repo: string): Badge {
  return {
    src: `https://img.shields.io/codecov/c/github/${repo}?style=flat-square&color=f97316`,
    alt: 'coverage',
    href: `https://app.codecov.io/gh/${repo}`,
  };
}
