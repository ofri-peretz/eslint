/**
 * SAFE - ldapts' structured filter objects. No filter STRING is ever built, so
 * the value cannot break out of a grammar it never enters. This is the LDAP
 * equivalent of a parameterized SQL query and is the remediation the rule's own
 * message asks for.
 */
import { Client, EqualityFilter, AndFilter } from 'ldapts';
import type { Request, Response } from 'express';

const client = new Client({ url: 'ldaps://directory.corp.example.com' });

export async function searchDepartment(req: Request, res: Response): Promise<void> {
  const department = req.query.department as string;
  const { searchEntries } = await client.search('ou=people,dc=corp,dc=example,dc=com', {
    filter: new AndFilter({
      filters: [
        new EqualityFilter({ attribute: 'objectClass', value: 'inetOrgPerson' }),
        new EqualityFilter({ attribute: 'ou', value: department }),
      ],
    }),
    scope: 'sub',
  });
  res.json(searchEntries);
}
