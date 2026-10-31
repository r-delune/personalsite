"""Build public waveform/visual-score data from the exact streaming MP3.

Requires local ffmpeg/ffprobe and numpy. Never copies or modifies source audio.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
parser.add_argument("--slug", required=True)
parser.add_argument("--output", type=Path, default=Path("public/data"))
args = parser.parse_args()
if not args.slug or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789-" for c in args.slug):
    parser.error("slug must contain only lowercase letters, digits and hyphens")
sha = hashlib.file_digest(args.source.open("rb"), "sha256").hexdigest()
duration = float(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", str(args.source),
], text=True).strip())
samples = np.frombuffer(subprocess.check_output([
    "ffmpeg", "-v", "error", "-i", str(args.source), "-ac", "1",
    "-ar", "16000", "-f", "f32le", "-",
]), dtype="<f4")

def normalized(values):
    return np.round(values / max(float(np.max(values)), 1e-10), 3).tolist()

# Same 2000-bucket, independently normalised peak/RMS format as the scrubber.
edges = np.linspace(0, len(samples), 2001).astype(int)
peak, rms = [], []
for start, end in zip(edges[:-1], edges[1:]):
    chunk = samples[start:max(start + 1, end)].astype(np.float64)
    peak.append(np.max(np.abs(chunk)))
    rms.append(np.sqrt(np.mean(chunk * chunk)))
peaks = {"version": 2, "duration": duration, "length": 2000,
         "peak": normalized(np.array(peak)), "rms": normalized(np.array(rms)),
         "sourceSha256": sha}

# Four feature frames/second; RMS uses the full frame and the spectral sample
# uses a centred 2048-sample Hann window. No unconfirmed chapter boundaries.
count, hop = math.ceil(duration * 4), 4000
features = {band: np.zeros(count) for band in ["energy", "low", "mid", "high"]}
frequencies = np.fft.rfftfreq(2048, 1 / 16000)
window = np.hanning(2048)
masks = {band: (frequencies >= lo) & (frequencies < hi)
         for band, lo, hi in [("low", 30, 150), ("mid", 150, 2000), ("high", 2000, 7500)]}
for i in range(count):
    chunk = samples[i * hop:(i + 1) * hop].astype(np.float64)
    if not len(chunk):
        continue
    features["energy"][i] = np.sqrt(np.mean(chunk * chunk))
    start = max(0, (len(chunk) - 2048) // 2)
    frame = chunk[start:start + 2048]
    frame = np.pad(frame, (0, 2048 - len(frame)))
    power = np.abs(np.fft.rfft(frame * window)) ** 2
    for band, mask in masks.items():
        features[band][i] = np.sqrt(np.mean(power[mask]))
data = {}
for band, values in features.items():
    db = 20 * np.log10(np.maximum(values, 1e-10))
    lo, hi = np.percentile(db, [2, 99.5])
    data[band] = np.rint(np.clip((db - lo) / max(hi - lo, 1e-6), 0, 1) * 255).astype(int).tolist()
score = {"version": 1, "rateHz": 4, "duration": duration,
         "bands": list(features), "data": data, "boundaries": [], "sourceSha256": sha}
args.output.mkdir(parents=True, exist_ok=True)
base = f"{args.slug}.{sha[:8]}"
for suffix, value in [("peaks", peaks), ("score", score)]:
    (args.output / f"{base}.{suffix}.json").write_text(json.dumps(value, separators=(",", ":")) + "\n")
print(json.dumps({"sourceSha256": sha, "duration": duration, "bytes": args.source.stat().st_size,
                  "peaks": f"/data/{base}.peaks.json", "score": f"/data/{base}.score.json",
                  "streamFilename": f"{base}.mp3"}, indent=2))
