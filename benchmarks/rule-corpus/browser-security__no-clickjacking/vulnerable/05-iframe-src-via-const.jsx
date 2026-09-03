/** VULNERABLE - the framed origin arrives through a constant, which is how a
 *  configurable embed is written. */
const EMBED_ORIGIN = 'https://analytics.thirdparty.example/dashboard';

export function Analytics() {
  return <iframe src={EMBED_ORIGIN} title="Analytics" />;
}
