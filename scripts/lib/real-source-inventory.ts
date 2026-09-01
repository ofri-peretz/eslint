/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The one place that decides whether `real-world-rule-inventory.json` may be
 * quoted.
 *
 * "Scanned and never fired" is the strongest negative claim this repo makes
 * about a rule: it says 345,841 files of other people's code never showed the
 * rule a candidate. That claim is worth nothing if the scan did not ask the
 * rule, and for seven whole plugins it did not — the config that produced the
 * committed inventory had no TypeScript parser and never linted a `.tsx` file,
 * so `react-a11y` read as "37 rules that never fire" when the truth was "37
 * rules nobody ran".
 *
 * `rule-case-ledger.ts` learned to check this on 2026-08-30 and the other two
 * readers did not, so the same numbers still reached a freshness receipt and
 * the case harvester unchallenged. One consumer checking is not a control; it
 * is a habit that one file happens to have. Hence a shared reader: a fourth
 * consumer gets the check by using the artifact at all.
 *
 * Two inputs are hashed, not one. The ESLint config decides which rules were
 * ASKED; `real-source-repos.json` decides what they were asked ABOUT. A scan
 * over a different repository list is a different measurement, and it will look
 * comparable to this one unless the list is part of the stamp.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export type Inventory = {
  rules: Record<string, { count: number; repos: number }>;
  withoutMaterial: string[];
  filesLinted: number;
  reposScanned: number;
  suiteRules?: number;
  withMaterial?: number;
  generated?: string;
  /** Hash of the ESLint config the scan ran with. Absent on pre-2026-08-30 files. */
  configHash?: string;
  /** Hash of the repository list the scan ran over. Absent on pre-2026-08-31 files. */
  reposHash?: string;
};

export type InventoryRead = {
  /** The parsed artifact, or null when it is missing or unreadable. */
  inventory: Inventory | null;
  /** True only when every recorded stamp matches the inputs on disk today. */
  isCurrent: boolean;
  /** Why it may not be quoted. Empty when `isCurrent`. */
  reason: string;
};

function hashOf(root: string, relative: string): string | null {
  try {
    return createHash('sha256')
      .update(fs.readFileSync(path.join(root, relative)))
      .digest('hex')
      .slice(0, 16);
  } catch {
    return null;
  }
}

export const INVENTORY_RELATIVE =
  'benchmarks/budgets/real-world-rule-inventory.json';
export const CONFIG_RELATIVE = 'eslint.real-source.config.mjs';
export const REPOS_RELATIVE = 'benchmarks/real-source-repos.json';

/** Hash the current inputs, for the scan to stamp its output with. */
export function currentStamps(root: string): {
  configHash: string | null;
  reposHash: string | null;
} {
  return {
    configHash: hashOf(root, CONFIG_RELATIVE),
    reposHash: hashOf(root, REPOS_RELATIVE),
  };
}

/**
 * Read the inventory and say whether it describes the instrument we hold.
 *
 * Never throws: a caller that cannot read the file must still be able to say
 * "unknown" rather than crash a gate. But it also never returns
 * `isCurrent: true` on a doubt — an absent stamp is a mismatch, because the
 * file that has no stamp is precisely the file written before anyone was
 * checking.
 */
export function readRealSourceInventory(root: string): InventoryRead {
  let inventory: Inventory | null = null;
  try {
    inventory = JSON.parse(
      fs.readFileSync(path.join(root, INVENTORY_RELATIVE), 'utf8'),
    ) as Inventory;
  } catch {
    return {
      inventory: null,
      isCurrent: false,
      reason: 'inventory is missing or unreadable',
    };
  }

  const { configHash, reposHash } = currentStamps(root);
  if (configHash === null) {
    return {
      inventory,
      isCurrent: false,
      reason: `${CONFIG_RELATIVE} is missing`,
    };
  }
  if (inventory.configHash === undefined) {
    return {
      inventory,
      isCurrent: false,
      reason:
        'inventory records no configHash — it predates the stamp, so which rules it asked is unknown',
    };
  }
  if (inventory.configHash !== configHash) {
    return {
      inventory,
      isCurrent: false,
      reason: `config has changed since the scan (${inventory.configHash} != ${configHash})`,
    };
  }
  if (
    reposHash !== null &&
    inventory.reposHash !== undefined &&
    inventory.reposHash !== reposHash
  ) {
    return {
      inventory,
      isCurrent: false,
      reason: `repository list has changed since the scan (${inventory.reposHash} != ${reposHash})`,
    };
  }
  return { inventory, isCurrent: true, reason: '' };
}

/** The line every consumer prints when it refuses to quote the number. */
export function staleNotice(reason: string): string {
  return (
    `  ⚠ real-source inventory not quoted: ${reason}.\n` +
    `    Re-run: npx tsx scripts/real-source-scan.mts  (113 clones; not a cron job)`
  );
}
