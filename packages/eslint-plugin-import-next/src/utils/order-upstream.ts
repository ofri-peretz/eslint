/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `order` under eslint-plugin-import's options, with eslint-plugin-import's
 * meaning.
 *
 * A port of import-js/eslint-plugin-import `src/rules/order.js` and
 * `src/core/importType.js` at v2.32.0 — MIT License, Copyright (c) 2015 Ben
 * Mosher. `enforce-import-order` runs this engine only when its options are
 * written eslint-plugin-import's way (`isUpstreamOrderForm`); its own options
 * keep its own reading.
 *
 * Where the port departs from the original, on purpose:
 *   - globs are matched by Node's `path.posix.matchesGlob`, not minimatch (no
 *     external dependencies). `patternOptions` is limited to the minimatch
 *     switches it can honour — `matchBase`, `nocase`, `nonegate`, `nocomment`
 *     — and the schema rejects any other key rather than ignore it;
 *   - "is `module` / `exports` shadowed?" (for `named.cjsExports`) reads the
 *     enclosing block's own declarations and the enclosing function's
 *     parameters, not ESLint's scope manager, which oxlint does not have;
 *   - module classification resolves with the devkit's resolver;
 *     `import/resolver` settings are not consulted;
 *   - the autofix moves a CommonJS export assignment only across other
 *     assignment statements — upstream moved it across any code;
 *   - `typeof` imports (Flow) are not described specially: no parser this
 *     package runs on produces them.
 */
import { isBuiltin } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
  propertyName,
  resolveModule,
} from '@interlace/eslint-devkit';

type NewlinesMode = 'ignore' | 'always' | 'always-and-inside-groups' | 'never';
type SortOrder = 'ignore' | 'asc' | 'desc';

/** The minimatch switches `path.matchesGlob` can be made to honour. */
export interface PatternOptions {
  matchBase?: boolean;
  nocase?: boolean;
  nonegate?: boolean;
  nocomment?: boolean;
}

export interface PathGroup {
  pattern: string;
  patternOptions?: PatternOptions;
  group: string;
  position?: 'before' | 'after';
}

/** eslint-plugin-import's `order` options. */
export interface UpstreamOrderOptions {
  groups?: (string | string[])[];
  pathGroups?: PathGroup[];
  pathGroupsExcludedImportTypes?: string[];
  distinctGroup?: boolean;
  'newlines-between'?: NewlinesMode;
  'newlines-between-types'?: NewlinesMode;
  consolidateIslands?: 'inside-groups' | 'never';
  sortTypesGroup?: boolean;
  named?:
    | boolean
    | {
        enabled?: boolean;
        import?: boolean;
        export?: boolean;
        require?: boolean;
        cjsExports?: boolean;
        types?: 'mixed' | 'types-first' | 'types-last';
      };
  alphabetize?: {
    order?: SortOrder;
    orderImportKind?: SortOrder;
    caseInsensitive?: boolean;
  };
  warnOnUnassignedImports?: boolean;
  /** import-next's own keys, honoured when written alongside upstream's. */
  internalPatterns?: string[];
  newlinesBetween?: 'always' | 'never' | 'ignore';
}

/** The option keys and group names import-next's own reading understands. */
const OWN_KEYS = new Set([
  'groups',
  'internalPatterns',
  'alphabetize',
  'newlinesBetween',
]);
const OWN_GROUPS = new Set([
  'builtin',
  'external',
  'internal',
  'parent',
  'sibling',
  'index',
  'object',
  'type',
  'side-effect',
]);

/**
 * Are these options written the way eslint-plugin-import writes them? A key
 * import-next's own shape does not have, `alphabetize.orderImportKind`, or a
 * `groups` entry that is a nested array or a name import-next does not know.
 * `[{ groups }]` and `[{ alphabetize: { order, caseInsensitive } }]` alone
 * mean something in both, and keep import-next's reading.
 */
export function isUpstreamOrderForm(options: readonly unknown[]): boolean {
  const o = (options[0] ?? {}) as UpstreamOrderOptions;
  return (
    Object.keys(o).some((key) => !OWN_KEYS.has(key)) ||
    o.alphabetize?.orderImportKind !== undefined ||
    (o.groups ?? []).some(
      (group) => typeof group !== 'string' || !OWN_GROUPS.has(group),
    )
  );
}

/** Every module type a group may name. */
export const UPSTREAM_TYPES = [
  'builtin',
  'external',
  'internal',
  'unknown',
  'parent',
  'sibling',
  'index',
  'object',
  'type',
] as const;

const DEFAULT_GROUPS = ['builtin', 'external', 'parent', 'sibling', 'index'];

const DOCS =
  'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md';

const message = (issueName: string, description: string, fix: string): string =>
  formatLLMMessage({
    icon: MessageIcons.ARCHITECTURE,
    issueName,
    description,
    severity: 'LOW',
    fix,
    documentationLink: DOCS,
  });

