/**
 * VULNERABLE - FTP authenticates in the clear by design; the password crosses
 * the network on every connection.
 */
export const DROP_TARGET = 'ftp://files.acme-corp.io/incoming';
