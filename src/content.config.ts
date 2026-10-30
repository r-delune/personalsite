import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
const posts = defineCollection({
  loader: glob({ base: "./src/content/posts", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    slug: z.string(),
    draft: z.boolean().default(false),
    sample: z.boolean().default(false),
  }),
});
const projects = defineCollection({
  loader: glob({ base: "./src/content/projects", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    year: z.string(),
    role: z.string(),
    summary: z.string(),
    draft: z.boolean().default(false),
  }),
});
const cv = defineCollection({
  loader: file("src/content/cv.json", {
    parser: (text) => [{ id: "main", ...JSON.parse(text) }],
  }),
  schema: z.object({
    roles: z.array(
      z.object({
        id: z.string(),
        years: z.string(),
        title: z.string(),
        organisation: z.string(),
        summary: z.string(),
        caseStudies: z.array(z.string()),
      }),
    ),
    skills: z.array(
      z.object({ group: z.string(), items: z.array(z.string()) }),
    ),
    education: z.array(
      z.object({
        years: z.string(),
        title: z.string(),
        institution: z.string(),
      }),
    ),
  }),
});
export const collections = { posts, projects, cv };
