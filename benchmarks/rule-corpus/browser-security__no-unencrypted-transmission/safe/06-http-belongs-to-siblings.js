/**
 * SAFE FOR THIS RULE - `http://` left this rule's defaults. Three siblings say
 * more about it: the URL itself, compliance tags, an `allowedHosts` escape
 * hatch. This rule only ever said "using insecure protocol http://".
 */
export const env = { apiBase: 'http://api.acme-corp.io/v1' };
