/**
 * Ambient-audio architecture, wired up but silent for now. Playback needs a
 * user gesture to unlock on most browsers, so `unlock()` should be called
 * from the first scroll/click before `play()` has any effect.
 */

export type AudioTrackId = "ambient-forest";

export class AudioManager {
  private context: AudioContext | null = null;
  private tracks = new Map<AudioTrackId, HTMLAudioElement>();
  private unlocked = false;
  private muted = true;

  register(id: AudioTrackId, src: string) {
    if (this.tracks.has(id)) return;
    const el = new Audio(src);
    el.loop = true;
    el.preload = "none";
    el.volume = 0;
    this.tracks.set(id, el);
  }

  /** Call once, from a user gesture (first scroll/click), to unlock autoplay. */
  unlock() {
    if (this.unlocked || typeof window === "undefined") return;
    const AudioContextCtor = window.AudioContext;
    if (AudioContextCtor) this.context = new AudioContextCtor();
    this.unlocked = true;
  }

  play(id: AudioTrackId) {
    if (this.muted) return;
    this.tracks.get(id)?.play().catch(() => {});
  }

  stop(id: AudioTrackId) {
    const el = this.tracks.get(id);
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }

  setVolume(id: AudioTrackId, level: number) {
    const el = this.tracks.get(id);
    if (el) el.volume = Math.min(1, Math.max(0, level));
  }

  mute() {
    this.muted = true;
    this.tracks.forEach((el) => el.pause());
  }

  unmute() {
    this.muted = false;
  }

  dispose() {
    this.tracks.forEach((el) => {
      el.pause();
      el.src = "";
    });
    this.tracks.clear();
    this.context?.close();
    this.context = null;
  }
}
