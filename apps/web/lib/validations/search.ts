import { z } from 'zod';

export const searchCardsSchema = z.object({
  q: z
    .string()
    .min(1, 'Search query must be at least 1 character')
    .max(80)
    .optional(),
  rarity: z.string().optional(),
  set: z.string().optional(),
  sort: z
    .enum(['relevance', 'name_asc', 'name_desc', 'year_desc'])
    .default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(40).default(20),
});

export type SearchCardsParams = z.infer<typeof searchCardsSchema>;

export const autocompleteSchema = z.object({
  q: z.string().min(1).max(80),
  limit: z.coerce.number().int().min(1).max(8).default(8),
});

export type AutocompleteParams = z.infer<typeof autocompleteSchema>;
