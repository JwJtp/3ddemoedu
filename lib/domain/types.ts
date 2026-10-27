import { z } from "zod";

export const RoleSchema = z.enum(["student", "teacher", "guardian", "admin"]);
export type Role = z.infer<typeof RoleSchema>;

export const SubjectIdSchema = z.enum(["math", "chemistry", "physics", "biology"]);
export type SubjectId = z.infer<typeof SubjectIdSchema>;

export const TopicSchema = z.object({
  id: z.string().min(1),
  subjectId: SubjectIdSchema,
  title: z.string().min(1),
  summary: z.string(),
  order: z.number().int().nonnegative(),
  /** Topic ids that must be MASTERED before this topic unlocks. */
  prerequisites: z.array(z.string()),
  /** Default mastery threshold (0-100). Teachers can override per class. */
  defaultMasteryPercent: z.number().min(1).max(100).default(80),
  /** Lesson section ids that must all be completed. */
  requiredSections: z.array(z.string()).default([]),
  /** Simulation task ids that must all be completed. */
  requiredTasks: z.array(z.string()).default([]),
});
export type Topic = z.infer<typeof TopicSchema>;

export const TopicStatusSchema = z.enum(["locked", "available", "in_progress", "mastered"]);
export type TopicStatus = z.infer<typeof TopicStatusSchema>;

export interface Profile {
  id: string;
  role: Role;
  /** Privacy-aware name shown on leaderboards (never a minor's full name). */
  displayName: string;
}

/** Authoritative per-student, per-topic progress. Written only by server code. */
export interface ProgressRecord {
  studentId: string;
  topicId: string;
  sectionsDone: string[];
  tasksDone: string[];
  bestScorePercent: number | null;
  /** Percent a passing test needed at the time it was taken. */
  testPassed: boolean;
  attempts: number;
  /** Optimistic concurrency counter. */
  version: number;
}

export type Question =
  | { id: string; topicId: string; sectionId: string; type: "mcq"; prompt: string; options: string[]; answerIndex: number; explanation: string }
  | { id: string; topicId: string; sectionId: string; type: "numeric"; prompt: string; answer: number; tolerance: number; explanation: string };

/** What the browser may see: never the answer or explanation. */
export type PublicQuestion =
  | { id: string; type: "mcq"; prompt: string; options: string[] }
  | { id: string; type: "numeric"; prompt: string };

export interface Attempt {
  id: string;
  studentId: string;
  topicId: string;
  questionIds: string[];
  startedAt: number;
  /** Server-enforced time limit in seconds, or null for untimed. */
  timeLimitSeconds: number | null;
  submittedAt: number | null;
}

/** Satisfaction feedback. Stored apart from assessment results and never used for unlocking. */
export interface Rating {
  studentId: string;
  topicId: string;
  stars: number;
  comment: string;
  createdAt: number;
}
