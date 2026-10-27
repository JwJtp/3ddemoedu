import type { ProgressRecord, Topic, TopicStatus } from "@/lib/domain/types";

/** Pure rules. No I/O, so they are easy to test. */

export function emptyProgress(studentId: string, topicId: string): ProgressRecord {
  return { studentId, topicId, sectionsDone: [], tasksDone: [], bestScorePercent: null, testPassed: false, attempts: 0, version: 0 };
}

export function requirementsMet(topic: Topic, p: ProgressRecord | null): boolean {
  if (!p) return topic.requiredSections.length === 0 && topic.requiredTasks.length === 0;
  return (
    topic.requiredSections.every((s) => p.sectionsDone.includes(s)) &&
    topic.requiredTasks.every((t) => p.tasksDone.includes(t))
  );
}

export function isMastered(topic: Topic, p: ProgressRecord | null, thresholdPercent: number): boolean {
  if (!p || !p.testPassed || p.bestScorePercent === null) return false;
  return requirementsMet(topic, p) && p.bestScorePercent >= thresholdPercent;
}

export function percentScore(correct: number, total: number): number {
  if (!Number.isInteger(correct) || !Number.isInteger(total) || total <= 0 || correct < 0 || correct > total) {
    throw new RangeError("Invalid score inputs");
  }
  return Math.round((correct / total) * 100);
}

export interface TopicState {
  topicId: string;
  status: TopicStatus;
  /** Prerequisite topic ids not yet mastered. Empty unless locked. */
  missingPrerequisites: string[];
}

/**
 * Derives every topic's status from authoritative progress.
 * Stars and ratings are never an input here.
 */
export function computeTopicStates(
  topics: readonly Topic[],
  progress: readonly ProgressRecord[],
  thresholdFor: (topic: Topic) => number,
): TopicState[] {
  const byTopic = new Map(progress.map((p) => [p.topicId, p]));
  const masteredIds = new Set(
    topics.filter((t) => isMastered(t, byTopic.get(t.id) ?? null, thresholdFor(t))).map((t) => t.id),
  );
  return topics.map((t) => {
    const missing = t.prerequisites.filter((id) => !masteredIds.has(id));
    if (masteredIds.has(t.id)) return { topicId: t.id, status: "mastered", missingPrerequisites: [] };
    if (missing.length > 0) return { topicId: t.id, status: "locked", missingPrerequisites: missing };
    const p = byTopic.get(t.id);
    const started = !!p && (p.sectionsDone.length > 0 || p.tasksDone.length > 0 || p.attempts > 0);
    return { topicId: t.id, status: started ? "in_progress" : "available", missingPrerequisites: [] };
  });
}
