/**
 * VULNERABLE - Active mixed content. A blocked script is not a degraded image:
 * the feature it powers is simply gone, and if it is NOT blocked it can rewrite
 * the whole document.
 */
export function AnalyticsTag() {
  return <script src="http://metrics.acme-corp.io/track.js" async />;
}
