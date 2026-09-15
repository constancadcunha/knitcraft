import { parseCommand, type VoiceCommand } from "./parseCommand";
/** Counting mode never treats an ambiguous bare number as an absolute position. */
export function countingCommand(transcript: string): VoiceCommand | null {
  const text = transcript.trim();
  // Speech engines often concatenate repeated “one” into “11” or “111”.
  if (/^1{2,8}$/.test(text)) return { kind: "increment", by: text.length };
  const command = parseCommand(text);
  if (command?.kind === "setCount" && !/\b(set|make)\b/i.test(text)) return null;
  return command;
}
