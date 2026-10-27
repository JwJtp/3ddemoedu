import { describe, expect, it } from "vitest";
import { TOPICS } from "@/lib/curriculum/seed";
import { CurriculumError, validateAndSort, wouldCreateCycle } from "@/lib/curriculum/graph";
import { loadEnv } from "@/lib/env";
import type { Topic } from "@/lib/domain/types";

const mk = (id: string, prerequisites: string[]): Topic => ({
  id, subjectId: "math", title: id, summary: "", order: 1, prerequisites, defaultMasteryPercent: 80,
  requiredSections: [], requiredTasks: [],
});

describe("curriculum graph", () => {
  it("accepts the seed curriculum and orders prerequisites first", () => {
    const sorted = validateAndSort(TOPICS).map((x) => x.id);
    expect(sorted.indexOf("math-trig")).toBeLessThan(sorted.indexOf("math-triangles"));
    expect(sorted.indexOf("math-algebra")).toBeLessThan(sorted.indexOf("math-graphs"));
  });
  it("makes Trigonometry the only starting Math topic", () => {
    const roots = TOPICS.filter((x) => x.subjectId === "math" && x.prerequisites.length === 0);
    expect(roots.map((x) => x.id)).toEqual(["math-trig"]);
  });
  it("rejects cycles", () => {
    expect(() => validateAndSort([mk("a", ["b"]), mk("b", ["a"])])).toThrow(CurriculumError);
  });
  it("rejects self and unknown prerequisites", () => {
    expect(() => validateAndSort([mk("a", ["a"])])).toThrow(/itself/);
    expect(() => validateAndSort([mk("a", ["zzz"])])).toThrow(/unknown/);
  });
  it("detects a cycle before an admin saves it", () => {
    const topics = [mk("a", []), mk("b", ["a"])];
    expect(wouldCreateCycle(topics, "a", "b")).toBe(true);
    expect(wouldCreateCycle(topics, "b", "a")).toBe(false);
  });
});

describe("env", () => {
  it("defaults to demo mode", () => {
    expect(loadEnv({}).EDUVERSE_MODE).toBe("demo");
  });
  it("requires credentials for supabase mode", () => {
    expect(() => loadEnv({ EDUVERSE_MODE: "supabase" })).toThrow();
  });
});
