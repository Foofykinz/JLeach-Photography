import { defineCollection, z } from 'astro:content';

const photos = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().optional(),
    caption: z.string().optional(),
    image: z.string(),
    category: z.enum(['portraits', 'landscape', 'storms', 'animals', 'vehicles']),
    featured: z.boolean().default(false),
    order: z.number().default(0),
  }),
});

const about = defineCollection({
  type: 'content',
  schema: z.object({
    headshot: z.string().optional(),
  }),
});

export const collections = { photos, about };
