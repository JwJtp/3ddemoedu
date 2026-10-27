import { beforeEach, describe, expect, it } from "vitest";
import { createDemoStore, DEMO_PROFILES } from "@/lib/store/demo-adapter";
import { createProgressService, ForbiddenError, NotFoundError, RuleError } from "@/lib/progression/service";
import { createAssessmentService, gradeQuestion, toPublic } from "@/lib/assessment/service";
import { QUESTIONS } from "@/lib/assessment/bank";
import type { Profile } from "@/lib/domain/types";

const who = (id: string) => DEMO_PROFILES.find((p) => p.id === id) as Profile;
const s1 = who("demo-student-1");
const s2 = who("demo-student-2");
const teacher = who("demo-teacher-1");

let clock = 1_000_000;
let store: ReturnType<typeof createDemoStore>;
let progress: ReturnType<typeof createProgressService>;
let quiz: ReturnType<typeof createAssessmentService>;

beforeEach(() => {
  clock = 1_000_000;
  store = createDemoStore();
  progress = createProgressService(store);
  quiz = createAssessmentService(store, progress, { now: () => clock, rnd: () => 0.3 });
});

async function readyForTest(s = s1) {
  for (const sec of ["trig-intro", "trig-sin-cos", "trig-tan"]) await progress.completeSection(s, s.id, "math-trig", sec);
  await progress.completeTask(s, s.id, "math-trig", "trig-drag-angle");
}
const allRight = () => Object.fromEntries(QUESTIONS.map((q) => [q.id, q.type === "mcq" ? q.answerIndex : q.answer]));
const allWrong = () => Object.fromEntries(QUESTIONS.map((q) => [q.id, q.type === "mcq" ? (q.answerIndex + 1) % q.options.length : q.answer + 100]));

describe("grading", () => {
  it("handles mcq, numeric tolerance and bad values", () => {
    const mcq = QUESTIONS.find((q) => q.type === "mcq")!;
    const num = QUESTIONS.find((q) => q.type === "numeric")!;
    expect(gradeQuestion(mcq, mcq.type === "mcq" ? mcq.answerIndex : -1)).toBe(true);
    expect(gradeQuestion(num, num.type === "numeric" ? num.answer + 0.005 : 0)).toBe(true);
    expect(gradeQuestion(num, num.type === "numeric" ? num.answer + 0.5 : 0)).toBe(false);
    expect(gradeQuestion(num, null)).toBe(false);
    expect(gradeQuestion(num, undefined)).toBe(false);
    expect(gradeQuestion(num, NaN)).toBe(false);
  });
  it("never leaks answers or explanations to the browser", () => {
    for (const q of QUESTIONS) {
      const text = JSON.stringify(toPublic(q));
      expect(text).not.toContain("answer");
      expect(text).not.toContain("explanation");
    }
  });
});

describe("unit test flow", () => {
  it("refuses to start before lesson requirements are met", async () => {
    await expect(quiz.start(s1, "math-trig")).rejects.toBeInstanceOf(RuleError);
  });
  it("refuses locked topics, anonymous users and teachers", async () => {
    await expect(quiz.start(s1, "math-triangles")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(quiz.start(null, "math-trig")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(quiz.start(teacher, "math-trig")).rejects.toBeInstanceOf(ForbiddenError);
  });
  it("fails, gives remediation, then passes on retry and unlocks the next topic", async () => {
    await readyForTest();
    const t1 = await quiz.start(s1, "math-trig");
    expect(t1.questions).toHaveLength(5);
    const fail = await quiz.submit(s1, t1.attemptId, allWrong());
    expect(fail.passed).toBe(false);
    expect(fail.reviewSections.length).toBeGreaterThan(0);
    expect(await progress.statusOf(s1.id, "math-triangles")).toBe("locked");
    clock += 10_000;
    const t2 = await quiz.start(s1, "math-trig");
    const pass = await quiz.submit(s1, t2.attemptId, allRight());
    expect(pass.passed).toBe(true);
    expect(pass.attempts).toBe(2);
    expect(await progress.statusOf(s1.id, "math-triangles")).toBe("available");
  });
  it("blocks double submit, someone else's attempt, and late submit", async () => {
    await readyForTest();
    const t = await quiz.start(s1, "math-trig");
    await expect(quiz.submit(s2, t.attemptId, allRight())).rejects.toBeInstanceOf(NotFoundError);
    await quiz.submit(s1, t.attemptId, allRight());
    await expect(quiz.submit(s1, t.attemptId, allRight())).rejects.toBeInstanceOf(RuleError);
    clock += 10_000;
    const late = await quiz.start(s1, "math-trig");
    clock += 700_000; // over the time limit plus grace
    await expect(quiz.submit(s1, late.attemptId, allRight())).rejects.toBeInstanceOf(RuleError);
  });
  it("limits open attempts and rapid retries", async () => {
    await readyForTest();
    await quiz.start(s1, "math-trig");
    await expect(quiz.start(s1, "math-trig")).rejects.toBeInstanceOf(RuleError);
  });
  it("treats unanswered questions as wrong", async () => {
    await readyForTest();
    const t = await quiz.start(s1, "math-trig");
    const r = await quiz.submit(s1, t.attemptId, {});
    expect(r.correct).toBe(0);
  });
});

describe("rating is separate from mastery", () => {
  it("cannot rate before completing, rejects bad stars, and never changes status", async () => {
    await expect(quiz.rate(s1, "math-trig", 5, "")).rejects.toBeInstanceOf(RuleError);
    await readyForTest();
    const t = await quiz.start(s1, "math-trig");
    await quiz.submit(s1, t.attemptId, allWrong());
    await expect(quiz.rate(s1, "math-trig", 5, "great")).rejects.toBeInstanceOf(RuleError);
    expect(await progress.statusOf(s1.id, "math-trig")).toBe("in_progress");
    clock += 10_000;
    const t2 = await quiz.start(s1, "math-trig");
    await quiz.submit(s1, t2.attemptId, allRight());
    await expect(quiz.rate(s1, "math-trig", 0, "")).rejects.toThrow(RangeError);
    await expect(quiz.rate(s1, "math-trig", 6, "")).rejects.toThrow(RangeError);
    const r = await quiz.rate(s1, "math-trig", 1, "x".repeat(900));
    expect(r.comment.length).toBe(500);
    expect((await store.getProgress(s1.id, "math-trig"))?.bestScorePercent).toBe(100);
    expect(await progress.statusOf(s1.id, "math-trig")).toBe("mastered");
  });
});
