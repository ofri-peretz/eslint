/**
 * VULNERABLE - A Nest-style directory service. The sink sits on `this.client`,
 * a class property, and the tainted value arrives as a method parameter.
 */
import { Injectable } from '@nestjs/common';
import { Client } from 'ldapts';

@Injectable()
export class DirectoryService {
  private readonly client = new Client({ url: 'ldaps://directory.corp.example.com' });

  async authenticate(username: string, password: string): Promise<boolean> {
    const { searchEntries } = await this.client.search('dc=corp,dc=example,dc=com', {
      filter: `(&(objectClass=user)(sAMAccountName=${username}))`,
      scope: 'sub',
    });
    if (searchEntries.length !== 1) return false;
    await this.client.bind(String(searchEntries[0].dn), password);
    return true;
  }
}
