import { describe, expect, it } from "vitest";
import { flight, hitsTarget, positionAt } from "@/lib/physics/projectile";
import { CONTENT } from "@/lib/curriculum/content";
import { TOPICS } from "@/lib/curriculum/seed";
import { QUESTIONS, QUESTIONS_PER_TEST } from "@/lib/assessment/bank";
import { createDemoStore, DEMO_PROFILES } from "@/lib/store/demo-adapter";
import { createProgressService } from "@/lib/progression/service";
import { createAssessmentService } from "@/lib/assessment/service";
import { validateAndSort } from "@/lib/curriculum/graph";
import type { Profile } from "@/lib/domain/types";

describe("projectile maths", () => {
  it("matches hand-worked values (20 m/s, 30°, g = 9.8)", () => {
    const f = flight({ speed: 20, angleDeg: 30, gravity: 9.8 });
    expect(f.range).toBeCloseTo(35.35, 1);
    expect(f.maxHeight).toBeCloseTo(5.10, 1);
    expect(f.timeOfFlight).toBeCloseTo(2.04, 1);
  });
  it("gives the longest range at 45 degrees", () => {
    const at = (a: number) => flight({ speed: 20, angleDeg: a, gravity: 9.8 }).range;
    expect(at(45)).toBeGreaterThan(at(30));
    expect(at(45)).toBeGreaterThan(at(60));
  });
  it("lands where the range says it does, and never goes underground", () => {
    const l = { speed: 25, angleDeg: 40, gravity: 3.71 };
    const f = flight(l);
    expect(positionAt(l, f.timeOfFlight).x).toBeCloseTo(f.range, 6);
    expect(positionAt(l, f.timeOfFlight * 2).y).toBe(0);
  });
  it("the Moon throws further than Earth for the same launch", () => {
    expect(flight({ speed: 20, angleDeg: 45, gravity: 1.62 }).range).toBeGreaterThan(flight({ speed: 20, angleDeg: 45, gravity: 9.8 }).range);
  });
  it("rejects invalid launches and checks the target window", () => {
    expect(() => flight({ speed: 10, angleDeg: 45, gravity: 0 })).toThrow(RangeError);
    expect(() => flight({ speed: -1, angleDeg: 45, gravity: 9.8 })).toThrow(RangeError);
    expect(hitsTarget(41.4)).toBe(true);
    expect(hitsTarget(42))  .toBe(false);
  });
});

describe("content stays consistent with the curriculum", () => {
  it("curriculum is still a valid acyclic graph", () => {
    expect(() => validateAndSort(TOPICS)).not.toThrow();
  });
  for (const [topicId, content] of Object.entries(CONTENT)) {
    it(`${topicId}: sections, task and questions line up`, () => {
      const topic = TOPICS.find((t) => t.id === topicId)!;
      expect(content.sections.map((s) => s.id)).toEqual(topic.requiredSections);
      expect(topic.requiredTasks).toContain(content.taskId);
      const qs = QUESTIONS.filter((q) => q.topicId === topicId);
      expect(qs.length).toBeGreaterThanOrEqual(QUESTIONS_PER_TEST);
      for (const s of topic.requiredSections) expect(qs.some((q) => q.sectionId === s)).toBe(true);
      for (const q of qs) expect(topic.requiredSections).toContain(q.sectionId);
    });
  }
});

describe("Physics topic flow", () => {
  it("Kinematics starts open, Vectors unlocks only after a passed test", async () => {
    const s = DEMO_PROFILES.find((p) => p.id === "demo-student-1") as Profile;
    const store = createDemoStore();
    const progress = createProgressService(store);
    const quiz = createAssessmentService(store, progress);
    const st = async (id: string) => progress.statusOf(s.id, id);
    expect(await st("phys-kinematics")).toBe("available");
    expect(await st("phys-vectors")).toBe("locked");
    for (const sec of ["phys-kin-motion", "phys-kin-equations", "phys-kin-projectile"]) await progress.completeSection(s, s.id, "phys-kinematics", sec);
    await progress.completeTask(s, s.id, "phys-kinematics", "phys-kin-launch");
    expect(await st("phys-vectors")).toBe("locked");
    const t = await quiz.start(s, "phys-kinematics");
    const answers = Object.fromEntries(t.questions.map((q) => {
      const full = QUESTIONS.find((x) => x.id === q.id)!;
      return [q.id, full.type === "mcq" ? full.answerIndex : full.answer];
    }));
    expect((await quiz.submit(s, t.attemptId, answers)).passed).toBe(true);
    expect(await st("phys-vectors")).toBe("available");
    expect(await st("phys-newton")).toBe("locked");
    expect(await st("math-triangles")).toBe("locked"); // other subjects unaffected
  });
});
