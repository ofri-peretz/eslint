/**
 * SAFE - A Zod schema re-exported under a second name. This exact line was
 * reported as CWE-643 at CVSS 9.8 by an earlier build: the declaration name
 * contained `query` and the initialiser name contained `query`, and neither
 * fact says anything about XML. There is no XPath in this file.
 */
import { z } from 'zod';

export const QueryInputSchema = z.object({
  search: z.string().min(1).max(120),
  page: z.coerce.number().int().min(1).default(1),
});

export const QueryValidateSchema = QueryInputSchema;

export type QueryInput = z.infer<typeof QueryInputSchema>;
