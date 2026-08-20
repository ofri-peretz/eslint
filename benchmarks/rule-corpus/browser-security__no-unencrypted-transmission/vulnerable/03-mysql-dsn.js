/**
 * VULNERABLE - A MySQL DSN with inline credentials over cleartext.
 */
export const config = {
  dsn: 'mysql://root:hunter2@db.acme-corp.io:3306/analytics',
};
