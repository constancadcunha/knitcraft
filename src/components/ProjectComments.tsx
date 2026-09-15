"use client";
import { useState } from "react";
import { useAccount, saveRecord } from "@/lib/account";
import { Button } from "@/components/ui/Button";
interface Comment { id: string; text: string; createdAt: string; }
export default function ProjectComments({ projectId }: { projectId: string }) {
  const account = useAccount();
  const [text, setText] = useState("");
  const key = `comments.${projectId}`;
  const comments = (account.records[key] ?? []) as Comment[];
  return <section className="panel p-5 space-y-4"><h2 className="label">Project comments & notes</h2><p className="text-sm text-ink-soft">Keep adjustments, questions, and reminders with this project.</p><ul className="space-y-3">{comments.map(c => <li className="border-b border-ink/20 pb-3" key={c.id}><p className="whitespace-pre-wrap">{c.text}</p><time className="text-xs text-ink-soft">{new Date(c.createdAt).toLocaleString()}</time></li>)}</ul><form onSubmit={e => { e.preventDefault(); if (!text.trim()) return; void saveRecord(key, [...comments, { id: crypto.randomUUID(), text: text.trim(), createdAt: new Date().toISOString() }]).then(() => setText("")).catch(() => {}); }}><label className="label" htmlFor={`note-${projectId}`}>Add a comment</label><textarea id={`note-${projectId}`} className="field mt-2 mb-3" maxLength={4000} value={text} onChange={e => setText(e.target.value)} /><Button disabled={!account.loaded || !text.trim()} type="submit">Save comment</Button></form>{account.error && <p role="alert">{account.error}</p>}</section>;
}
