"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { boostedMicrophone, canBoostMicrophone } from "@/lib/voice/microphone";
import { useSupported } from "@/hooks/useSupported";
import { countingCommand } from "@/lib/voice/countingCommand";
import { type VoiceCommand } from "@/lib/voice/parseCommand";
import {
  getSpeechRecognition,
  type SpeechRecognitionErrorEvent,
  type SpeechRecognitionEvent,
  type SpeechRecognitionLike,
} from "@/lib/voice/speechTypes";

export type VoiceStatus =
  | "unsupported"
  | "idle"
  | "starting"
  | "listening"
  | "denied"
  | "error";

interface Options {
  /** Called for every recognised command. */
  onCommand: (command: VoiceCommand) => void;
  lang?: string;
}

/**
 * Hands-free speech input for stitch counting.
 *
 * The awkward realities this works around:
 *  - `continuous: true` still ends the session on its own (silence timeouts,
 *    network hiccups). We restart from `onend` whenever the user still wants
 *    to listen, which is the only way to get a genuinely continuous mic.
 *  - Restarting too eagerly after a hard failure spins the CPU, so `no-speech`
 *    and `aborted` restart immediately while other errors back off.
 *  - `start()` throws `InvalidStateError` if called while already started, so
 *    every start is guarded by a running flag.
 *  - The whole thing requires a secure context (https, or localhost).
 */
export function useVoiceCounter({ onCommand, lang }: Options) {
  const boostSupported = useSupported(canBoostMicrophone);
  const [micLevel, setMicLevel] = useState(2);
  const micRef = useRef<Awaited<ReturnType<typeof boostedMicrophone>> | null>(null);
  const recognitionSupported = useSupported(() => getSpeechRecognition() !== null);
  const [rawStatus, setStatus] = useState<VoiceStatus>("idle");
  const status: VoiceStatus = recognitionSupported ? rawStatus : "unsupported";
  const [transcript, setTranscript] = useState("");
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wantListeningRef = useRef(false);
  const runningRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the callback in a ref so re-renders never tear down the recogniser.
  const onCommandRef = useRef(onCommand);
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => { micRef.current?.setLevel(micLevel); }, [micLevel]);

  const buildRecognition = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return null;

    const recognition = new Ctor();
    recognition.lang = lang ?? "en-US";
    recognition.continuous = true;
    // Interim results make short words like "one" register fast enough to
    // keep up with someone actually knitting.
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      runningRef.current = true;
      setStatus("listening");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (window.speechSynthesis?.speaking) return;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result.isFinal) continue;

        // Try every alternative — recognisers often rank a homophone first
        // ("won"/"one", "for"/"four"), and any alternative that parses is
        // better than dropping the utterance.
        let command: VoiceCommand | null = null;
        let heard = "";
        for (let a = 0; a < result.length; a += 1) {
          const text = result[a].transcript;
          const parsed = countingCommand(text);
          if (a === 0) heard = text;
          if (parsed) {
            command = parsed;
            heard = text;
            break;
          }
        }

        setTranscript(heard.trim());
        if (command) {
          setLastCommand(command);
          // "pause" is about the recogniser itself, so handle it here rather
          // than making every consumer reach back into this hook to stop it.
          if (command.kind === "pause") {
            wantListeningRef.current = false;
            micRef.current?.close(); micRef.current = null;
            try {
              recognition.stop();
            } catch {
              // Not running.
            }
          }
          onCommandRef.current(command);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        wantListeningRef.current = false;
        runningRef.current = false;
        micRef.current?.close(); micRef.current = null;
        setStatus("denied");
        return;
      }
      // "no-speech" and "aborted" are routine during a quiet stretch.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setStatus("error");
      }
    };

    recognition.onend = () => {
      runningRef.current = false;
      if (!wantListeningRef.current) {
        setStatus("idle");
        return;
      }
      // Chrome ends the session after a silence; restart to stay continuous.
      setStatus("starting");
      restartTimerRef.current = setTimeout(() => {
        if (!wantListeningRef.current || runningRef.current) return;
        try {
          recognition.start(micRef.current?.track);
        } catch {
          setStatus("error");
        }
      }, 250);
    };

    return recognition;
  }, [lang]);

  const start = useCallback(async () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    if (!window.isSecureContext) {
      // Chrome silently refuses the mic outside a secure context.
      setStatus("error");
      return;
    }

    if (wantListeningRef.current) return;
    wantListeningRef.current = true;
    if (!recognitionRef.current) recognitionRef.current = buildRecognition();
    if (runningRef.current) return;

    setStatus("starting");
    try {
      if (canBoostMicrophone() && !micRef.current) {
        const mic = await boostedMicrophone(micLevel);
        if (!wantListeningRef.current) { mic.close(); return; }
        micRef.current = mic;
      }
      recognitionRef.current?.start(micRef.current?.track);
    } catch (error) {
      wantListeningRef.current = false;
      micRef.current?.close(); micRef.current = null;
      setStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "error");
    }
  }, [buildRecognition, micLevel]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch {
      // Not running.
    }
    micRef.current?.close(); micRef.current = null;
    setStatus((s) => (s === "unsupported" || s === "denied" ? s : "idle"));
  }, []);

  const toggle = useCallback(() => {
    if (wantListeningRef.current) stop();
    else start();
  }, [start, stop]);

  // Tear down on unmount so the mic indicator never outlives the page.
  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try {
        recognitionRef.current?.abort();
      } catch {
        // Already gone.
      }
      recognitionRef.current = null;
      micRef.current?.close(); micRef.current = null;
    };
  }, []);

  const supported = status !== "unsupported";
  const listening = status === "listening" || status === "starting";

  return { boostSupported, micLevel, setMicLevel, status, supported, listening, transcript, lastCommand, start, stop, toggle };
}
