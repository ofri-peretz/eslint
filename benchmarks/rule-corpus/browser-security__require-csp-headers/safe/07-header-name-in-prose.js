/** SAFE - the header name appears only in an audit table and a comment.
 *  Nothing here emits a document.
 *
 *  Content-Security-Policy is applied at the CDN edge for this service.
 */
export const CHECKS = [
  { header: 'Content-Security-Policy', owner: 'platform' },
  { header: 'X-Frame-Options', owner: 'platform' },
];
