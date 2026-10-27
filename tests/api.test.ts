import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/progress/route";

const call = (body: unknown, user?: string) =>
  POST(new Request("http://x/api/progress", {
    method: "POST",
    headers: user ? { "x-demo-user": user } : {},
    body: JSON.stringify(body),
  }));
const sec = (studentId: string, topicId = "math-trig", sectionId = "trig-intro") => ({ kind: "section", studentId, topicId, sectionId });

describe("POST /api/progress access control", () => {
  it("401 without a user", async () => {
    expect((await call(sec("demo-student-1"))).status).toBe(401);
  });
  it("403 when editing another student's id", async () => {
    expect((await call(sec("demo-student-2"), "demo-student-1")).status).toBe(403);
  });
  it("403 for a teacher writing student progress", async () => {
    expect((await call(sec("demo-student-1"), "demo-teacher-1")).status).toBe(403);
  });
  it("403 for a locked topic", async () => {
    expect((await call(sec("demo-student-1", "math-triangles", "tri-intro"), "demo-student-1")).status).toBe(403);
  });
  it("400 for a smuggled score field", async () => {
    const res = await call({ ...sec("demo-student-1"), scorePercent: 100 }, "demo-student-1");
    expect(res.status).toBe(400);
  });
  it("400 for malformed JSON", async () => {
    const res = await POST(new Request("http://x", { method: "POST", headers: { "x-demo-user": "demo-student-1" }, body: "{" }));
    expect(res.status).toBe(400);
  });
  it("200 and persists for the real student", async () => {
    const res = await call(sec("demo-student-1"), "demo-student-1");
    expect(res.status).toBe(200);
    expect((await res.json()).progress.sectionsDone).toEqual(["trig-intro"]);
  });
});

describe("cookie sign-in (what the browser uses)", () => {
  it("accepts the demo-user cookie on the progress route", async () => {
    const res = await POST(new Request("http://x", {
      method: "POST",
      headers: { cookie: "theme=dark; demo-user=demo-student-1" },
      body: JSON.stringify(sec("demo-student-1")),
    }));
    expect(res.status).toBe(200);
  });
});
