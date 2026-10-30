import { getCollection, getEntry } from "astro:content";
export const isPreview =
  import.meta.env.DEV ||
  import.meta.env.MODE === "preview" ||
  import.meta.env.PREVIEW === "1";
export async function visiblePosts() {
  return (await getCollection("posts"))
    .filter((p) => !p.data.draft && (!p.data.sample || isPreview))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
export async function realPosts() {
  return (await getCollection("posts"))
    .filter((p) => !p.data.draft && !p.data.sample)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
export async function workContent() {
  const cv = await getEntry("cv", "main");
  if (!cv) throw new Error("CV content is missing");
  const projects = (await getCollection("projects")).filter(
    (p) => !p.data.draft,
  );
  const slugs = new Set(projects.map((p) => p.data.slug));
  for (const role of cv.data.roles)
    for (const slug of role.caseStudies)
      if (!slugs.has(slug))
        throw new Error(
          `CV role ${role.id} refers to unavailable project: ${slug}`,
        );
  return { cv: cv.data, projects };
}
export const dateLabel = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
export const readingMinutes = (body = "") =>
  Math.max(1, Math.ceil(body.split(/\s+/).length / 220));
