import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { parseProject } from "@/lib/project/validate";

export const runtime = "nodejs";
const path = process.env.STITCHCRAFT_DB_PATH ?? join(process.cwd(), "data", "stitchcraft.sqlite");
let database: DatabaseSync | undefined;
function db() {
  if (!database) {
    mkdirSync(dirname(path), { recursive: true });
    database = new DatabaseSync(path);
    database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records (owner TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(owner,key));");
  }
  return database;
}
function identity(request: NextRequest) {
  const token = request.cookies.get("stitchcraft-account")?.value;
  const secret = token && /^[a-f0-9]{64}$/.test(token) ? token : randomBytes(32).toString("hex");
  return { secret, owner: createHash("sha256").update(secret).digest("hex") };
}
function response(request: NextRequest, data: unknown, secret: string, status = 200) {
  const result = NextResponse.json(data, { status });
  result.cookies.set("stitchcraft-account", secret, { httpOnly: true, sameSite: "strict", secure: request.nextUrl.protocol === "https:", maxAge: 60 * 60 * 24 * 365, path: "/" });
  result.headers.set("Cache-Control", "no-store");
  return result;
}
export async function GET(request: NextRequest) {
  const { secret, owner } = identity(request);
  const records = db().prepare("SELECT key,value FROM records WHERE owner=?").all(owner) as { key: string; value: string }[];
  return response(request, { records: Object.fromEntries(records.map(r => [r.key, JSON.parse(r.value)])), recoveryCode: secret }, secret);
}
export async function PUT(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const { secret, owner } = identity(request);
  const body = await request.text();
  if (body.length > 20_000_000) return response(request, { error: "Record too large" }, secret, 413);
  let input;
  try { input = JSON.parse(body); } catch { return response(request, { error: "Invalid JSON" }, secret, 400); }
  const { key, value } = input ?? {};
  if (typeof key !== "string" || !/^(migration|profile|project\.[\w-]+|comments\.[\w-]+|checklist\.[\w-]+)$/.test(key)) return response(request, { error: "Invalid record" }, secret, 400);
  if (key.startsWith("project.") && value !== null && (!parseProject(value) || key !== `project.${value.id}`)) return response(request, { error: "Invalid project" }, secret, 400);
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 1000 && v.every(s => typeof s === "string" && s.length <= 200);
  if (key === "profile" && (value === null || typeof value !== "object" || typeof value.name !== "string" || value.name.length > 200 || typeof value.interests !== "string" || value.interests.length > 4000 || !strings(value.favourites) || !strings(value.completedLessons))) return response(request, { error: "Invalid profile" }, secret, 400);
  if (key.startsWith("comments.") && value !== null && (!Array.isArray(value) || value.length > 1000 || value.some(c => !c || typeof c.id !== "string" || typeof c.text !== "string" || c.text.length > 4000 || typeof c.createdAt !== "string"))) return response(request, { error: "Invalid comments" }, secret, 400);
  if (key.startsWith("checklist.") && value !== null && !strings(value)) return response(request, { error: "Invalid checklist" }, secret, 400);
  if (key === "migration" && value !== true) return response(request, { error: "Invalid migration" }, secret, 400);
  if (value === undefined) return response(request, { error: "Missing value" }, secret, 400);
  if (value === null) db().prepare("DELETE FROM records WHERE owner=? AND key=?").run(owner, key);
  else db().prepare("INSERT INTO records(owner,key,value) VALUES(?,?,?) ON CONFLICT(owner,key) DO UPDATE SET value=excluded.value").run(owner, key, JSON.stringify(value));
  return response(request, { ok: true }, secret);
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  let payload;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { recoveryCode } = payload ?? {};
  if (typeof recoveryCode !== "string" || !/^[a-f0-9]{64}$/.test(recoveryCode)) return NextResponse.json({ error: "Invalid recovery code" }, { status: 400 });
  const owner = createHash("sha256").update(recoveryCode).digest("hex");
  if (!db().prepare("SELECT 1 FROM records WHERE owner=? LIMIT 1").get(owner)) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  return response(request, { ok: true }, recoveryCode);
}
