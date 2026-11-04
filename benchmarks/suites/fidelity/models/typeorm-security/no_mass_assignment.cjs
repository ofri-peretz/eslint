const { tag } = require('../../lib.cjs');
const { TYPEORM, PAYLOADS, writeFile } = require('../../orm.cjs');

const HEAD = `${TYPEORM.Named.head}\nimport { User } from './user.entity';`;
const DS =
  "const dataSource = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL, entities: [User] });";
const REPO = `${DS}\nconst repo = dataSource.getRepository(User);`;
const repo = (write) => ({ head: HEAD, pre: REPO, write });

const RECEIVERS = {
  RepoSave: repo((p) => `await repo.save(${p});`),
  RepoInsert: repo((p) => `await repo.insert(${p});`),
  RepoUpdate: repo((p) => `await repo.update({ id }, ${p});`),
  RepoCreate: repo(
    (p) => `const user = repo.create(${p});\nawait repo.save(user);`,
  ),
  RepoMerge: repo(
    (p) =>
      `const user = await repo.findOneByOrFail({ id } as any);\nrepo.merge(user, ${p});\nawait repo.save(user);`,
  ),
  RepoPreload: repo((p) => `await repo.preload(${p});`),
  RepoUpsert: repo((p) => `await repo.upsert(${p}, ['id']);`),
  ManagerSave: {
    head: HEAD,
    pre: DS,
    write: (p) => `await dataSource.manager.save(User, ${p});`,
  },
  ManagerTxn: {
    head: HEAD,
    pre: DS,
    write: (p) =>
      `await dataSource.transaction(async (manager) => {\n  await manager.save(User, ${p});\n});`,
  },
  NestRepo: {
    head: [
      "import { Injectable } from '@nestjs/common';",
      "import { InjectRepository } from '@nestjs/typeorm';",
      "import { Repository } from 'typeorm';",
      "import { User } from './user.entity';",
    ].join('\n'),
    cls: '@Injectable()\nexport class UsersService {\n  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}',
    write: (p) => `await this.users.save(${p});`,
  },
  Bracket: repo((p) => `await repo['save'](${p});`),
  QbInsert: {
    head: HEAD,
    pre: DS,
    write: (p) =>
      `await dataSource.createQueryBuilder().insert().into(User).values(${p}).execute();`,
  },
  QbUpdate: {
    head: HEAD,
    pre: DS,
    write: (p) =>
      `await dataSource.createQueryBuilder().update(User).set(${p}).where('id = :id', { id }).execute();`,
  },
  ActiveRecord: {
    head: "import { BaseEntity, Entity, PrimaryGeneratedColumn } from 'typeorm';",
    pre: '@Entity()\nclass User extends BaseEntity {\n  @PrimaryGeneratedColumn() id!: number;\n}',
    write: (p) => `await User.insert(${p});`,
  },
  NoImport: {
    head: 'declare const repo: any;',
    write: (p) => `await repo.save(${p});`,
  },
  Untraced: {
    // a path alias is not resolved, so the receiver is untraceable
    head: `${TYPEORM.Named.head}\nimport { cache } from '@/lib/cache';`,
    write: (p) => `await cache.save(${p});`,
  },
  InTest: repo((p) => `await repo.save(${p});`),
};

module.exports = {
  rule: 'no-mass-assignment',
  domain: 17 * 18,
  traces: 2600,
  key: (s) => `${tag(s.receiver)}|${tag(s.payload)}`,
  filename: (s) =>
    tag(s.receiver) === 'InTest' ? 'src/users.test.ts' : 'src/users.ts',
  code: (s) => writeFile(RECEIVERS[tag(s.receiver)], PAYLOADS[tag(s.payload)]),
};
