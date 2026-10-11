import { z } from 'zod';

export const PathSchema = z.string().min(1);
export const Schemas = { path: z.string(), mode: z.enum(['r', 'w']) };
export const Labels = { path: 'Path' };
