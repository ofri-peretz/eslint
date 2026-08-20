/**
 * VULNERABLE - The value comes from an array index. The NAME is the evidence.
 */
const tokens = await mintTokens();
document.cookie = 'credential=' + tokens[0] + '; Secure; SameSite=Strict';
