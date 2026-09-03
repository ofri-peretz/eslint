/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * InstallSnippet — npm / pnpm / yarn / bun install tabs from a single declaration.
 *
 * Encodes the four package managers' install conventions so MDX authors don't
 * copy-paste the same command into four tabs.
 *
 * Usage:
 *
 *   <InstallSnippet pkg="@interlace/serverless-api-gateway-caching" dev />
 *
 *   <InstallSnippet pkg="serverless@4" />          // no --save-dev
 *   <InstallSnippet pkg={['react', 'react-dom']} /> // multi-package
 *
 *   <InstallSnippet command="uninstall" pkg="serverless-api-gateway-caching" />
 *   <InstallSnippet command="dlx" pkg="create-next-app" />
 *
 * For commands the matrix below doesn't cover (e.g. `npm run X`), use
 * <PackageManagerTabs> with explicit per-tab snippets instead.
 */

import { Tabs, Tab } from 'fumadocs-ui/components/tabs';

const MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const;
type Manager = (typeof MANAGERS)[number];

type CommandKind = 'install' | 'uninstall' | 'dlx';

const COMMAND_MATRIX: Record<CommandKind, Record<Manager, { cmd: string; devFlag: string }>> = {
  install: {
    npm: { cmd: 'npm install', devFlag: '--save-dev' },
    pnpm: { cmd: 'pnpm add', devFlag: '-D' },
    yarn: { cmd: 'yarn add', devFlag: '-D' },
    bun: { cmd: 'bun add', devFlag: '-d' },
  },
  uninstall: {
    npm: { cmd: 'npm uninstall', devFlag: '' },
    pnpm: { cmd: 'pnpm remove', devFlag: '' },
    yarn: { cmd: 'yarn remove', devFlag: '' },
    bun: { cmd: 'bun remove', devFlag: '' },
  },
  dlx: {
    npm: { cmd: 'npx', devFlag: '' },
    pnpm: { cmd: 'pnpm dlx', devFlag: '' },
    yarn: { cmd: 'yarn dlx', devFlag: '' },
    bun: { cmd: 'bunx', devFlag: '' },
  },
};

export interface InstallSnippetProps {
  /** Package(s) to install. Single string or array. */
  pkg: string | string[];
  /** Command kind. Defaults to `install`. */
  command?: CommandKind;
  /** Add the dev-dependency flag. Only applies to `command="install"`. */
  dev?: boolean;
  /** `groupId` for tab persistence. Defaults to `package-manager`. */
  groupId?: string;
}

function renderCommand(
  manager: Manager,
  command: CommandKind,
  pkg: string,
  dev: boolean,
): string {
  const entry = COMMAND_MATRIX[command][manager];
  const devFlag = dev && command === 'install' && entry.devFlag ? ` ${entry.devFlag}` : '';
  return `${entry.cmd}${devFlag} ${pkg}`;
}

export function InstallSnippet({
  pkg,
  command = 'install',
  dev = false,
  groupId = 'package-manager',
}: InstallSnippetProps) {
  const pkgString = Array.isArray(pkg) ? pkg.join(' ') : pkg;

  return (
    <Tabs groupId={groupId} items={[...MANAGERS]} persist>
      {MANAGERS.map((manager) => (
        <Tab key={manager} value={manager}>
          <pre className="my-0">
            <code>{renderCommand(manager, command, pkgString, dev)}</code>
          </pre>
        </Tab>
      ))}
    </Tabs>
  );
}

/**
 * PackageManagerTabs — generic four-tab wrapper for cases where the command
 * doesn't fit the {install, uninstall, dlx} matrix (e.g. `npm test`,
 * `pnpm build`, custom scripts).
 *
 * Usage:
 *
 *   <PackageManagerTabs>
 *     <NpmTab>```bash\nnpm test\n```</NpmTab>
 *     <PnpmTab>```bash\npnpm test\n```</PnpmTab>
 *     <YarnTab>```bash\nyarn test\n```</YarnTab>
 *     <BunTab>```bash\nbun test\n```</BunTab>
 *   </PackageManagerTabs>
 *
 * Slots are optional — omit a manager and its tab disappears.
 */

import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';

interface ManagerSlotProps {
  children?: ReactNode;
  __manager?: Manager;
}

function ManagerSlot(manager: Manager) {
  const Component = ({ children }: ManagerSlotProps) => <>{children}</>;
  Component.displayName = `PackageManagerTabs.${manager}`;
  (Component as unknown as { __manager: Manager }).__manager = manager;
  return Component;
}

export const NpmTab = ManagerSlot('npm');
export const PnpmTab = ManagerSlot('pnpm');
export const YarnTab = ManagerSlot('yarn');
export const BunTab = ManagerSlot('bun');

export interface PackageManagerTabsProps {
  groupId?: string;
  children: ReactNode;
}

interface ManagerSlottedElement {
  type: { __manager?: Manager };
  props: ManagerSlotProps;
}

function isManagerSlotted(element: unknown): element is ManagerSlottedElement {
  if (!isValidElement(element)) return false;
  const type = (element as ReactElement).type as unknown;
  return (
    typeof type === 'function' &&
    typeof (type as { __manager?: unknown }).__manager === 'string'
  );
}

export function PackageManagerTabs({
  groupId = 'package-manager',
  children,
}: PackageManagerTabsProps) {
  const slots = new Map<Manager, ReactNode>();
  for (const child of Children.toArray(children)) {
    if (isManagerSlotted(child)) {
      const slotKey = child.type.__manager;
      if (slotKey) slots.set(slotKey, child.props.children);
    }
  }

  const present = MANAGERS.filter((m) => slots.has(m));
  if (present.length === 0) return null;

  return (
    <Tabs groupId={groupId} items={[...present]} persist>
      {present.map((manager) => (
        <Tab key={manager} value={manager}>
          {slots.get(manager)}
        </Tab>
      ))}
    </Tabs>
  );
}
