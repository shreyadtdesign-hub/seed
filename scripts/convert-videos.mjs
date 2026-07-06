#!/usr/bin/env node
/**
 * Converts every MP4 in public/videos to a VP9/WebM sibling for browsers
 * that support it, keeping the original MP4 as a fallback. Idempotent:
 * skips clips whose .webm is newer than the source .mp4.
 */
import { existsSync, statSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const videosDir = path.join(__dirname, "..", "public", "videos");

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function convertOne(mp4Path) {
  const webmPath = mp4Path.replace(/\.mp4$/i, ".webm");

  if (existsSync(webmPath) && statSync(webmPath).mtimeMs >= statSync(mp4Path).mtimeMs) {
    console.log(`skip  ${path.basename(webmPath)} (up to date)`);
    return;
  }

  console.log(`encode ${path.basename(mp4Path)} -> ${path.basename(webmPath)}`);
  await run("ffmpeg", [
    "-y",
    "-i", mp4Path,
    "-c:v", "libvpx-vp9",
    "-b:v", "0",
    "-crf", "32",
    "-row-mt", "1",
    "-pix_fmt", "yuv420p",
    "-an",
    "-deadline", "good",
    "-cpu-used", "2",
    webmPath,
  ]);
}

async function main() {
  if (!existsSync(videosDir)) {
    console.error(`No videos directory at ${videosDir}`);
    process.exit(1);
  }

  const mp4s = readdirSync(videosDir)
    .filter((f) => f.toLowerCase().endsWith(".mp4"))
    .sort()
    .map((f) => path.join(videosDir, f));

  if (mp4s.length === 0) {
    console.log("No MP4 files found, nothing to convert.");
    return;
  }

  for (const mp4 of mp4s) {
    await convertOne(mp4);
  }

  console.log("Done. All clips have WebM (VP9) + MP4 fallback versions.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
