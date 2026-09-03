/**
 * SAFE - RFC 2606 reserves these names so nothing treats them as endpoints.
 * `redirectUri: 'http://example.com'` was this rule's single largest
 * false-positive shape across the real-source corpus.
 */
export const docsSample = { redirectUri: 'http://example.com/callback' };
