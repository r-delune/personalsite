/** @typedef {{at: number, artist: string, title: string, label?: string}} Chapter */
/** Validate authored chapters without sorting or promoting detected boundaries.
 * @param {Chapter[]} chapters @param {number} duration
 */
export function validateTracklist(chapters, duration) {
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error("Tracklist requires a positive duration");
  if (!Array.isArray(chapters)) throw new Error("Tracklist must be an array");
  let previous = -1;
  return chapters
    .filter(
      (chapter) =>
        !/TODO/i.test(
          `${chapter.artist} ${chapter.title} ${chapter.label || ""}`,
        ),
    )
    .map((chapter) => {
      if (
        !Number.isFinite(chapter.at) ||
        chapter.at < 0 ||
        chapter.at >= duration ||
        chapter.at <= previous
      )
        throw new Error(
          "Tracklist times must ascend, be unique and fall below the duration",
        );
      if (
        typeof chapter.artist !== "string" ||
        !chapter.artist.trim() ||
        typeof chapter.title !== "string" ||
        !chapter.title.trim()
      )
        throw new Error("Tracklist entries need artist and title");
      previous = chapter.at;
      return {
        at: chapter.at,
        artist: chapter.artist.trim(),
        title: chapter.title.trim(),
        ...(chapter.label ? { label: chapter.label.trim() } : {}),
      };
    });
}
/** @param {string} text @param {number} duration */
export function parseTracklist(text, duration) {
  /** @type {Chapter[]} */ const chapters = [];
  /** @type {number[]} */ const droppedLines = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    if (/TODO/i.test(line)) {
      droppedLines.push(index + 1);
      return;
    }
    const match =
      /^(\d+:\d{2}(?::\d{2})?)\s+(.+?)\s+[-–—]\s+(.+?)(?:\s+\[([^\]]+)\])?$/.exec(
        line,
      );
    if (!match) throw new Error(`Invalid tracklist line ${index + 1}`);
    const parts = match[1].split(":").map(Number);
    if (parts.slice(1).some((n) => n >= 60))
      throw new Error(`Invalid timestamp on line ${index + 1}`);
    const at = parts.reduce((sum, part) => sum * 60 + part, 0);
    chapters.push({
      at,
      artist: match[2],
      title: match[3],
      ...(match[4] ? { label: match[4] } : {}),
    });
  });
  return { chapters: validateTracklist(chapters, duration), droppedLines };
}
/** @param {readonly Chapter[]} chapters @param {number} position */
export function chapterAt(chapters, position) {
  let current = null;
  for (const chapter of chapters) {
    if (chapter.at > position) break;
    current = chapter;
  }
  return current;
}