export const upstreamOrderMessages = {
  upstreamOutOfOrder: message(
    'Import Order',
    '{{second}} should occur {{order}} {{first}}',
    'Move it to its configured place',
  ),
  upstreamMissingNewline: message(
    'Import Group Spacing',
    'There should be at least one empty line between import groups',
    'Add an empty line between the groups',
  ),
  upstreamNewlineInGroup: message(
    'Import Group Spacing',
    'There should be no empty line within import group',
    'Remove the empty line',
  ),
  upstreamNewlineBetweenGroups: message(
    'Import Group Spacing',
    'There should be no empty line between import groups',
    'Remove the empty line',
  ),
  upstreamIslandBeforeMultiline: message(
    'Import Island',
    'There should be at least one empty line between this import and the multi-line import that follows it',
    'Add an empty line',
  ),
  upstreamIslandAfterMultiline: message(
    'Import Island',
    'There should be at least one empty line between this multi-line import and the import that follows it',
    'Add an empty line',
  ),
  upstreamIslandSingleLines: message(
    'Import Island',
    'There should be no empty lines between this single-line import and the single-line import that follows it',
    'Remove the empty line',
  ),
};

export type UpstreamMessageIds = keyof typeof upstreamOrderMessages;

type UpstreamContext = Readonly<
  TSESLint.RuleContext<UpstreamMessageIds, readonly unknown[]>
>;

type Node = TSESTree.Node;
type Category = 'import' | 'named' | 'exports';

interface Entry {
  node: Node;
  value: string;
  displayName: string;
  type: 'import' | 'import:object' | 'require' | 'export';
  rank: number;
  kind?: string;
  alias?: string;
  isMultiline?: boolean;
}

type NamedItem = Omit<Entry, 'rank' | 'displayName'> & {
  displayName?: string;
};

const kindOf = (node: Node): string | undefined =>
  (node as { importKind?: string }).importKind;

/** `@scope/name`, eslint-plugin-import's `isScoped`. */
/**
 * Is `file` inside `dir`? By path SEGMENT: a folder named `..cache` is
 * inside, though its relative path starts with `..` (eslint-plugin-import
 * tests the prefix, and calls it outside).
 */
function isInside(dir: string, file: string): boolean {
  const relative = path.relative(dir, file);
  // Another drive (Windows) comes back absolute: outside. `..` alone and
  // `../x` are outside; `..cache/x` is not.
  return (
    !path.isAbsolute(relative) &&
    !`${relative}${path.sep}`.startsWith(`..${path.sep}`)
  );
}

const SCOPED = /^@[^/]+\/?[^/]+/;
const INDEX = new Set(['.', './', './index', './index.js']);

/** The directory holding the nearest package.json, cached per directory. */
const packageDirs = new Map<string, string>();
function packageDirOf(dir: string): string {
  let found = packageDirs.get(dir);
  if (found === undefined) {
    const parent = path.dirname(dir);
    found =
      fs.existsSync(path.join(dir, 'package.json')) || parent === dir
        ? dir
        : packageDirOf(parent);
    packageDirs.set(dir, found);
  }
  return found;
}

/**
 * ASCII capitals as caseless private-use characters. `path.matchesGlob` folds
 * case for a pattern with wildcards on macOS and Windows (Node passes
 * `nocase` there) but not on Linux, so `[a-z]*` matched `Bar` on one machine
 * and not another. minimatch, which eslint-plugin-import uses, is
 * case-sensitive everywhere; with no capitals left to fold, so is this.
 */
const caseless = (s: string): string =>
  s.replace(/[A-Z]/g, (c) => String.fromCharCode(0xe000 + c.charCodeAt(0)));

/** minimatch, as far as `path.matchesGlob` and these switches reach. */
function globMatch(
  name: string,
  group: Pick<PathGroup, 'pattern' | 'patternOptions'>,
): boolean {
  const options = group.patternOptions ?? { nocomment: true };
  let pattern = group.pattern;
  if (!options.nocomment && pattern.startsWith('#')) return false;
  let negate = false;
  while (!options.nonegate && pattern.startsWith('!')) {
    negate = !negate;
    pattern = pattern.slice(1);
  }
  let subject =
    options.matchBase && !pattern.includes('/')
      ? path.posix.basename(name)
      : name;
  if (options.nocase) {
    subject = subject.toLowerCase();
    pattern = pattern.toLowerCase();
  }
  return (
    path.posix.matchesGlob(caseless(subject), caseless(pattern)) !== negate
  );
}

const compareString = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

function isRequireExpression(
  expr: Node | null | undefined,
): expr is TSESTree.CallExpression {
  return (
    expr?.type === 'CallExpression' &&
    (expr.callee as { name?: string }).name === 'require' &&
    expr.arguments.length === 1 &&
    expr.arguments[0].type === 'Literal'
  );
}

