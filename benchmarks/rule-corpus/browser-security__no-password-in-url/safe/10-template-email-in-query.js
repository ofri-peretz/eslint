/**
 * SAFE - A template whose `@` is in the query string.
 */
const email = getEmail();
fetch(`https://directory.acme-corp.io/people?q=${email}`);
