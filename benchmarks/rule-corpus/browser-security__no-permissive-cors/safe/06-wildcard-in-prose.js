/** SAFE - the header name and the wildcard appear only in an audit table.
 *
 *  Never set Access-Control-Allow-Origin to '*' on an authenticated route.
 */
export const CORS_POLICY_DOCS = [
  { header: 'Access-Control-Allow-Origin', rule: 'named origins only, never *' },
];
