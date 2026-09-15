/** Desktop Chromium exposes recognition.start(audioTrack); other engines use their microphone directly. */
export function canBoostMicrophone(): boolean {
  if (typeof navigator === "undefined" || /Android|iPhone|iPad/i.test(navigator.userAgent)) return false;
  const chromium = navigator.userAgent.match(/Chrom(?:e|ium)\/(\d+)/);
  return !!chromium && Number(chromium[1]) >= 135 && typeof AudioContext !== "undefined";
}
export async function boostedMicrophone(level: number) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const gain = context.createGain();
  gain.gain.value = level;
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.ratio.value = 12;
  const output = context.createMediaStreamDestination();
  source.connect(gain).connect(limiter).connect(output);
  try { await context.resume(); } catch (error) { stream.getTracks().forEach(t => t.stop()); await context.close(); throw error; }
  return {
    track: output.stream.getAudioTracks()[0],
    setLevel(next: number) { gain.gain.value = Math.max(1, Math.min(5, next)); },
    close() { stream.getTracks().forEach(t => t.stop()); output.stream.getTracks().forEach(t => t.stop()); void context.close(); },
  };
}
