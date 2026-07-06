#!/usr/bin/env node
/**
 * Optimizes every MP4 in public/videos for scroll-scrubbed playback and
 * produces a VP9/WebM sibling for browsers that support it.
 *
 * Scroll-scrubbing sets `video.currentTime` directly on every scroll tick,
 * which forces the browser to seek to an arbitrary point in the stream. If
 * a clip only has one keyframe (the default for most camera/export
 * pipelines), every seek has to decode forward from that single keyframe —
 * on an 8s 1080p24 clip that's up to ~190 frames of decode per seek, which
 * stutters badly. Keeping keyframes ~12 frames (0.5s) apart bounds that
 * decode work to a handful of frames, which is what makes scrubbing feel
 * instant. Both the MP4 and its WebM sibling need this, since either one
 * may be the format actually played.
 *
 * Idempotent: skips a clip's MP4 re-encode if it's already densely keyed,
 * and skips its WebM if that's newer than the (possibly just re-encoded) MP4.
 */
import { existsSync, statSync, readdirSync, renameSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const videosDir = path.join(__dirname, "..", "public", "videos");

// Force a keyframe at least this often so scrub-seeks stay cheap.
const KEYFRAME_INTERVAL = 12;
// A clip counts as "densely keyed" if its average gap between keyframes
// isn't more than 1.5x the target interval (accounts for scene-cut keyframes
// pushing the average down further, which is fine).
const KEYFRAME_GAP_TOLERANCE = 1.5;

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "inherit"] });
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function needsKeyframeFix(mp4Path) {
  const out = await run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "frame=key_frame",
    "-of", "csv=p=0",
    mp4Path,
  ]);
  const flags = out.split("\n").map((l) => l.trim()).filter(Boolean);
  const totalFrames = flags.length;
  const keyframes = flags.filter((f) => f === "1").length;
  if (totalFrames === 0 || keyframes === 0) return true;

  const averageGap = totalFrames / keyframes;
  return averageGap > KEYFRAME_INTERVAL * KEYFRAME_GAP_TOLERANCE;
}

async function normalizeKeyframes(mp4Path) {
  const tmpPath = `${mp4Path}.tmp.mp4`;
  await run("ffmpeg", [
    "-y",
    "-i", mp4Path,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-g", String(KEYFRAME_INTERVAL),
    "-keyint_min", String(KEYFRAME_INTERVAL),
    "-sc_threshold", "0",
    "-pix_fmt", "yuv420p",
    "-an",
    "-movflags", "+faststart",
    tmpPath,
  ]);
  renameSync(tmpPath, mp4Path);
}

async function convertOne(mp4Path) {
  if (await needsKeyframeFix(mp4Path)) {
    console.log(`fix   ${path.basename(mp4Path)} (sparse keyframes, re-encoding)`);
    await normalizeKeyframes(mp4Path);
  } else {
    console.log(`ok    ${path.basename(mp4Path)} (already densely keyed)`);
  }

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
    "-g", String(KEYFRAME_INTERVAL),
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

  console.log("Done. All clips are densely keyed with WebM (VP9) + MP4 fallback versions.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
