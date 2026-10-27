import type { Attempt, Profile, ProgressRecord, Rating, Topic } from "@/lib/domain/types";
import { TOPICS } from "@/lib/curriculum/seed";
import { validateAndSort } from "@/lib/curriculum/graph";
import type { Store } from "./adapter";

/** Synthetic users only. */
export const DEMO_PROFILES: Profile[] = [
  { id: "demo-student-1", role: "student", displayName: "Nova-7" },
  { id: "demo-student-2", role: "student", displayName: "Orbit-3" },
  { id: "demo-teacher-1", role: "teacher", displayName: "Ms. Rao (demo)" },
  { id: "demo-guardian-1", role: "guardian", displayName: "Guardian (demo)" },
  { id: "demo-admin-1", role: "admin", displayName: "Admin (demo)" },
];

const key = (s: string, t: string) => `${s}::${t}`;

export function createDemoStore(): Store {
  const topics = validateAndSort(TOPICS);
  const progress = new Map<string, ProgressRecord>();
  const overrides = new Map<string, number>();
  const attempts = new Map<string, Attempt>();
  const ratings = new Map<string, Rating>();
  const clone = (r: ProgressRecord): ProgressRecord => ({
    ...r, sectionsDone: [...r.sectionsDone], tasksDone: [...r.tasksDone],
  });

  return {
    kind: "demo",
    persistenceNotice:
      "Demo mode: data lives in server memory only. It resets on restart and is not saved across devices.",
    async listTopics(): Promise<Topic[]> {
      return topics.map((x) => ({ ...x }));
    },
    async getProfile(id: string): Promise<Profile | null> {
      return DEMO_PROFILES.find((p) => p.id === id) ?? null;
    },
    async listProgress(studentId: string): Promise<ProgressRecord[]> {
      return [...progress.values()].filter((r) => r.studentId === studentId).map(clone);
    },
    async getProgress(studentId: string, topicId: string): Promise<ProgressRecord | null> {
      const r = progress.get(key(studentId, topicId));
      return r ? clone(r) : null;
    },
    async saveProgress(record: ProgressRecord, expectedVersion: number): Promise<boolean> {
      const current = progress.get(key(record.studentId, record.topicId));
      if ((current?.version ?? 0) !== expectedVersion) return false;
      progress.set(key(record.studentId, record.topicId), clone({ ...record, version: expectedVersion + 1 }));
      return true;
    },
    async getMasteryOverride(topicId: string): Promise<number | null> {
      return overrides.get(topicId) ?? null;
    },
    async setMasteryOverride(topicId: string, percent: number): Promise<void> {
      overrides.set(topicId, percent);
    },
    async saveAttempt(attempt: Attempt): Promise<void> {
      attempts.set(attempt.id, { ...attempt, questionIds: [...attempt.questionIds] });
    },
    async getAttempt(id: string): Promise<Attempt | null> {
      const a = attempts.get(id);
      return a ? { ...a, questionIds: [...a.questionIds] } : null;
    },
    async listAttempts(studentId: string, topicId: string): Promise<Attempt[]> {
      return [...attempts.values()].filter((a) => a.studentId === studentId && a.topicId === topicId);
    },
    async saveRating(rating: Rating): Promise<void> {
      ratings.set(key(rating.studentId, rating.topicId), { ...rating });
    },
    async getRating(studentId: string, topicId: string): Promise<Rating | null> {
      const r = ratings.get(key(studentId, topicId));
      return r ? { ...r } : null;
    },
  };
}
