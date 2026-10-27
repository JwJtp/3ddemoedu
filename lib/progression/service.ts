import type { Profile, ProgressRecord, Topic } from "@/lib/domain/types";
import type { Store } from "@/lib/store/adapter";
import { computeTopicStates, emptyProgress, percentScore, requirementsMet, type TopicState } from "./engine";

export class ForbiddenError extends Error {}
export class NotFoundError extends Error {}
export class RuleError extends Error {}

const MAX_RETRIES = 8;

/** Every entry point checks who is asking and re-checks locks on the server. */
export function createProgressService(store: Store) {
  async function thresholdFor(topic: Topic): Promise<number> {
    return (await store.getMasteryOverride(topic.id)) ?? topic.defaultMasteryPercent;
  }

  async function loadTopic(topicId: string): Promise<Topic> {
    const topic = (await store.listTopics()).find((t) => t.id === topicId);
    if (!topic) throw new NotFoundError("Unknown topic");
    return topic;
  }

  function assertStudentSelf(actor: Profile | null, studentId: string): asserts actor is Profile {
    if (!actor) throw new ForbiddenError("Sign in required");
    if (actor.role !== "student" || actor.id !== studentId) {
      throw new ForbiddenError("Students can only change their own progress");
    }
  }

  async function states(studentId: string): Promise<TopicState[]> {
    const topics = await store.listTopics();
    const progress = await store.listProgress(studentId);
    const thresholds = new Map<string, number>();
    for (const t of topics) thresholds.set(t.id, await thresholdFor(t));
    return computeTopicStates(topics, progress, (t) => thresholds.get(t.id) ?? t.defaultMasteryPercent);
  }

  async function assertUnlocked(studentId: string, topicId: string): Promise<void> {
    const state = (await states(studentId)).find((s) => s.topicId === topicId);
    if (!state) throw new NotFoundError("Unknown topic");
    if (state.status === "locked") {
      throw new ForbiddenError(`Topic is locked. Master first: ${state.missingPrerequisites.join(", ")}`);
    }
  }

  /** Read-modify-write with compare-and-set so concurrent updates never overwrite each other. */
  async function mutate(
    studentId: string,
    topicId: string,
    change: (p: ProgressRecord) => ProgressRecord,
  ): Promise<ProgressRecord> {
    for (let i = 0; i < MAX_RETRIES; i++) {
      const current = (await store.getProgress(studentId, topicId)) ?? emptyProgress(studentId, topicId);
      const next = change({ ...current, sectionsDone: [...current.sectionsDone], tasksDone: [...current.tasksDone] });
      if (await store.saveProgress(next, current.version)) return { ...next, version: current.version + 1 };
    }
    throw new RuleError("Could not save progress after several attempts. Please retry.");
  }

  return {
    states,

    async completeSection(actor: Profile | null, studentId: string, topicId: string, sectionId: string) {
      assertStudentSelf(actor, studentId);
      const topic = await loadTopic(topicId);
      if (!topic.requiredSections.includes(sectionId)) throw new NotFoundError("Unknown section");
      await assertUnlocked(studentId, topicId);
      return mutate(studentId, topicId, (p) =>
        p.sectionsDone.includes(sectionId) ? p : { ...p, sectionsDone: [...p.sectionsDone, sectionId] },
      );
    },

    async completeTask(actor: Profile | null, studentId: string, topicId: string, taskId: string) {
      assertStudentSelf(actor, studentId);
      const topic = await loadTopic(topicId);
      if (!topic.requiredTasks.includes(taskId)) throw new NotFoundError("Unknown task");
      await assertUnlocked(studentId, topicId);
      return mutate(studentId, topicId, (p) =>
        p.tasksDone.includes(taskId) ? p : { ...p, tasksDone: [...p.tasksDone, taskId] },
      );
    },

    /** Throws unless this student may start or submit the unit test right now. */
    async assertCanTest(actor: Profile | null, studentId: string, topicId: string) {
      assertStudentSelf(actor, studentId);
      const topic = await loadTopic(topicId);
      await assertUnlocked(studentId, topicId);
      const current = await store.getProgress(studentId, topicId);
      if (!requirementsMet(topic, current)) {
        throw new RuleError("Finish all lesson sections and simulation tasks before the unit test.");
      }
    },

    /** Read-only: current status of one topic for this student. */
    async statusOf(studentId: string, topicId: string) {
      return (await states(studentId)).find((x) => x.topicId === topicId)?.status ?? null;
    },

    /**
     * Internal: called by the server-side quiz grader (Phase 3) with a score it computed.
     * It is NOT exposed through any client-writable API.
     */
    async recordTestResult(actor: Profile | null, studentId: string, topicId: string, correct: number, total: number) {
      assertStudentSelf(actor, studentId);
      const topic = await loadTopic(topicId);
      await assertUnlocked(studentId, topicId);
      const current = await store.getProgress(studentId, topicId);
      if (!requirementsMet(topic, current)) {
        throw new RuleError("Finish all lesson sections and simulation tasks before the unit test.");
      }
      const score = percentScore(correct, total);
      const passed = score >= (await thresholdFor(topic));
      return mutate(studentId, topicId, (p) => ({
        ...p,
        attempts: p.attempts + 1,
        bestScorePercent: Math.max(p.bestScorePercent ?? 0, score),
        testPassed: p.testPassed || passed,
      }));
    },

    /** Teachers and admins only. */
    async setThreshold(actor: Profile | null, topicId: string, percent: number) {
      if (!actor || (actor.role !== "teacher" && actor.role !== "admin")) {
        throw new ForbiddenError("Only teachers or admins can change mastery thresholds");
      }
      if (!Number.isInteger(percent) || percent < 1 || percent > 100) throw new RangeError("Threshold must be 1-100");
      await loadTopic(topicId);
      await store.setMasteryOverride(topicId, percent);
    },
  };
}

export type ProgressService = ReturnType<typeof createProgressService>;
