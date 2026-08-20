/**
 * VULNERABLE - ldapts (the promise-based client) with a TypeScript `as string`
 * cast. The cast is a compile-time assertion only; Express still hands over
 * whatever the query string said.
 */
import { Client } from 'ldapts';
import type { Request, Response } from 'express';

const client = new Client({ url: 'ldaps://directory.corp.example.com' });

export async function searchDepartment(req: Request, res: Response): Promise<void> {
  const department = req.query.department as string;
  const { searchEntries } = await client.search('ou=people,dc=corp,dc=example,dc=com', {
    filter: `(&(objectClass=inetOrgPerson)(ou=${department}))`,
    scope: 'sub',
  });
  res.json(searchEntries);
}
