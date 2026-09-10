"use client";

import { useCallback, useMemo, useState } from "react";
import { useVoiceCounter } from "@/hooks/useVoiceCounter";
import { useSpeaker } from "@/hooks/useSpeaker";
import { useWakeLock } from "@/hooks/useWakeLock";
import type { VoiceCommand } from "@/lib/voice/parseCommand";
import { Button } from "@/components/ui/Button";
import { Meter, Tag } from "@/components/ui/Bits";
import { cn } from "@/lib/cn";

export interface VoiceCounterProps {
  rowNumber: number;
  totalRows: number;
  stitchesDone: number;
  stitchesInRow: number;
  /** The written instruction for the current row, read aloud on request. */
  instruction?: string;
  onIncrement: (by: number) => void;
  onDecrement: (by: number) => void;
  onNextRow: () => void;
  onPrevRow: () => void;
  onGotoRow: (row: number) => void;
  onSetCount: (count: number) => void;
  onResetRow: () => void;
  onUndo: () => void;
  className?: string;
}

const COMMANDS: Array<[string, string]> = [
  ["“one” / “next”", "count one stitch"],
  ["“plus five”", "count five"],
  ["“twenty four”", "set the count"],
  ["“next row”", "advance a row"],
  ["“row twelve”", "jump to a row"],
  ["“back one” / “undo”", "fix a miscount"],
  ["“where am I”", "hear your place"],
  ["“what’s next”", "hear the instruction"],
  ["“pause”", "stop listening"],
];

/**
 * Hands-free stitch counting.
 *
 * The interaction is built around the fact that a knitter's hands are busy and
 * their eyes are on the work: speech goes in, speech comes back out, and every
 * voice action has a large tap target beside it for when recognition fails or
 * the room is loud. Nothing is voice-only.
 */
