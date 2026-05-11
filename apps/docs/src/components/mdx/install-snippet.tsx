'use client';

import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

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
 *   <InstallSnippet packages="eslint @interlace/eslint-plugin-jwt" />
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

export function InstallSnippet({
  packages,
  dev,
  global,
  command,
}: InstallSnippetProps) {
  // Cross-page + cross-instance persistence is handled natively by
  // fumadocs `<Tabs>` via the `groupId` prop (it syncs all instances with
  // the same id via localStorage). Fumadocs Tabs is uncontrolled — we
  // don't manage state, we just opt into the shared group.
  return (
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
  );
}
