"use client";
import { useAccount, saveRecord } from "@/lib/account";
export interface Supply { id: string; label: string; detail?: string; }
export default function MaterialsChecklist({ scope, items }: { scope: string; items: Supply[] }) {
  const account = useAccount();
  const key = `checklist.${scope}`;
  const checked = (account.records[key] ?? []) as string[];
  return <ul className="space-y-3">{items.map(item => <li key={item.id}><label className="flex items-start gap-4 rounded border-2 border-ink/15 p-3 cursor-pointer"><input className="check mt-0.5" type="checkbox" disabled={!account.loaded} checked={checked.includes(item.id)} onChange={e => void saveRecord(key, e.target.checked ? [...checked, item.id] : checked.filter(id => id !== item.id)).catch(() => {})} /><span><span className="label block">{item.label}</span>{item.detail && <span className="block mt-1 text-sm text-ink-soft">{item.detail}</span>}</span></label></li>)}</ul>;
}
