import type { APIRoute, GetStaticPaths } from "astro";
import { realPosts } from "../lib/content";
export const getStaticPaths: GetStaticPaths = async () =>
  (await realPosts()).length ? [{ params: { feed: "rss" } }] : [];
const escape = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export const GET: APIRoute = async () => {
  const posts = await realPosts();
  const base = import.meta.env.PUBLIC_SITE_URL;
  if (!base)
    throw new Error("PUBLIC_SITE_URL is required to publish an RSS feed");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Brían Diolún</title><link>${escape(base)}</link><description>Writing</description>${posts.map((post) => `<item><title>${escape(post.data.title)}</title><link>${escape(new URL("/writing/" + post.data.slug, base).href)}</link><guid>${escape(new URL("/writing/" + post.data.slug, base).href)}</guid><pubDate>${post.data.date.toUTCString()}</pubDate><description>${escape(post.data.description)}</description></item>`).join("")}</channel></rss>`,
    { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } },
  );
};
