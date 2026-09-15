"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useAccount, updateProfile } from "@/lib/account";
import { useStore } from "@/lib/store";
import { ALL_LESSONS } from "@/lib/learn/content";
import { Heading, Notice } from "@/components/ui/Bits";
import { TextField, TextArea } from "@/components/ui/Field";
export default function ProfilePage() {
  const account = useAccount();
  const [recovery, setRecovery] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const store = useStore();
  const { profile } = account;
  const completed = ALL_LESSONS.filter(l => profile.completedLessons.includes(l.id));
  return <div className="mx-auto max-w-4xl px-4 py-10 space-y-7">
    <Heading eyebrow="Your maker profile" title={profile.name ? `${profile.name}’s studio` : "Your studio"} description="Your projects, saved lessons, and learning progress in one place." />
    {account.error && <Notice title="Saving problem" tone="berry">{account.error}</Notice>}
    {!account.loaded ? <p>Loading your profile…</p> : <>
      <div className="panel p-5 space-y-5"><TextField label="Your name" value={profile.name} onChange={e => updateProfile({ name: e.target.value })} /><TextArea label="What would you like to make or learn?" value={profile.interests} onChange={e => updateProfile({ interests: e.target.value })} /></div>
      <div className="panel p-5"><h2 className="label">Learning progress</h2><p className="mt-3">{completed.length} lessons completed · {completed.length * 10} practice XP</p><p className="mt-2 text-ink-soft">{completed.length === 0 ? "Start your first lesson" : completed.length < 5 ? "Building foundations" : "Developing your practice"}. Progress reflects lessons you have practised, rather than a certified skill assessment.</p><Link className="inline-block mt-4 underline" href="/learn">Continue learning →</Link></div>
      <div className="panel p-5"><h2 className="label">Favourite lessons</h2><ul className="mt-3 space-y-2">{ALL_LESSONS.filter(l => profile.favourites.includes(l.id)).map(l => <li key={l.id}><Link className="underline" href={`/learn?lesson=${l.id}`}>{l.name}</Link></li>)}</ul>{!profile.favourites.length && <p className="mt-3">Save lessons with the favourite button in Learn.</p>}</div>
      <div className="panel p-5"><h2 className="label">Your creations · {store.projects.length}</h2><ul className="mt-3 space-y-3">{store.projects.map(p => <li key={p.id}><Link className="underline" href={`/pattern/${p.id}`}>{p.name}</Link></li>)}</ul><Link className="inline-block mt-4 underline" href="/saved">Jump back into your library →</Link></div>
      <div className="panel p-5 space-y-4"><h2 className="label">Access on another device</h2><p>Your work lives in the server database. Keep your private recovery code to open this profile on another browser. Anyone with the code can access your work.</p><Button variant="secondary" onClick={() => { void navigator.clipboard.writeText(account.recoveryCode).then(() => setRecoveryMessage("Recovery code copied. Keep it somewhere private.")).catch(() => setRecoveryMessage("Clipboard unavailable. Open the code below to copy it.")); }}>Copy my recovery code</Button><details><summary>Show private recovery code</summary><code className="break-all">{account.recoveryCode}</code></details><TextField label="Restore an existing profile" value={recovery} onChange={e => setRecovery(e.target.value)} placeholder="Paste your recovery code" /><Button disabled={!recovery.trim()} onClick={async () => { const r = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recoveryCode: recovery.trim() }) }); if (r.ok) window.location.reload(); else setRecoveryMessage("That recovery code was not found."); }}>Open saved profile</Button><p role="status">{recoveryMessage}</p></div>
    </>}
  </div>;
}