export default function VoiceCounter({
  rowNumber,
  totalRows,
  stitchesDone,
  stitchesInRow,
  instruction,
  onIncrement,
  onDecrement,
  onNextRow,
  onPrevRow,
  onGotoRow,
  onSetCount,
  onResetRow,
  onUndo,
  className,
}: VoiceCounterProps) {
  const speaker = useSpeaker();
  const [spoken, setSpoken] = useState(true);
  const [lastHeard, setLastHeard] = useState<string | null>(null);

  const say = useCallback(
    (text: string) => {
      if (spoken) speaker.speak(text);
    },
    [spoken, speaker]
  );

  const handleCommand = useCallback(
    (command: VoiceCommand) => {
      setLastHeard(describe(command));

      switch (command.kind) {
        case "increment": {
          onIncrement(command.by);
          const next = stitchesDone + command.by;
          // Only speak on milestones — announcing every stitch is unbearable.
          if (next >= stitchesInRow) say(`Row ${rowNumber} complete.`);
          else if (next % 10 === 0) say(String(next));
          break;
        }
        case "decrement":
          onDecrement(command.by);
          break;
        case "setCount":
          onSetCount(command.count);
          say(`${command.count}.`);
          break;
        case "nextRow":
          onNextRow();
          say(`Row ${Math.min(rowNumber + 1, totalRows)}.`);
          break;
        case "prevRow":
          onPrevRow();
          say(`Row ${Math.max(1, rowNumber - 1)}.`);
          break;
        case "gotoRow":
          onGotoRow(command.row);
          say(`Row ${command.row}.`);
          break;
        case "markRow":
          onNextRow();
          break;
        case "resetRow":
          onResetRow();
          say("Count reset.");
          break;
        case "undo":
          onUndo();
          say("Undone.");
          break;
        case "status":
          say(
            `Row ${rowNumber} of ${totalRows}. ${stitchesDone} of ${stitchesInRow} stitches, ${Math.max(
              0,
              stitchesInRow - stitchesDone
            )} to go.`
          );
          break;
        case "readNext":
          say(instruction ? instruction : `Row ${rowNumber}.`);
          break;
        case "repeat":
          speaker.repeat();
          break;
        case "pause":
          // useVoiceCounter stops the recogniser itself; just acknowledge.
          say("Stopped listening.");
          break;
      }
    },
    [
      onIncrement, onDecrement, onNextRow, onPrevRow, onGotoRow, onSetCount,
      onResetRow, onUndo, say, speaker,
      rowNumber, totalRows, stitchesDone, stitchesInRow, instruction,
    ]
  );

  const voice = useVoiceCounter({ onCommand: handleCommand });

  // Keep the screen awake only while actually listening.
  useWakeLock(voice.listening);

  const statusLabel = useMemo(() => {
    switch (voice.status) {
      case "unsupported":
        return "Not supported in this browser";
      case "denied":
        return "Microphone blocked";
      case "error":
        return "Microphone unavailable";
      case "starting":
        return "Starting…";
      case "listening":
        return "Listening";
      default:
        return "Off";
    }
  }, [voice.status]);

  const toggle = useCallback(() => {
    // iOS will not speak later unless speech is unlocked inside a gesture.
    speaker.unlock();
    voice.toggle();
  }, [speaker, voice]);

  return (
    <section className={cn("panel", className)} aria-label="Voice counter">
      <header className="flex items-center justify-between gap-3 border-b-[3px] border-ink bg-grape px-4 py-2.5">
        <h2 className="label text-panel">Count out loud</h2>
        <Tag tone={voice.listening ? "fern" : "neutral"}>
          <span
            className={cn(
              "inline-block h-2 w-2 border-2 border-ink",
              voice.listening ? "bg-fern sprite-dot" : "bg-ink-faint"
            )}
            aria-hidden
          />
          {statusLabel}
        </Tag>
      </header>

      <div className="space-y-4 p-4">
        {voice.status === "unsupported" ? (
          <p className="text-sm text-ink-soft">
            Speech recognition needs Chrome, Edge or Safari. Everything here
            still works with the buttons below.
          </p>
        ) : voice.status === "denied" ? (
          <p className="text-sm text-ink-soft">
            Microphone access was blocked. Allow it in your browser’s site
            settings, then press Start again.
          </p>
        ) : null}

        <Meter
          value={stitchesDone}
          max={stitchesInRow}
          tone="fern"
          label={`Row ${rowNumber} of ${totalRows}`}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={voice.listening ? "danger" : "primary"}
            onClick={toggle}
            disabled={voice.status === "unsupported"}
          >
            {voice.listening ? "Stop listening" : "Start listening"}
          </Button>
          <Button variant="secondary" onClick={() => setSpoken((s) => !s)}>
            {spoken ? "Mute replies" : "Speak replies"}
          </Button>
        </div>

        {/* Manual equivalents: voice is an option, never the only way. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button variant="gold" onClick={() => onIncrement(1)}>+1 stitch</Button>
          <Button variant="quiet" onClick={() => onDecrement(1)}>−1</Button>
          <Button variant="quiet" onClick={onUndo}>Undo</Button>
          <Button variant="secondary" onClick={onNextRow}>Next row</Button>
        </div>

        <p aria-live="polite" className="text-tiny text-ink-soft">
          {voice.transcript
            ? `Heard “${voice.transcript}”${lastHeard ? ` — ${lastHeard}` : ""}`
            : voice.listening
              ? "Say “one” for each stitch."
              : " "}
        </p>

        <details className="border-t-[3px] border-ink pt-3">
          <summary className="label cursor-pointer text-ink-soft">
            What you can say
          </summary>
          <dl className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {COMMANDS.map(([phrase, meaning]) => (
              <div key={phrase} className="flex items-baseline justify-between gap-2">
                <dt className="text-sm text-ink">{phrase}</dt>
                <dd className="text-tiny text-ink-faint">{meaning}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </section>
  );
}

function describe(command: VoiceCommand): string {
  switch (command.kind) {
    case "increment": return `+${command.by}`;
    case "decrement": return `−${command.by}`;
    case "setCount": return `set to ${command.count}`;
    case "gotoRow": return `row ${command.row}`;
    case "nextRow": return "next row";
    case "prevRow": return "previous row";
    case "markRow": return "row marked";
    case "resetRow": return "reset";
    case "undo": return "undo";
    case "status": return "status";
    case "readNext": return "read instruction";
    case "repeat": return "repeat";
    case "pause": return "paused";
  }
}
