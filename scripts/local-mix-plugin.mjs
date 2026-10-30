import { createReadStream, readFileSync, statSync } from "node:fs";
import { Transform } from "node:stream";
// Dev-only, loopback media delivery from one explicitly configured file. Never
// copied to public/ or included in a build. No arbitrary path routing.
export function localMixPlugin() {
  return {
    name: "personal-site-local-mix",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/__local-media/ROAM_MIX_2026.mp3")
          return next();
        if (!["GET", "HEAD"].includes(req.method || "")) {
          res.statusCode = 405;
          res.end();
          return;
        }
        let path = process.env.LOCAL_MIX_FILE;
        try {
          path ||= readFileSync(".env.local", "utf8")
            .match(/^LOCAL_MIX_FILE=(.*)$/m)?.[1]
            ?.trim()
            .replace(/^['"]|['"]$/g, "");
        } catch {}
        if (!path) {
          res.statusCode = 404;
          res.end("Local mix not configured");
          return;
        }
        try {
          const { size } = statSync(path);
          const range = req.headers.range;
          let start = 0,
            end = size - 1;
          if (range) {
            const m = /^bytes=(\d+)-(\d*)$/.exec(range);
            if (!m) {
              res.statusCode = 416;
              res.end();
              return;
            }
            start = Number(m[1]);
            end = m[2] ? Math.min(Number(m[2]), size - 1) : end;
            if (start > end || start >= size) {
              res.statusCode = 416;
              res.setHeader("Content-Range", `bytes */${size}`);
              res.end();
              return;
            }
            res.statusCode = 206;
            res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
          }
          const origin = req.headers.origin;
          if (
            origin &&
            /^http:\/\/(?:127\.0\.0\.1|localhost):435[78]$/.test(origin)
          ) {
            res.setHeader("Access-Control-Allow-Origin", origin);
            res.setHeader("Vary", "Origin");
            res.setHeader(
              "Access-Control-Expose-Headers",
              "Content-Length, Content-Range, Accept-Ranges",
            );
          }
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Accept-Ranges", "bytes");
          res.setHeader("Content-Length", end - start + 1);
          res.setHeader("Cache-Control", "no-store");
          if (req.method === "HEAD") {
            res.end();
            return;
          }
          const slow = new URL(req.url, "http://localhost").searchParams.has(
            "slow",
          );
          const stream = createReadStream(path, {
            start,
            end,
            highWaterMark: slow ? 4096 : 65536,
          });
          stream.on("error", () => res.destroy());
          res.on("close", () => stream.destroy());
          if (slow) {
            let sent = 0,
              timer;
            const throttle = new Transform({
              transform(chunk, _encoding, cb) {
                sent += chunk.length;
                if (sent <= 131072) cb(null, chunk);
                else timer = setTimeout(() => cb(null, chunk), 500);
              },
            });
            res.on("close", () => {
              clearTimeout(timer);
              throttle.destroy();
            });
            throttle.on("error", () => res.destroy());
            stream.pipe(throttle).pipe(res);
          } else stream.pipe(res);
        } catch {
          res.statusCode = 404;
          res.end("Local mix unavailable");
        }
      });
    },
  };
}