/**
 * `{ a, b: c }` — every property a statically named key bound to a plain
 * identifier. `{ ['a']: c }` and `{ 'a': c }` name the same key as
 * `{ a: c }`, so they are read the same way.
 */
function plainProperties(
  properties: readonly Node[],
): properties is TSESTree.Property[] {
  return properties.every(
    (p) =>
      p.type === 'Property' &&
      objectKeyName(p) !== null &&
      p.value.type === 'Identifier',
  );
}

const nameOf = (node: Node): string =>
  node.type === 'Identifier'
    ? node.name
    : String((node as TSESTree.StringLiteral).value);

/** A statement an import may be moved across when fixing. */
function canCross(node: Node, category: Category): boolean {
  if (category === 'exports') {
    return (
      node.type === 'ExpressionStatement' &&
      node.expression.type === 'AssignmentExpression'
    );
  }
  if (node.type === 'VariableDeclaration') {
    const [decl] = node.declarations;
    const init =
      decl.init?.type === 'CallExpression' &&
      decl.init.callee.type === 'MemberExpression'
        ? decl.init.callee.object
        : decl.init;
    return (
      node.declarations.length === 1 &&
      (decl.id.type === 'Identifier' || decl.id.type === 'ObjectPattern') &&
      isRequireExpression(init)
    );
  }
  return (
    (node.type === 'ImportDeclaration' && node.specifiers.length > 0) ||
    (node.type === 'TSImportEqualsDeclaration' &&
      node.moduleReference.type === 'TSExternalModuleReference')
  );
}

/** The statement a node belongs to: the child of the nearest body-holder. */
function findRootNode(node: Node): Node {
  let n = node;
  while (!Array.isArray((n.parent as { body?: unknown }).body)) n = n.parent!;
  return n;
}

