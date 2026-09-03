'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

import { track } from '@/lib/analytics';

/**
 * InstallSnippet — package-install command with a npm/pnpm/yarn/bun switcher.
 *
 * Implements CODE_EXAMPLE_PHILOSOPHY's "PM switcher contract":
 *   - 4 fixed tabs in fixed order: npm · pnpm · yarn · bun
 *   - Selection persists site-wide via localStorage
 *   - Per-PM canonical command (e.g., `pnpm add` not `pnpm install`)
 *   - Dev / peer / global flags translate per PM
 *
 * Built on Fumadocs primitives: `<Tabs>` for the switcher chrome,
 * `<DynamicCodeBlock>` (Shiki-driven, theme-aware) for the rendered shell.
 *
 * Usage:
 *   <InstallSnippet packages="eslint eslint-plugin-jwt-security" />
 *   <InstallSnippet packages="@interlace/ui" dev />
 *   <InstallSnippet packages="lefthook" dev global />
 */

const PMS = ['npm', 'pnpm', 'yarn', 'bun'] as const;
type PackageManager = (typeof PMS)[number];

const STORAGE_KEY = 'pm-preference';
const PM_ITEMS: string[] = [...PMS];

export interface InstallSnippetProps {
  /** Package(s) to install. Space-separated for multiple. */
  packages: string;
  /** Add the dev-dependency flag (`-D` / `--dev` / `-d` per PM). */
  dev?: boolean;
  /** Install globally (`-g` / `--global`). */
  global?: boolean;
  /** Override the verb (`add` / `install`). Default: install (npm) / add (others). */
  command?: 'install' | 'add';
}

function buildCommand(
  pm: PackageManager,
  packages: string,
  { dev, global, command }: Pick<InstallSnippetProps, 'dev' | 'global' | 'command'>,
): string {
  if (pm === 'npm') {
    const flags = [global && '-g', dev && '-D'].filter(Boolean).join(' ');
    return `npm ${command ?? 'install'} ${flags ? `${flags} ` : ''}${packages}`.trim();
  }
  if (pm === 'pnpm') {
    const flags = [global && '-g', dev && '-D'].filter(Boolean).join(' ');
    return `pnpm ${command ?? 'add'} ${flags ? `${flags} ` : ''}${packages}`.trim();
  }
  if (pm === 'yarn') {
    if (global) {
      return `yarn global ${command ?? 'add'} ${packages}`.trim();
    }
    return `yarn ${command ?? 'add'} ${dev ? '--dev ' : ''}${packages}`.trim();
  }
  // bun
  const flags = [global && '-g', dev && '-d'].filter(Boolean).join(' ');
  return `bun ${command ?? 'add'} ${flags ? `${flags} ` : ''}${packages}`.trim();
}

/**
 * Reads the package manager from the tab the user is interacting with, falling
 * back to the persisted preference and then to npm. Deliberately tolerant: an
 * unrecognised label must not throw inside a click handler on a docs page.
 */
function readPackageManager(target: HTMLElement | null): PackageManager {
  const label = target?.closest('[role="tab"]')?.textContent?.trim().toLowerCase();
  if (label && (PMS as readonly string[]).includes(label)) {
    return label as PackageManager;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (PMS as readonly string[]).includes(stored)) {
      return stored as PackageManager;
    }
  } catch {
    // Private mode / blocked storage — fall through to the default.
  }
  return 'npm';
}

export function InstallSnippet({
  packages,
  dev,
  global,
  command,
}: InstallSnippetProps) {
  const pathname = usePathname();
  // Copying twice in a row is one intent, not two. Without this a reader who
  // clicks copy again after switching package manager inflates the only
  // conversion signal this site has.
  const lastCopyAt = useRef(0);

  /**
   * Capture-phase click handler on the wrapper rather than a hook into
   * Fumadocs' copy button, which is rendered by the library and whose markup
   * is not ours to depend on. Inside this subtree there are only two kinds of
   * button: the package-manager tabs, and the code block's copy control.
   */
  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    const surface = pathname ?? '(unknown)';
    try {
      if (target?.closest('[role="tab"]')) {
        track('install:pm_update', {
          packageManager: readPackageManager(target),
          surface,
        });
        return;
      }
      if (!target?.closest('button')) return;
      const now = Date.now();
      if (now - lastCopyAt.current < 1000) return;
      lastCopyAt.current = now;
      track('install:command_click', {
        packageManager: readPackageManager(target),
        packages,
        surface,
      });
    } catch {
      // Analytics never interferes with copying a command.
    }
  }
  // Cross-page + cross-instance persistence is handled natively by
  // fumadocs `<Tabs>` via the `groupId` prop (it syncs all instances with
  // the same id via localStorage). Fumadocs Tabs is uncontrolled — we
  // don't manage state, we just opt into the shared group.
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- capture-phase
    // listener observing clicks on real buttons inside; adds no new interactive
    // surface and no keyboard affordance of its own.
    <div onClickCapture={handleClickCapture}>
    <Tabs
      items={PM_ITEMS}
      groupId={STORAGE_KEY}
      persist
      data-testid="install-snippet"
    >
      {PMS.map((pm) => (
        <Tab key={pm} value={pm}>
          <DynamicCodeBlock
            lang="bash"
            code={buildCommand(pm, packages, { dev, global, command })}
          />
        </Tab>
      ))}
    </Tabs>
    </div>
  );
}
