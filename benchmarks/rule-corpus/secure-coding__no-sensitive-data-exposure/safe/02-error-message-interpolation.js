/**
 * SAFE - Shopify CLI bin/github-utils.js:14. The word "password" describes what
 * the failed operation was fetching; the interpolated value is an error
 * message. A label sits against its separator - a sentence that happens to
 * contain a colon further along does not become one.
 */
export async function fetchDeployPassword(client) {
  try {
    return await client.get('/deploy/password');
  } catch (error) {
    console.warn(`Soft-error fetching password from dev: ${error.message}`);
    return null;
  }
}