/** eslint-plugin-import's `order` engine, for one rule instance. */
export function createUpstreamOrder(context: UpstreamContext) {
  let sourceCode: Readonly<TSESLint.SourceCode>;
  let text: string;
  let options: UpstreamOrderOptions;
  let newlinesImports: NewlinesMode;
  let newlinesTypes: NewlinesMode;
  let excluded: Set<string>;
  let consolidating: boolean;
  let distinctGroup: boolean;
  let named: {
    import?: boolean;
    export?: boolean;
    require?: boolean;
    cjsExports?: boolean;
  };
  let namedGroups: string[];
  let alphabetize: {
    order: SortOrder;
    orderImportKind: SortOrder;
    caseInsensitive: boolean;
  };
  let ranks: Record<string, number>;
  let typeGroupInGroups: boolean;
  let sortingTypesGroup: boolean;
  let sideEffectGroup: boolean;
  let pathGroups: (Omit<PathGroup, 'position'> & { position: number })[];
  let maxPosition: number;
  let internalRegexes: RegExp[];
  let coreModules: string[];
  let externalFolders: string[];
  let packageDir: string;
  let importMap: Map<Node, Entry[]>;
  let exportMap: Map<Node, Entry[]>;

  function blockOf(map: Map<Node, Entry[]>, block: Node): Entry[] {
    let entries = map.get(block);
    if (!entries) {
      entries = [];
      map.set(block, entries);
    }
    return entries;
  }

  // ── classification (src/core/importType.js) ───────────────────────────
  function importType(name: string): string {
    if (internalRegexes.some((re) => re.test(name))) return 'internal';
    if (path.isAbsolute(name)) return 'absolute';
    if (/^\.\.$|^\.\.[\\/]/.test(name)) return 'parent';
    if (INDEX.has(name)) return 'index';
    if (/^\.[\\/]/.test(name)) return 'sibling';
    const resolved = resolveModule(name, context.filename);
    if (resolved) {
      const inFolder = externalFolders.some((folder) =>
        isInside(path.resolve(packageDir, folder), resolved),
      );
      return !isInside(packageDir, resolved) || inFolder
        ? 'external'
        : 'internal';
    }
    const base = SCOPED.test(name)
      ? name.split('/').slice(0, 2).join('/')
      : name.split('/')[0];
    if (isBuiltin(base) || coreModules.includes(base)) return 'builtin';
    return /^\w/.test(name) || SCOPED.test(name) ? 'external' : 'unknown';
  }

  // ── ranking ────────────────────────────────────────────────────────────
  function computeRank(entry: NamedItem, unassigned: boolean): number | null {
    const isTypeOnly = kindOf(entry.node) === 'type';
    let impType: string;
    if (entry.type === 'import:object') impType = 'object';
    else if (unassigned && sideEffectGroup) impType = 'side-effect';
    else if (isTypeOnly && typeGroupInGroups && !sortingTypesGroup)
      impType = 'type';
    else impType = importType(entry.value);

    let rank: number | undefined;
    if (
      !excluded.has(impType) &&
      !(isTypeOnly && typeGroupInGroups && excluded.has('type'))
    ) {
      const match = pathGroups.find((group) => globMatch(entry.value, group));
      if (match) rank = ranks[match.group] + match.position / maxPosition;
    }
    rank ??= ranks[impType];
    if (rank === undefined) return null;
    if (isTypeOnly && sortingTypesGroup) rank = ranks['type'] + rank / 10;
    if (entry.type === 'require') rank += 100;
    return rank;
  }

  function register(entry: NamedItem, block: Node, unassigned = false): void {
    const rank = computeRank(entry, unassigned);
    if (rank === null) return;
    let node = entry.node;
    if (
      entry.type === 'require' &&
      node.parent!.parent!.type === 'VariableDeclaration'
    ) {
      node = node.parent!.parent!;
    }
    blockOf(importMap, block).push({
      ...entry,
      displayName: entry.displayName ?? entry.value,
      rank,
      isMultiline: node.loc.end.line !== node.loc.start.line,
    });
  }

  // ── alphabetize ────────────────────────────────────────────────────────
  function sorter(a: Entry, b: Entry): number {
    const norm = (v: string) =>
      alphabetize.caseInsensitive ? v.toLowerCase() : v;
    const A = norm(a.value);
    const B = norm(b.value);
    let result = 0;
    if (!A.includes('/') && !B.includes('/')) {
      result = compareString(A, B);
    } else {
      const as = A.split('/');
      const bs = B.split('/');
      for (let i = 0; i < Math.min(as.length, bs.length); i++) {
        // Both relative: the first segment is the group, not the name.
        if (i === 0 && /^\.\.?$/.test(as[0]) && /^\.\.?$/.test(bs[0])) {
          if (as[0] !== bs[0]) break;
          continue;
        }
        result = compareString(as[i], bs[i]);
        if (result) break;
      }
      if (!result && as.length !== bs.length) {
        result = as.length < bs.length ? -1 : 1;
      }
    }
    result *= alphabetize.order === 'asc' ? 1 : -1;
    if (!result && alphabetize.orderImportKind !== 'ignore') {
      result =
        (alphabetize.orderImportKind === 'asc' ? 1 : -1) *
        compareString(kindOf(a.node) ?? 'value', kindOf(b.node) ?? 'value');
    }
    return result;
  }

  function alphabetizeRanks(entries: Entry[]): void {
    const groups = new Map<number, Entry[]>();
    for (const entry of entries) {
      const group = groups.get(entry.rank);
      if (group) group.push(entry);
      else groups.set(entry.rank, [entry]);
    }
    const key = (e: Entry) => `${e.value}|${kindOf(e.node)}`;
    const final = new Map<string, number>();
    let next = 0;
    for (const rank of [...groups.keys()].sort((a, b) => a - b)) {
      // oxlint-disable-next-line unicorn/no-array-sort
      for (const entry of groups.get(rank)!.sort(sorter)) {
        final.set(key(entry), Math.trunc(rank) + next++);
      }
    }
    for (const entry of entries) entry.rank = final.get(key(entry))!;
  }

  // ── reporting order ────────────────────────────────────────────────────
  function findOutOfOrder(entries: Entry[]): Entry[] {
    let max = entries[0];
    return entries.filter((entry) => {
      const out = entry.rank < max.rank;
      if (max.rank < entry.rank) max = entry;
      return out;
    });
  }

  function makeOutOfOrderReport(entries: Entry[], category: Category): void {
    const outOfOrder = findOutOfOrder(entries);
    if (!outOfOrder.length) return;
    // Report whichever direction names fewer imports.
    const reversed = entries
      .map((entry) => ({ ...entry, rank: -entry.rank }))
      .reverse();
    const reversedOrder = findOutOfOrder(reversed);
    const [list, out, order] =
      reversedOrder.length < outOfOrder.length
        ? [reversed, reversedOrder, 'after' as const]
        : [entries, outOfOrder, 'before' as const];
    for (const entry of out) {
      const found = list.find((other) => other.rank > entry.rank)!;
      reportOutOfOrder(found, entry, order, category);
    }
  }

  function describeEntry(entry: Entry): string {
    if (entry.type === 'export') {
      return (entry.node as { exportKind?: string }).exportKind === 'type'
        ? 'type export'
        : 'export';
    }
    return kindOf(entry.node) === 'type' ? 'type import' : 'import';
  }

  // ── fixing ─────────────────────────────────────────────────────────────
  const sameLineComment =
    (node: Node) =>
    (token: TSESTree.Token): boolean =>
      (token.type === 'Block' || token.type === 'Line') &&
      token.loc.start.line === token.loc.end.line &&
      token.loc.end.line === node.loc.end.line;

  /** Where `node`'s line ends, past same-line comments and the newline. */
  function endOfLine(node: Node): number {
    const isSameLine = sameLineComment(node);
    let end = node.range[1];
    let token = sourceCode.getTokenAfter(node, { includeComments: true });
    while (token && isSameLine(token)) {
      end = token.range[1];
      token = sourceCode.getTokenAfter(token, { includeComments: true });
    }
    const trailing = /[ \t\r]*\n?/y;
    trailing.lastIndex = end;
    trailing.exec(text);
    return trailing.lastIndex;
  }

  /** Where `node`'s line starts, before same-line comments and indent. */
  function startOfLine(node: Node): number {
    const isSameLine = sameLineComment(node);
    let start = node.range[0];
    let token = sourceCode.getTokenBefore(node, { includeComments: true });
    while (token && isSameLine(token)) {
      start = token.range[0];
      token = sourceCode.getTokenBefore(token, { includeComments: true });
    }
    while (start > 0 && (text[start - 1] === ' ' || text[start - 1] === '\t')) {
      start--;
    }
    return start;
  }

  function canReorder(first: Node, second: Node, category: Category): boolean {
    const body = (first.parent as { body: Node[] }).body;
    const [from, to] = [body.indexOf(first), body.indexOf(second)].sort(
      (a, b) => a - b,
    );
    return body.slice(from, to + 1).every((node) => canCross(node, category));
  }

  function reportOutOfOrder(
    first: Entry,
    second: Entry,
    order: 'before' | 'after',
    category: Category,
  ): void {
    let firstName = first.displayName;
    let secondName = second.displayName;
    if (firstName === secondName) {
      if (first.alias) firstName = `${firstName} as ${first.alias}`;
      if (second.alias) secondName = `${secondName} as ${second.alias}`;
    }
    const data = {
      second: `\`${secondName}\` ${describeEntry(second)}`,
      order,
      first: `${describeEntry(first)} of \`${firstName}\``,
    };
    const report = (fix: TSESLint.ReportFixFunction | null) =>
      context.report({
        node: second.node,
        messageId: 'upstreamOutOfOrder',
        data,
        fix,
      });

    if (category === 'named') {
      const a = first.node;
      const b = second.node;
      const aStart = sourceCode.getTokenBefore(a)!.range[1];
      const aEnd = sourceCode.getTokenAfter(a)!.range[0];
      const bStart = sourceCode.getTokenBefore(b)!.range[1];
      const bEnd = sourceCode.getTokenAfter(b)!.range[0];
      const aCode = text.slice(aStart, a.range[1]);
      const aTrivia = text.slice(a.range[1], aEnd);
      const bCode = text.slice(bStart, b.range[1]);
      const bTrivia = text.slice(b.range[1], bEnd);
      if (order === 'before') {
        const trimmed = bTrivia.trimEnd();
        const gap = text.slice(aEnd, bStart - 1);
        const space = bTrivia.slice(trimmed.length);
        report((fixer) =>
          fixer.replaceTextRange(
            [aStart, bEnd],
            `${bCode},${trimmed}${aCode}${aTrivia}${gap}${space}`,
          ),
        );
      } else {
        const trimmed = aTrivia.trimEnd();
        const gap = text.slice(bEnd + 1, aStart);
        const space = aTrivia.slice(trimmed.length);
        report((fixer) =>
          fixer.replaceTextRange(
            [bStart, aEnd],
            `${gap}${aCode},${trimmed}${bCode}${space}`,
          ),
        );
      }
      return;
    }

    const a = findRootNode(first.node);
    const b = findRootNode(second.node);
    if (!canReorder(a, b, category)) {
      report(null);
      return;
    }
    const aStart = startOfLine(a);
    const aEnd = endOfLine(a);
    const bStart = startOfLine(b);
    const bEnd = endOfLine(b);
    let moved = text.slice(bStart, bEnd);
    if (!moved.endsWith('\n')) moved += '\n';
    report((fixer) =>
      order === 'before'
        ? fixer.replaceTextRange(
            [aStart, bEnd],
            moved + text.slice(aStart, bStart),
          )
        : fixer.replaceTextRange(
            [bStart, aEnd],
            text.slice(bEnd, aEnd) + moved,
          ),
    );
  }

  // ── newlines ───────────────────────────────────────────────────────────
  function insertNewlineAfter(entry: Entry): TSESLint.ReportFixFunction {
    const root = findRootNode(entry.node);
    let end = root.range[1];
    let token = sourceCode.getTokenAfter(root, { includeComments: true });
    const isSameLine = sameLineComment(root);
    while (token && isSameLine(token)) {
      end = token.range[1];
      token = sourceCode.getTokenAfter(token, { includeComments: true });
    }
    return (fixer) => fixer.insertTextAfterRange([root.range[0], end], '\n');
  }

  function removeNewlines(
    current: Entry,
    previous: Entry,
  ): TSESLint.ReportFixFunction | null {
    const range: [number, number] = [
      endOfLine(findRootNode(previous.node)),
      startOfLine(findRootNode(current.node)),
    ];
    return /^\s*$/.test(text.slice(...range))
      ? (fixer) => fixer.removeRange(range)
      : null;
  }

  function makeNewlinesReport(entries: Entry[]): void {
    let previous = entries[0];
    for (const current of entries.slice(1)) {
      const emptyLines = sourceCode.lines
        .slice(previous.node.loc.end.line, current.node.loc.start.line - 1)
        .filter((line) => !line.trim()).length;
      const startsGroup = current.rank - 1 >= previous.rank;
      const isType = kindOf(current.node) === 'type';
      const typeAndValue =
        isType !== (kindOf(previous.node) === 'type') && sortingTypesGroup;
      const typeRelevant = isType && sortingTypesGroup;
      const multiline = previous.isMultiline || current.isMultiline;
      // Where newlines-between and consolidateIslands disagree, islands win.
      const between =
        sortingTypesGroup &&
        consolidating &&
        multiline &&
        newlinesImports === 'never'
          ? 'always-and-inside-groups'
          : newlinesImports;
      const betweenTypes =
        sortingTypesGroup &&
        consolidating &&
        (typeAndValue || multiline) &&
        newlinesTypes === 'never'
          ? 'always-and-inside-groups'
          : newlinesTypes;
      const sameGroup = distinctGroup
        ? current.rank === previous.rank
        : !startsGroup;
      const mode = typeRelevant || typeAndValue ? betweenTypes : between;
      const report = (
        messageId: UpstreamMessageIds,
        fix: TSESLint.ReportFixFunction | null,
      ) => context.report({ node: previous.node, messageId, fix });

      if ((typeRelevant ? betweenTypes : between) !== 'ignore') {
        let reported = false;
        if (mode === 'always' || mode === 'always-and-inside-groups') {
          if (current.rank !== previous.rank && emptyLines === 0) {
            if (distinctGroup || startsGroup) {
              reported = true;
              report('upstreamMissingNewline', insertNewlineAfter(previous));
            }
          } else if (emptyLines > 0 && mode === 'always') {
            if (sameGroup) {
              reported = true;
              report(
                'upstreamNewlineInGroup',
                removeNewlines(current, previous),
              );
            }
          }
        } else if (
          emptyLines > 0 &&
          (!typeAndValue || betweenTypes === 'never')
        ) {
          reported = true;
          report(
            'upstreamNewlineBetweenGroups',
            removeNewlines(current, previous),
          );
        }

        if (!reported && consolidating) {
          if (emptyLines === 0 && current.isMultiline) {
            report(
              'upstreamIslandBeforeMultiline',
              insertNewlineAfter(previous),
            );
          } else if (emptyLines === 0 && previous.isMultiline) {
            report(
              'upstreamIslandAfterMultiline',
              insertNewlineAfter(previous),
            );
          } else if (emptyLines > 0 && !multiline && sameGroup) {
            report(
              'upstreamIslandSingleLines',
              removeNewlines(current, previous),
            );
          }
        }
      }
      previous = current;
    }
  }

  // ── named ──────────────────────────────────────────────────────────────
  function makeNamedReport(items: NamedItem[]): void {
    if (items.length < 2) return;
    const entries = items.map((item): Entry => {
      const rank = namedGroups.indexOf(item.kind ?? 'value');
      return {
        ...item,
        displayName: item.value,
        rank: rank === -1 ? namedGroups.length : rank,
        value: `${item.value}:${item.alias ?? ''}`,
      };
    });
    if (alphabetize.order !== 'ignore') alphabetizeRanks(entries);
    makeOutOfOrderReport(entries, 'named');
  }

  const aliasOf = (key: Node, local: Node): string | undefined =>
    key.range[0] === local.range[0] ? undefined : nameOf(local);

  /** Is `name` declared by the block holding `node`, or its function? */
  function shadowed(node: Node, name: string): boolean {
    let block = node.parent!;
    while (block.type !== 'Program' && block.type !== 'BlockStatement') {
      block = block.parent!;
    }
    const fn = block.parent as { params?: Node[] } | undefined;
    const ids = (block.body as Node[]).flatMap((statement) =>
      statement.type === 'VariableDeclaration'
        ? statement.declarations.map((d) => d.id as Node)
        : [],
    );
    return [...ids, ...(fn?.params ?? [])].some(
      (id) => id.type === 'Identifier' && id.name === name,
    );
  }

  /**
   * `module.exports` or `exports`, unshadowed. `module['exports']` is the
   * same object; `module[exports]` (a variable) is not.
   */
  function isCJSExports(node: Node): boolean {
    if (
      node.type === 'MemberExpression' &&
      node.object.type === 'Identifier' &&
      node.object.name === 'module' &&
      propertyName(node) === 'exports'
    ) {
      return !shadowed(node, 'module');
    }
    return (
      node.type === 'Identifier' &&
      node.name === 'exports' &&
      !shadowed(node, 'exports')
    );
  }

  /** `module.exports.a.b` → `['a', 'b']`; anything else → undefined. */
  function namedCJSExports(node: Node): string[] | undefined {
    const result: string[] = [];
    let root = node;
    let parent = node;
    while (root.type === 'MemberExpression') {
      // `exports['a']` names the same export as `exports.a` (eslint-plugin-
      // import reads only the dotted form). A computed key that is not a
      // static string names nothing this rule can order.
      const name = propertyName(root);
      if (name === null) return undefined;
      result.unshift(name);
      parent = root;
      root = root.object;
    }
    if (isCJSExports(root)) return result;
    if (isCJSExports(parent)) return result.slice(1);
    return undefined;
  }

  return {
    before(): void {
      sourceCode = context.sourceCode;
      text = sourceCode.text;
      // No options: eslint-plugin-import's defaults, every one of them.
      options = (context.options[0] ?? {}) as UpstreamOrderOptions;
      newlinesImports =
        options['newlines-between'] ?? options.newlinesBetween ?? 'ignore';
      newlinesTypes = options['newlines-between-types'] ?? newlinesImports;
      excluded = new Set(
        options.pathGroupsExcludedImportTypes ?? [
          'builtin',
          'external',
          'object',
        ],
      );
      consolidating =
        options.consolidateIslands === 'inside-groups' &&
        (newlinesImports === 'always-and-inside-groups' ||
          newlinesTypes === 'always-and-inside-groups');
      distinctGroup = options.distinctGroup ?? true;

      const n = options.named;
      const pick = (key: 'import' | 'export' | 'require' | 'cjsExports') =>
        typeof n === 'object' ? (key in n ? n[key] : n.enabled) : n;
      named = {
        import: pick('import'),
        export: pick('export'),
        require: pick('require'),
        cjsExports: pick('cjsExports'),
      };
      const types = typeof n === 'object' ? n.types : undefined;
      namedGroups =
        types === 'types-last'
          ? ['value']
          : types === 'types-first'
            ? ['type']
            : [];

      alphabetize = {
        order: options.alphabetize?.order ?? 'ignore',
        orderImportKind: options.alphabetize?.orderImportKind ?? 'ignore',
        caseInsensitive: options.alphabetize?.caseInsensitive ?? false,
      };

      const groups = options.groups ?? DEFAULT_GROUPS;
      ranks = {};
      groups.forEach((group, index) => {
        for (const item of ([] as string[]).concat(group)) {
          ranks[item] = index * 2;
        }
      });
      for (const type of UPSTREAM_TYPES) ranks[type] ??= groups.length * 2;
      const listed = new Set(groups.flat());
      typeGroupInGroups = listed.has('type');
      sortingTypesGroup = typeGroupInGroups && !!options.sortTypesGroup;
      sideEffectGroup = listed.has('side-effect');

      // `position` → a fraction of a group's rank (convertPathGroupsForRanks).
      const after: Record<string, number> = {};
      const before: Record<string, number[]> = {};
      pathGroups = (options.pathGroups ?? []).map((group, index) => {
        let position = 0;
        if (group.position === 'after') {
          position = after[group.group] = (after[group.group] ?? 0) + 1;
        } else if (group.position === 'before') {
          (before[group.group] ??= []).push(index);
        }
        return { ...group, position };
      });
      let max = Math.max(1, ...Object.values(after));
      for (const indices of Object.values(before)) {
        indices.forEach((i, k) => {
          pathGroups[i].position = -(indices.length - k);
        });
        max = Math.max(max, indices.length);
      }
      maxPosition = max > 10 ? 10 ** Math.ceil(Math.log10(max)) : 10;

      const settings = context.settings as Record<string, unknown>;
      const regex = settings['import/internal-regex'] as string | undefined;
      internalRegexes = [
        ...(regex ? [regex] : []),
        ...(options.internalPatterns ?? []),
      ].map((source) => new RegExp(source));
      coreModules = (settings['import/core-modules'] as string[]) ?? [];
      externalFolders = (settings['import/external-module-folders'] as
        string[] | undefined) ?? ['node_modules'];
      // resolveModule returns real paths, so the package dir must be one too.
      // Through a symlinked directory (macOS's /var → /private/var, a linked
      // checkout) every resolved path was otherwise "outside" the package, and
      // a symlinked local package ranked external instead of internal.
      let dir = path.dirname(path.resolve(context.filename));
      try {
        dir = fs.realpathSync.native(dir);
      } catch {
        // Not on disk (an unsaved buffer, or removed mid-run): as given.
      }
      packageDir = packageDirOf(dir);
      importMap = new Map();
      exportMap = new Map();
    },

    ImportDeclaration(node: TSESTree.ImportDeclaration): void {
      const unassigned = node.specifiers.length === 0;
      if (unassigned && !options.warnOnUnassignedImports && !sideEffectGroup) {
        return;
      }
      const value = node.source.value;
      register({ node, value, type: 'import' }, node.parent, unassigned);
      if (!named.import) return;
      makeNamedReport(
        node.specifiers
          .filter(
            (s): s is TSESTree.ImportSpecifier => s.type === 'ImportSpecifier',
          )
          .map((s) => ({
            node: s,
            value: nameOf(s.imported),
            type: 'import',
            kind: s.importKind,
            alias: aliasOf(s.imported, s.local),
          })),
      );
    },

    TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration): void {
      const ref = node.moduleReference;
      const external = ref.type === 'TSExternalModuleReference';
      // `import x = require('x')` is an import of 'x'; `import x = A.B` is an
      // `object` import, named by its reference.
      register(
        external
          ? {
              node,
              value: (ref.expression as TSESTree.StringLiteral).value,
              type: 'import',
            }
          : {
              node,
              value: '',
              displayName: sourceCode.getText(ref),
              type: 'import:object',
            },
        node.parent,
      );
    },

    CallExpression(node: TSESTree.CallExpression): void {
      const [arg] = node.arguments;
      if (
        node.callee.type !== 'Identifier' ||
        node.callee.name !== 'require' ||
        node.arguments.length !== 1 ||
        arg.type !== 'Literal' ||
        typeof arg.value !== 'string'
      ) {
        return;
      }
      // `const x = require('x')`, `require('x').y`, `require('x')()` — only
      // at the top level.
      let n: Node = node;
      while (
        (n.parent!.type === 'MemberExpression' && n.parent!.object === n) ||
        (n.parent!.type === 'CallExpression' && n.parent!.callee === n)
      ) {
        n = n.parent!;
      }
      const declaration = n.parent!.parent;
      if (
        n.parent!.type !== 'VariableDeclarator' ||
        declaration!.parent!.type !== 'Program'
      ) {
        return;
      }
      register(
        { node, value: arg.value, type: 'require' },
        declaration!.parent!,
      );
    },

    VariableDeclarator(node: TSESTree.VariableDeclarator): void {
      if (
        !named.require ||
        node.id.type !== 'ObjectPattern' ||
        !isRequireExpression(node.init) ||
        !plainProperties(node.id.properties)
      ) {
        return;
      }
      makeNamedReport(
        node.id.properties.map((p) => ({
          node: p,
          value: objectKeyName(p)!,
          type: 'require',
          alias: aliasOf(p.key, p.value),
        })),
      );
    },

    ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration): void {
      if (!named.export) return;
      makeNamedReport(
        node.specifiers.map((s) => ({
          node: s,
          value: nameOf(s.local),
          type: 'export',
          kind: s.exportKind,
          alias: aliasOf(s.local, s.exported),
        })),
      );
    },

    AssignmentExpression(node: TSESTree.AssignmentExpression): void {
      if (!named.cjsExports || node.parent.type !== 'ExpressionStatement') {
        return;
      }
      if (isCJSExports(node.left)) {
        if (
          node.right.type === 'ObjectExpression' &&
          plainProperties(node.right.properties)
        ) {
          const names = node.right.properties.map((p) => objectKeyName(p)!);
          // A repeated key (`{ z: a, ['z']: b }`): the LAST one is the export,
          // so sorting the two would change its value. Leave the object alone.
          if (new Set(names).size !== names.length) return;
          makeNamedReport(
            node.right.properties.map((p, i) => ({
              node: p,
              value: names[i],
              type: 'export',
              alias: aliasOf(p.key, p.value),
            })),
          );
        }
        return;
      }
      const parts = namedCJSExports(node.left);
      if (parts) {
        const name = parts.join('.');
        blockOf(exportMap, node.parent.parent!).push({
          node,
          value: name,
          displayName: name,
          type: 'export',
          rank: 0,
        });
      }
    },

    exit(): void {
      for (const entries of importMap.values()) {
        if (newlinesImports !== 'ignore' || newlinesTypes !== 'ignore') {
          makeNewlinesReport(entries);
        }
        if (alphabetize.order !== 'ignore') alphabetizeRanks(entries);
        makeOutOfOrderReport(entries, 'import');
      }
      if (alphabetize.order !== 'ignore') {
        for (const entries of exportMap.values()) {
          alphabetizeRanks(entries);
          makeOutOfOrderReport(entries, 'exports');
        }
      }
    },
  };
}
