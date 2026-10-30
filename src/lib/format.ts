export function time(seconds: number) {
  const value = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(value / 60),
    sec = String(value % 60).padStart(2, "0");
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${sec}`
    : `${minutes}:${sec}`;
}
export function parseTime(input: string | null): number | null {
  if (!input) return null;
  if (/^\d+$/.test(input)) {
    const n = Number(input);
    return Number.isSafeInteger(n) ? n : null;
  }
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(input);
  if (!match || !match.slice(1).some(Boolean)) return null;
  const n =
    Number(match[1] || 0) * 3600 +
    Number(match[2] || 0) * 60 +
    Number(match[3] || 0);
  return Number.isSafeInteger(n) ? n : null;
}
