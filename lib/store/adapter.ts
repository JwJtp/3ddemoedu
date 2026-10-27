import type { Attempt, Profile, ProgressRecord, Rating, Topic } from "@/lib/domain/types";

/** Storage boundary. Every backend (demo, Supabase) implements this. */
export interface Store {
  readonly kind: "demo" | "supabase";
  /** Human-readable persistence warning shown in the UI. */
  readonly persistenceNotice: string;
  listTopics(): Promise<Topic[]>;
  getProfile(id: string): Promise<Profile | null>;
  /** All progress rows for one student. */
  listProgress(studentId: string): Promise<ProgressRecord[]>;
  getProgress(studentId: string, topicId: string): Promise<ProgressRecord | null>;
  /**
   * Compare-and-set write. Succeeds only if the stored version equals
   * `expectedVersion` (0 when no row exists). Returns false on conflict.
   */
  saveProgress(record: ProgressRecord, expectedVersion: number): Promise<boolean>;
  /** Teacher-configured mastery percent for a topic, or null for the default. */
  getMasteryOverride(topicId: string): Promise<number | null>;
  setMasteryOverride(topicId: string, percent: number): Promise<void>;
  saveAttempt(attempt: Attempt): Promise<void>;
  getAttempt(id: string): Promise<Attempt | null>;
  listAttempts(studentId: string, topicId: string): Promise<Attempt[]>;
  /** Ratings live in their own table/map, never inside progress. */
  saveRating(rating: Rating): Promise<void>;
  getRating(studentId: string, topicId: string): Promise<Rating | null>;
}
