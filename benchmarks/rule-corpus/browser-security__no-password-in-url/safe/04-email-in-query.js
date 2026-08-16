/**
 * SAFE - An `@` in a QUERY parameter is not userinfo. The authority ended at
 * the first `/`.
 */
const SEARCH = 'https://directory.acme-corp.io/people?q=ada@acme-corp.io';
fetch(SEARCH);
