import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
let api: typeof import("../route");
beforeAll(async () => { process.env.STITCHCRAFT_DB_PATH = join(mkdtempSync(join(tmpdir(), "stitchcraft-db-")), "test.sqlite"); api = await import("../route"); });
function req(method = "GET", cookie = "", body?: unknown) { return new NextRequest("http://localhost/api/workspace", { method, headers: { cookie, origin: "http://localhost", "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
describe("database workspace", () => {
  it("isolates profiles and restores access with the recovery code", async () => {
    const first = await api.GET(req());
    const cookie = first.headers.get("set-cookie")!.split(";")[0];
    const { recoveryCode } = await first.json();
    expect((await api.PUT(req("PUT", cookie, { key: "profile", value: { name: "Maker", interests: "Crochet", favourites: ["single-crochet"], completedLessons: [] } }))).status).toBe(200);
    expect((await (await api.GET(req("GET", cookie))).json()).records.profile.name).toBe("Maker");
    expect((await (await api.GET(req())).json()).records).toEqual({});
    const restored = await api.POST(req("POST", "", { recoveryCode }));
    expect(restored.status).toBe(200);
    const restoredCookie = restored.headers.get("set-cookie")!.split(";")[0];
    expect((await (await api.GET(req("GET", restoredCookie))).json()).records.profile.name).toBe("Maker");
  });
  it("rejects malformed records and foreign origins", async () => {
    expect((await api.PUT(req("PUT", "", { key: "profile", value: { favourites: "wrong" } }))).status).toBe(400);
    expect((await api.PUT(req("PUT", "", { key: "project.fake", value: {} }))).status).toBe(400);
    expect((await api.PUT(new NextRequest("http://localhost/api/workspace", { method: "PUT", headers: { origin: "https://elsewhere.example" } }))).status).toBe(403);
  });
});
