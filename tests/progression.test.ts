import { beforeEach, describe, expect, it } from "vitest";
import { createDemoStore, DEMO_PROFILES } from "@/lib/store/demo-adapter";
import { createProgressService, ForbiddenError, NotFoundError, RuleError } from "@/lib/progression/service";
import { percentScore } from "@/lib/progression/engine";
import type { Profile } from "@/lib/domain/types";

const profile = (id: string): Profile => DEMO_PROFILES.find((p) => p.id === id) as Profile;
const s1 = profile("demo-student-1");
const s2 = profile("demo-student-2");
const teacher = profile("demo-teacher-1");

let svc: ReturnType<typeof createProgressService>;
beforeEach(() => {
  svc = createProgressService(createDemoStore());
});

const statusOf = async (studentId: string, topicId: string) =>
  (await svc.states(studentId)).find((x) => x.topicId === topicId)?.status;

async function finishLessonAndTasks(topicId: string, sections: string[], tasks: string[], who = s1) {
  for (const sec of sections) await svc.completeSection(who, who.id, topicId, sec);
  for (const t of tasks) await svc.completeTask(who, who.id, topicId, t);
}
const trig = () => finishLessonAndTasks("math-trig", ["trig-intro", "trig-sin-cos", "trig-tan"], ["trig-drag-angle"]);

describe("unlocking", () => {
  it("starts with only Trigonometry available", async () => {
    expect(await statusOf(s1.id, "math-trig")).toBe("available");
    expect(await statusOf(s1.id, "math-triangles")).toBe("locked");
  });

  it("unlocks the next topic only after sections, tasks AND a passing test", async () => {
    await trig();
    expect(await statusOf(s1.id, "math-triangles")).toBe("locked");
    await svc.recordTestResult(s1, s1.id, "math-trig", 7, 10); // 70% < 80%
    expect(await statusOf(s1.id, "math-trig")).toBe("in_progress");
    expect(await statusOf(s1.id, "math-triangles")).toBe("locked");
    await svc.recordTestResult(s1, s1.id, "math-trig", 9, 10); // retry passes
    expect(await statusOf(s1.id, "math-trig")).toBe("mastered");
    expect(await statusOf(s1.id, "math-triangles")).toBe("available");
  });

  it("keeps mastery after a later worse attempt", async () => {
    await trig();
    await svc.recordTestResult(s1, s1.id, "math-trig", 10, 10);
    await svc.recordTestResult(s1, s1.id, "math-trig", 1, 10);
    expect(await statusOf(s1.id, "math-trig")).toBe("mastered");
  });

  it("respects a teacher-configured threshold", async () => {
    await svc.setThreshold(teacher, "math-trig", 60);
    await trig();
    await svc.recordTestResult(s1, s1.id, "math-trig", 7, 10);
    expect(await statusOf(s1.id, "math-trig")).toBe("mastered");
  });

  it("does not pass a 100% threshold at 99%", async () => {
    await svc.setThreshold(teacher, "math-trig", 100);
    await trig();
    await svc.recordTestResult(s1, s1.id, "math-trig", 99, 100);
    expect(await statusOf(s1.id, "math-trig")).toBe("in_progress");
  });

  it("keeps students independent", async () => {
    await trig();
    await svc.recordTestResult(s1, s1.id, "math-trig", 10, 10);
    expect(await statusOf(s2.id, "math-triangles")).toBe("locked");
  });
});

describe("bypass attempts", () => {
  it("blocks progress on a locked topic", async () => {
    await expect(svc.completeSection(s1, s1.id, "math-triangles", "tri-intro")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(svc.completeTask(s1, s1.id, "math-triangles", "tri-build")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(svc.recordTestResult(s1, s1.id, "math-triangles", 10, 10)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("blocks the test before lesson requirements are done", async () => {
    await expect(svc.recordTestResult(s1, s1.id, "math-trig", 10, 10)).rejects.toBeInstanceOf(RuleError);
    await svc.completeSection(s1, s1.id, "math-trig", "trig-intro");
    await expect(svc.recordTestResult(s1, s1.id, "math-trig", 10, 10)).rejects.toBeInstanceOf(RuleError);
  });

  it("blocks editing another student's progress by changing the id", async () => {
    await expect(svc.completeSection(s1, s2.id, "math-trig", "trig-intro")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("blocks anonymous users and non-students", async () => {
    await expect(svc.completeSection(null, s1.id, "math-trig", "trig-intro")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(svc.completeSection(teacher, s1.id, "math-trig", "trig-intro")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("stops students from changing thresholds", async () => {
    await expect(svc.setThreshold(s1, "math-trig", 1)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(svc.setThreshold(null, "math-trig", 1)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects invalid thresholds, unknown topics and made-up sections", async () => {
    await expect(svc.setThreshold(teacher, "math-trig", 0)).rejects.toThrow(RangeError);
    await expect(svc.setThreshold(teacher, "math-trig", 101)).rejects.toThrow(RangeError);
    await expect(svc.setThreshold(teacher, "nope", 80)).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.completeSection(s1, s1.id, "math-trig", "fake")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects impossible scores", () => {
    expect(() => percentScore(11, 10)).toThrow(RangeError);
    expect(() => percentScore(-1, 10)).toThrow(RangeError);
    expect(() => percentScore(1, 0)).toThrow(RangeError);
  });
});

describe("concurrent updates", () => {
  it("loses no section or task when many updates run at once", async () => {
    await Promise.all([
      svc.completeSection(s1, s1.id, "math-trig", "trig-intro"),
      svc.completeSection(s1, s1.id, "math-trig", "trig-sin-cos"),
      svc.completeSection(s1, s1.id, "math-trig", "trig-tan"),
      svc.completeTask(s1, s1.id, "math-trig", "trig-drag-angle"),
      svc.completeSection(s1, s1.id, "math-trig", "trig-intro"), // duplicate
    ]);
    await svc.recordTestResult(s1, s1.id, "math-trig", 10, 10);
    expect(await statusOf(s1.id, "math-trig")).toBe("mastered");
  });

  it("counts every attempt when tests are submitted at once", async () => {
    const store = createDemoStore();
    const local = createProgressService(store);
    for (const sec of ["trig-intro", "trig-sin-cos", "trig-tan"]) await local.completeSection(s1, s1.id, "math-trig", sec);
    await local.completeTask(s1, s1.id, "math-trig", "trig-drag-angle");
    await Promise.all([1, 2, 3, 4, 5].map(() => local.recordTestResult(s1, s1.id, "math-trig", 5, 10)));
    const row = await store.getProgress(s1.id, "math-trig");
    expect(row?.attempts).toBe(5);
    expect(row?.testPassed).toBe(false);
  });
});
