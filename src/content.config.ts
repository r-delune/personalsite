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
    headline: z.string(),
    intro: z.array(z.string()),
    contact: z.object({
      email: z.string(),
      linkedin: z.string().url(),
      github: z.string().url().optional(),
      consultancy: z.string().url(),
      pdf: z.string().optional(),
    }),
    roles: z.array(
      z.object({
        id: z.string(),
        years: z.string(),
        title: z.string(),
        organisation: z.string(),
        context: z.string().optional(),
        summary: z.string(),
        highlights: z.array(z.string()).default([]),
        links: z
          .array(z.object({ label: z.string(), href: z.string() }))
          .default([]),
        caseStudies: z.array(z.string()),
        earlier: z.boolean().default(false),
      }),
    ),
    skills: z.array(
      z.object({ group: z.string(), items: z.array(z.string()) }),
    ),
    talks: z
      .array(z.object({ title: z.string(), detail: z.string(), year: z.string() }))
      .default([]),
    publications: z
      .array(
        z.object({
          year: z.string().optional(),
          title: z.string(),
          authors: z.string(),
          venue: z.string(),
          href: z.string().url(),
        }),
      )
      .default([]),
    certifications: z
      .array(z.object({ title: z.string(), issuer: z.string(), year: z.string() }))
      .default([]),
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
