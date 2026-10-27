import { describe, expect, it } from "vitest";
import { POST as progressPost } from "@/app/api/progress/route";
import { POST as startPost } from "@/app/api/quiz/start/route";
import { POST as submitPost } from "@/app/api/quiz/submit/route";
import { POST as ratingPost } from "@/app/api/rating/route";
import { GET as stateGet } from "@/app/api/state/route";
import { QUESTIONS } from "@/lib/assessment/bank";

/** API-level end-to-end: HTTP handlers only, no direct service calls. Uses student 2 to stay isolated. */
const U = "demo-student-2";
const post = (h: (r: Request) => Promise<Response>, body: unknown, user = U) =>
  h(new Request("http://x", { method: "POST", headers: { "x-demo-user": user }, body: JSON.stringify(body) }));
const statusOf = async (id: string) => {
  const res = await stateGet(new Request("http://x", { headers: { "x-demo-user": U } }));
  return ((await res.json()).states as { topicId: string; status: string }[]).find((s) => s.topicId === id)?.status;
};

describe("student completes Trigonometry end to end over HTTP", () => {
  it("lesson -> simulation -> failed test -> retry -> rating -> next topic unlocks", async () => {
    expect(await statusOf("math-triangles")).toBe("locked");

    for (const sectionId of ["trig-intro", "trig-sin-cos", "trig-tan"]) {
      expect((await post(progressPost, { kind: "section", studentId: U, topicId: "math-trig", sectionId })).status).toBe(200);
    }
    // Test is refused until the simulation task is done.
    expect((await post(startPost, { topicId: "math-trig" })).status).toBe(409);
    expect((await post(progressPost, { kind: "task", studentId: U, topicId: "math-trig", taskId: "trig-drag-angle" })).status).toBe(200);

    // Failed attempt
    const start1 = await (await post(startPost, { topicId: "math-trig" })).json();
    const wrong = Object.fromEntries(start1.questions.map((q: { id: string }) => [q.id, null]));
    const r1 = await (await post(submitPost, { attemptId: start1.attemptId, answers: wrong })).json();
    expect(r1.passed).toBe(false);
    expect(await statusOf("math-triangles")).toBe("locked");
    expect((await post(ratingPost, { topicId: "math-trig", stars: 5 })).status).toBe(409);

    // Retry after the cooldown
    await new Promise((r) => setTimeout(r, 5200));
    const start2 = await (await post(startPost, { topicId: "math-trig" })).json();
    const right = Object.fromEntries(
      start2.questions.map((q: { id: string }) => {
        const full = QUESTIONS.find((x) => x.id === q.id)!;
        return [q.id, full.type === "mcq" ? full.answerIndex : full.answer];
      }),
    );
    const r2 = await (await post(submitPost, { attemptId: start2.attemptId, answers: right })).json();
    expect(r2.passed).toBe(true);

    expect((await post(ratingPost, { topicId: "math-trig", stars: 4, comment: "Fun!" })).status).toBe(200);
    expect(await statusOf("math-trig")).toBe("mastered");
    expect(await statusOf("math-triangles")).toBe("available");
  }, 15_000);

  it("rejects bad input and another user's identity", async () => {
    expect((await post(ratingPost, { topicId: "math-trig", stars: 9 })).status).toBe(400);
    expect((await post(submitPost, { attemptId: "nope", answers: {} })).status).toBe(404);
    expect((await stateGet(new Request("http://x"))).status).toBe(401);
    expect((await stateGet(new Request("http://x", { headers: { "x-demo-user": "demo-teacher-1" } }))).status).toBe(403);
  });
});
