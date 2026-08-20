/**
 * VULNERABLE - The cookie string built into a binding first.
 */
const cookie = 'campaign=' + campaignId + '; Path=/';
document.cookie = cookie;
