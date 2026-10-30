export const scoreBands = ["energy", "low", "mid", "high"] as const;
export type ScoreBand = (typeof scoreBands)[number];
export interface VisualScore {
  version: 1;
  rateHz: number;
  duration: number;
  bands: readonly ScoreBand[];
  data: Record<ScoreBand, number[]>;
  boundaries: number[];
}
export interface ScoreWindow {
  rateHz: number;
  duration: number;
  startIndex: number;
  endIndex: number; // exclusive; includes the interpolation neighbour
  data: Readonly<Record<ScoreBand, readonly number[]>>;
  boundaries: readonly number[];
}
export function validateScore(value: unknown): VisualScore {
  const s = value as VisualScore;
  if (
    !s ||
    s.version !== 1 ||
    s.rateHz !== 4 ||
    !Number.isFinite(s.duration) ||
    s.duration <= 0 ||
    s.duration > 86400 ||
    !Array.isArray(s.bands) ||
    s.bands.join() !== scoreBands.join() ||
    !s.data ||
    !Array.isArray(s.boundaries)
  )
    throw new Error("Unsupported visual score");
  const length = Math.ceil(s.duration * s.rateHz);
  for (const band of scoreBands) {
    const data = s.data[band];
    if (
      !Array.isArray(data) ||
      Math.abs(data.length - length) > 1 ||
      !data.length ||
      !data.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
    )
      throw new Error("Invalid score samples");
    if (data.length !== s.data.energy.length)
      throw new Error("Misaligned score bands");
  }
  let previous = -1;
  for (const at of s.boundaries) {
    if (!Number.isFinite(at) || at < 0 || at > s.duration || at <= previous)
      throw new Error("Invalid score boundaries");
    previous = at;
  }
  return s;
}
export function sampleScore(
  score: VisualScore,
  band: ScoreBand,
  position: number,
) {
  const data = score.data[band];
  const index = Math.max(
    0,
    Math.min(
      data.length - 1,
      (Number.isFinite(position) ? position : 0) * score.rateHz,
    ),
  );
  const first = Math.floor(index),
    fraction = index - first;
  return (
    (data[first] +
      ((data[first + 1] ?? data[first]) - data[first]) * fraction) /
    255
  );
}
