/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * ServerlessConfigTabs — canonical four-format tabs for Serverless Framework
 * config snippets across Interlace docs sites.
 *
 * Serverless Framework supports four config formats: `serverless.yml`,
 * `serverless.ts`, `serverless.js`, and `serverless.json`. Recipes and
 * examples should show all four in tabs (matching the install-snippet
 * convention `npm / pnpm / yarn`).
 *
 * Hand-author each format so semantic differences (CFN intrinsics, function
 * references) are accurate per language. The component is just the wrapper.
 *
 * Usage:
 *
 *   <ServerlessConfigTabs>
 *     <Yaml>
 *       ```yaml
 *       custom:
 *         interlaceCaching:
 *           enabled: true
 *       ```
 *     </Yaml>
 *     <Typescript>
 *       ```ts
 *       custom: { interlaceCaching: { enabled: true } }
 *       ```
 *     </Typescript>
 *     <Javascript>...</Javascript>
 *     <Json>...</Json>
 *   </ServerlessConfigTabs>
 *
 * Slots are optional: omit a format and its tab disappears (e.g. JSON cannot
 * express CFN intrinsics, so some recipes omit it).
 */

import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';

const SLOT_LABELS = {
  yaml: 'serverless.yml',
  typescript: 'serverless.ts',
  javascript: 'serverless.js',
  json: 'serverless.json',
} as const;

type SlotKey = keyof typeof SLOT_LABELS;

interface SlotProps {
  children?: ReactNode;
  __slot?: SlotKey;
}

function Slot(slot: SlotKey) {
  const Component = ({ children }: SlotProps) => <>{children}</>;
  Component.displayName = `ServerlessConfigTabs.${slot}`;
  (Component as unknown as { __slot: SlotKey }).__slot = slot;
  return Component;
}

export const Yaml = Slot('yaml');
export const Typescript = Slot('typescript');
export const Javascript = Slot('javascript');
export const Json = Slot('json');

// Prefixed aliases so MDX files can `import { ServerlessConfigYaml, ... }` from
// this module directly without going through the MDX-component map renaming.
export {
  Yaml as ServerlessConfigYaml,
  Typescript as ServerlessConfigTypescript,
  Javascript as ServerlessConfigJavascript,
  Json as ServerlessConfigJson,
};

export interface ServerlessConfigTabsProps {
  /** Optional persistence key — Fumadocs `<Tabs>` `groupId`. Sticks selection across pages. */
  groupId?: string;
  children: ReactNode;
}

interface SlottedElement {
  type: { __slot?: SlotKey };
  props: SlotProps;
}

function isSlotted(element: unknown): element is SlottedElement {
  if (!isValidElement(element)) return false;
  const type = (element as ReactElement).type as unknown;
  return (
    typeof type === 'function' &&
    typeof (type as { __slot?: unknown }).__slot === 'string'
  );
}

export function ServerlessConfigTabs({
  groupId = 'serverless-config',
  children,
}: ServerlessConfigTabsProps) {
  const slots = new Map<SlotKey, ReactNode>();
  for (const child of Children.toArray(children)) {
    if (isSlotted(child)) {
      const slotKey = child.type.__slot;
      if (slotKey) slots.set(slotKey, child.props.children);
    }
  }

  const order: SlotKey[] = ['yaml', 'typescript', 'javascript', 'json'];
  const present = order.filter((key) => slots.has(key));

  if (present.length === 0) {
    return null;
  }

  return (
    <Tabs groupId={groupId} items={present.map((key) => SLOT_LABELS[key])} persist>
      {present.map((key) => (
        <Tab key={key} value={SLOT_LABELS[key]}>
          {slots.get(key)}
        </Tab>
      ))}
    </Tabs>
  );
}
