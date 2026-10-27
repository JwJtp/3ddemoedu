import type { Topic } from "@/lib/domain/types";

export class CurriculumError extends Error {}

/** Validates ids, missing prerequisites, self-reference and cycles. Returns topics in a safe learning order. */
export function validateAndSort(topics: readonly Topic[]): Topic[] {
  const byId = new Map<string, Topic>();
  for (const topic of topics) {
    if (byId.has(topic.id)) throw new CurriculumError(`Duplicate topic id: ${topic.id}`);
    byId.set(topic.id, topic);
  }
  for (const topic of topics) {
    for (const p of topic.prerequisites) {
      if (p === topic.id) throw new CurriculumError(`Topic ${topic.id} requires itself`);
      if (!byId.has(p)) throw new CurriculumError(`Topic ${topic.id} has unknown prerequisite ${p}`);
    }
  }
  // Kahn's algorithm: anything left over is part of a cycle.
  const indegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const topic of topics) {
    indegree.set(topic.id, topic.prerequisites.length);
    for (const p of topic.prerequisites) children.set(p, [...(children.get(p) ?? []), topic.id]);
  }
  const queue = topics.filter((x) => x.prerequisites.length === 0).map((x) => x.id);
  const sorted: Topic[] = [];
  while (queue.length) {
    const id = queue.shift() as string;
    sorted.push(byId.get(id) as Topic);
    for (const c of children.get(id) ?? []) {
      const n = (indegree.get(c) as number) - 1;
      indegree.set(c, n);
      if (n === 0) queue.push(c);
    }
  }
  if (sorted.length !== topics.length) {
    const stuck = topics.filter((x) => !sorted.includes(x)).map((x) => x.id);
    throw new CurriculumError(`Circular prerequisites involving: ${stuck.join(", ")}`);
  }
  return sorted;
}

/** Would adding `candidate` as a prerequisite of `topicId` create a cycle? Used by the admin editor. */
export function wouldCreateCycle(topics: readonly Topic[], topicId: string, candidate: string): boolean {
  const next = topics.map((x) =>
    x.id === topicId ? { ...x, prerequisites: [...x.prerequisites, candidate] } : x,
  );
  try {
    validateAndSort(next);
    return false;
  } catch {
    return true;
  }
}
