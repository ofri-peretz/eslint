/**
 * SAFE (adversarial) - Prisma. `select` is a field-projection key, `query` is
 * the extension hook, and `searchInput` is a validated DTO. Every word on the
 * taint-name list appears; no XML does.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function findMembers(searchInput: string, userQuery: { take: number }) {
  return prisma.member.findMany({
    select: { id: true, login: true },
    where: { login: { contains: searchInput } },
    take: userQuery.take,
  });
}
