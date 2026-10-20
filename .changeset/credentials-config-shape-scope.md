---
'@interlace/eslint-devkit': patch
'eslint-plugin-typeorm-security': patch
'eslint-plugin-knex-security': patch
'eslint-plugin-sequelize-security': patch
---

fix(eslint-devkit): config-shape ownership covers the config, not the whole file

A file with no driver import is owned by a credentials rule only through one of
the driver's config-file shapes (`{ type: 'mysql', entities }`). That ownership
now covers the shape's own object and what nests in it. An app config holding a
TypeORM block beside `bullRedis: { host, port, password }` reported the Redis
password as a database credential.
