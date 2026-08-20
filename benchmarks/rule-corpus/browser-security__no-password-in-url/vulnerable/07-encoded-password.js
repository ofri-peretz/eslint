/**
 * VULNERABLE - Percent-encoding the password does not remove it from the URL;
 * it is still userinfo and still logged verbatim.
 */
const DB_PROXY = 'https://reader:p%40ssw0rd@proxy.acme-corp.io/query';
export default DB_PROXY;
