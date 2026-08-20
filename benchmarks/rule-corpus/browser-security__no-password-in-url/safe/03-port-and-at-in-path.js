/**
 * SAFE - The regression that motivated isolating the authority. There is a
 * colon (the port) and an `@` (in the path), and the old pattern read
 * `example.com` as the user and `8080/threads/a` as the password.
 */
const THREAD = 'https://forum.acme-corp.io:8080/threads/reply@2024';
open(THREAD);
