/**
 * VULNERABLE - the credential inside a serialised object. This is how it is
 * really written: nobody writes a bare secret, they write the whole
 * configuration object that happens to contain one.
 */
const fs = require('fs');
const path = require('path');

function writeDatabaseProfile(dir, profile) {
  fs.writeFileSync(
    path.join(dir, 'db-profile.json'),
    JSON.stringify({ host: profile.host, user: profile.user, password: profile.password }),
  );
}

module.exports = { writeDatabaseProfile };
