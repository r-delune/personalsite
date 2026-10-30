import feed from "../fixtures/showcase.sample.json";
export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const releases = feed.albums
  .filter((a) => a.active !== false)
  .map((a) => ({
    slug: slugify(a.name),
    title: a.name,
    artist: a.artist_name || "Brian Diolún",
    year: a.release_date || "",
    artwork: `/artwork/${slugify(a.name)}.jpg`,
    tracks: a.tracks
      .filter((t) => t.is_published === true && t.r2_url && t.format === "mp3")
      .map((t) => ({
        id: String(t.id),
        title: t.title,
        src: t.r2_url!,
        duration: t.duration_seconds || 0,
        artist: a.artist_name || "Brian Diolún",
        artwork: `/artwork/${slugify(a.name)}.jpg`,
        href: `/music/${slugify(a.name)}`,
      })),
  }))
  .filter((a) => a.tracks.length);
export const tracks = releases.flatMap((a) => a.tracks);
export const mixes = [
  {
    slug: "long-distance-runaround",
    title: "Long Distance Runaround",
    subtitle: "Running tunes",
    duration: "2:25:06",
    year: "2025",
    description: "A long mix for the long way around.",
  },
  {
    slug: "year-24",
    title: "’24",
    subtitle: "Year mixes",
    duration: "1:00:00",
    year: "2025",
    description: "",
  },
  {
    slug: "year-23",
    title: "’23",
    subtitle: "Year mixes",
    duration: "57:36",
    year: "2024",
    description: "",
  },
];
export const time = (s: number) => {
  const n = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};
