/**
 * Server-rendered sections of `/docs/oxlint`. Every list on that page comes
 * from the plugin registry, the synced rules manifest, or the generated
 * overlap map; none of it is typed by hand.
 */
import Link from 'next/link';

import { loadOxlintOverlap, oxlintAliases, pluginRules } from '@/lib/oxlint';
import { PLUGINS_BY_SLUG } from '@/lib/plugins';

const docsHref = (slug: string) =>
  `/docs/${PLUGINS_BY_SLUG[slug]?.pillar ?? 'quality'}/plugin-${slug}`;

/** All alias packages, each linked to npm (or marked when not published yet). */
export function OxlintAliasList() {
  const aliases = oxlintAliases();
  return (
    <table data-testid="oxlint-alias-list">
      <thead>
        <tr>
          <th>oxlint / Vite+ package</th>
          <th>Re-exports</th>
          <th>Covers</th>
        </tr>
      </thead>
      <tbody>
        {aliases.map((a) => (
          <tr key={a.slug}>
            <td>
              {a.published ? (
                <a
                  data-testid="oxlint-alias-npm-link"
                  href={`https://www.npmjs.com/package/${a.alias}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <code>{a.alias}</code>
                </a>
              ) : (
                <>
                  <code>{a.alias}</code> (not on npm yet)
                </>
              )}
            </td>
            <td>
              <Link href={docsHref(a.slug)}>
                <code>{a.package}</code>
              </Link>
            </td>
            <td>{a.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type OverlapEntry = ReturnType<typeof loadOxlintOverlap>['overlap'][number];

function groupByPlugin(entries: OverlapEntry[]) {
  const byPlugin = new Map<string, OverlapEntry[]>();
  for (const e of entries)
    byPlugin.set(e.plugin, [...(byPlugin.get(e.plugin) ?? []), e]);
  return [...byPlugin.entries()].toSorted(([a], [b]) => a.localeCompare(b));
}

const ruleLink = (e: OverlapEntry) => (
  <Link href={`${docsHref(e.plugin)}/rules/${e.rule}`}>
    <code>{e.id}</code>
  </Link>
);

/**
 * Our rules for which oxlint ships a native rule of the same name. Only the
 * triaged `equivalent` entries count; `differs` entries are listed apart with
 * the triage note, and `false-positive` (unrelated rules) are not shown.
 * The triage compares names and purpose, not behaviour, so the copy never
 * says more than that a same-named native rule exists.
 */
export function OxlintBuiltinOverlap() {
  const data = loadOxlintOverlap();
  const equivalent = data.overlap.filter((e) => e.verdict === 'equivalent');
  const differs = data.overlap.filter((e) => e.verdict === 'differs');

  return (
    <div data-testid="oxlint-builtin-overlap">
      <p>
        For {new Set(equivalent.map((e) => e.id)).size} of our rules, oxlint{' '}
        {data.oxlintVersion} ships a native rule of the same name (it has{' '}
        {data.builtinRuleCount} built-in rules in all). The behaviour has not
        been compared rule by rule: read both rule docs before you swap one for
        the other.
      </p>
      {groupByPlugin(equivalent).map(([plugin, entries]) => (
        <details key={plugin}>
          <summary>
            <code>{plugin}</code>: {entries.length} rules
          </summary>
          <ul>
            {entries.map((e) => (
              <li key={`${e.id}:${e.builtin}`}>
                {ruleLink(e)} · native: <code>{e.builtin}</code>
              </li>
            ))}
          </ul>
        </details>
      ))}
      {differs.length > 0 ? (
        <>
          <p>Similar native rule, different behaviour:</p>
          <ul data-testid="oxlint-builtin-differs">
            {differs.map((e) => (
              <li key={`${e.id}:${e.builtin}`}>
                {ruleLink(e)} · native: <code>{e.builtin}</code>
                {e.note ? <>. {e.note}</> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/**
 * import-next rules without an `equivalent` native rule. A `differs` rule
 * still adds something oxlint lacks, so it stays on this list.
 */
export function ImportNextGaps() {
  const native = new Set(
    loadOxlintOverlap()
      .overlap.filter(
        (e) => e.plugin === 'import-next' && e.verdict === 'equivalent',
      )
      .map((e) => e.rule),
  );
  const gaps = pluginRules('import-next')
    .filter((r) => !native.has(r))
    .toSorted();
  return (
    <>
      <p>
        The {gaps.length} rules oxlint does not ship natively, all available as{' '}
        <code>import-next/&lt;rule&gt;</code> through{' '}
        <code>oxlint-plugin-import-next</code>:
      </p>
      <ul data-testid="import-next-gaps">
        {gaps.map((rule) => (
          <li key={rule}>
            <Link href={`${docsHref('import-next')}/rules/${rule}`}>
              <code>{rule}</code>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
