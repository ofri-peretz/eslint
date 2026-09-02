// CWE-1047: vulnerable — a lib/ helper reaching straight out to the network with fetch, so every caller of this utility silently acquires an HTTP dependency
// @author        (not ours — see @source)
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-09-01
// @source        PostHog/context-mill@59ca66799cf4a2856ac5edf3b65f1ee2131a95cf scripts/lib/skill-generator.js:469
// @expected      vulnerable
// This MUST be flagged
async function fetchDocOnce(url) {
    const response = await fetch(url);
    if (!response.ok) {
        const error = new Error(`Failed to fetch ${url}: HTTP ${response.status} ${response.statusText}`);
        // Deterministic client errors (404 etc.) won't change on retry.
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
    }
    const content = await response.text();
    const title = extractTitle(content) || inferDescription(url);
    return { content, title };
}

/**
 * Fetch markdown content from a URL, with an on-disk cache and retries.
 * Returns both content and inferred metadata. Logs `Fetching doc:` only
 * on a real network fetch — cache hits are silent.
 */
