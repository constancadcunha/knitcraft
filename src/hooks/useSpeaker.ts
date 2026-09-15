"use client";

import { useCallback, useRef } from "react";
import { useSupported } from "@/hooks/useSupported";

/**
 * Text-to-speech, with the two quirks that actually bite in practice:
 *
 *  1. `getVoices()` is empty on first call in Chrome until `voiceschanged`
 *     fires, so we resolve the voice lazily rather than caching it at mount.
 *  2. iOS Safari will not speak until `speak()` has been called once inside a
 *     real user gesture. `unlock()` exists to be called from a click handler.
 */
export function useSpeaker() {
  const supported = useSupported(
    () => typeof window !== "undefined" && "speechSynthesis" in window
  );
  const unlockedRef = useRef(false);
  const lastRef = useRef("");

  const pickVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const lang = navigator.language || "en-US";
    return (
      voices.find((v) => v.lang === lang && v.localService) ??
      voices.find((v) => v.lang === lang) ??
      voices.find((v) => v.lang.startsWith(lang.slice(0, 2))) ??
      voices[0]
    );
  }, []);

  const speak = useCallback(
    (text: string, { interrupt = true }: { interrupt?: boolean } = {}) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      if (!text.trim()) return;

      lastRef.current = text;
      if (interrupt) window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
      utterance.pitch = 1;
      // Counting aloud should be quieter than an announcement.
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    },
    [pickVoice]
  );

  /** Call once from a user gesture so iOS permits later programmatic speech. */
  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const silent = new SpeechSynthesisUtterance("");
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
    unlockedRef.current = true;
  }, []);

  const repeat = useCallback(() => {
    if (lastRef.current) speak(lastRef.current);
  }, [speak]);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { supported, speak, repeat, stop, unlock };
}
