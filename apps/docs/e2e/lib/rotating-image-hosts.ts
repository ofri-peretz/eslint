/**
 * Which broken images may wedge a deploy, and which may not.
 *
 * `sync-tweet-cache.ts` already settled this question for the sync step: an
 * unreachable card image on an already-cached tweet is ADVISORY, because
 * Twitter rotates and deletes `pbs.twimg.com/card_img/...` faster than our
 * 7-day TTL, and re-running the build cannot bring the URL back. Failing on it
 * wedges every deploy behind an upstream 404 nobody can fix — the 2026-07-04
 * regression on tweet 2006790779537121585, pinned by `shouldFailSync`.
 *
 * The deploy smoke test asserted every rendered image returns 2xx, which
 * re-introduced that exact wedge one layer down: on 2026-09-13 a single 404 on
 * a rotated card image failed `Pre-deploy smoke` and blocked production, while
 * the sync step that owns the same URL had deliberately let it pass.
 *
 * So the two agree now. A first-party image 404 is still fatal — that is a
 * broken build we control and can fix. A rotating third-party card image is
 * reported and does not block.
 */

/**
 * Hosts that serve preview images we cache but do not control, and which
 * rotate their URLs. Deliberately narrow: this is an exemption from a
 * correctness gate, so it lists the hosts whose rotation is documented rather
 * than every third-party host.
 */
export const ROTATING_IMAGE_HOSTS: readonly string[] = [
  'pbs.twimg.com', // tweet card images — see sync-tweet-cache.ts
];

/**
 * True when a broken image URL is an upstream rotation we cannot fix by
 * rebuilding, and therefore must not block a deploy.
 */
export function isRotatingThirdPartyImage(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    // Not a parseable absolute URL — treat as ours, i.e. still fatal. An
    // exemption that swallows malformed input is an exemption that hides bugs.
    return false;
  }
  return ROTATING_IMAGE_HOSTS.includes(host);
}
