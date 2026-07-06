export {};

declare global {
  interface VideoFrameCallbackMetadata {
    presentationTime: number;
    expectedDisplayTime: number;
    width: number;
    height: number;
    mediaTime: number;
    presentedFrames: number;
  }

  interface HTMLVideoElement {
    requestVideoFrameCallback?: (
      callback: (now: number, metadata: VideoFrameCallbackMetadata) => void,
    ) => number;
    cancelVideoFrameCallback?: (handle: number) => void;
    fastSeek?: (time: number) => void;
  }
}
