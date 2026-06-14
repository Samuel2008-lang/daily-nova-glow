// Global recording flag — used to suppress interstitial ads while the
// user is actively recording voice. Lightweight pub/sub via window events.

let isRecording = false;

export const recordingState = {
  set(v: boolean) {
    isRecording = v;
    try {
      window.dispatchEvent(new CustomEvent("dn-recording-change", { detail: v }));
    } catch {}
  },
  isActive() {
    return isRecording;
  },
};
