/**
 * SAFE - CDN URLs used as data, not as resource tags. A `fetch` response is
 * parsed by this code, an image is not executable, and a URL in a config
 * object loads nothing on its own. SRI applies to `<script>` and `<link>`,
 * which is precisely why none of these needs it.
 */
const CDN_BASE = 'https://cdn.jsdelivr.net/npm';

export async function fetchIconManifest() {
  const response = await fetch(`${CDN_BASE}/lucide-static@0.300.0/icons.json`);
  return response.json();
}

export const config = {
  avatarHost: 'https://cdn.example.com/avatars',
  fallbackImage: '<img src="https://cdn.jsdelivr.net/npm/@acme/brand/logo.png" alt="logo">',
};
