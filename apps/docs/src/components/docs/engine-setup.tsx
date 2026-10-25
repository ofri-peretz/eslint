/**
 * EngineSetup — the oxlint-first install + config block for a plugin page
 * (`<EngineSetup plugin="jwt-security" />` in its index.mdx) or a rule page
 * (injected by the docs route from the slug). Everything in it derives from
 * the plugin slug and the synced rules manifest; nothing is hand-written.
 */
import { EngineTabs } from '@/components/docs/engine-tabs';
import { recommendedRules } from '@/lib/oxlint';

export function EngineSetup({
  plugin,
  rule,
}: {
  plugin: string;
  rule?: string;
}) {
  if (rule)
    return (
      <EngineTabs plugin={plugin} rules={{ [`${plugin}/${rule}`]: 'error' }} />
    );
  return <EngineTabs plugin={plugin} rules={recommendedRules(plugin)} preset />;
}
