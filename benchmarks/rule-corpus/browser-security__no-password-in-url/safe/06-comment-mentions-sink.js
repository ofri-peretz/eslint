/**
 * SAFE - The credentialled URL appears only in a comment.
 */
// Never write https://user:password@api.acme-corp.io — use an Authorization header.
fetch('https://api.acme-corp.io/v1/reports');
