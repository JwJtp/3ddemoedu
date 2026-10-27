import { randomUUID } from "node:crypto";
import type { Attempt, Profile, PublicQuestion, Question, Rating } from "@/lib/domain/types";
import type { Store } from "@/lib/store/adapter";
import { ForbiddenError, NotFoundError, RuleError, type ProgressService } from "@/lib/progression/service";
import { QUESTIONS, QUESTIONS_PER_TEST, TEST_TIME_LIMIT_SECONDS } from "./bank";

export type AnswerValue = number | null;

export function gradeQuestion(q: Question, answer: AnswerValue | undefined): boolean {
  if (answer === null || answer === undefined || !Number.isFinite(answer)) return false;
  return q.type === "mcq" ? answer === q.answerIndex : Math.abs(answer - q.answer) <= q.tolerance;
}

export function toPublic(q: Question): PublicQuestion {
  return q.type === "mcq"
    ? { id: q.id, type: "mcq", prompt: q.prompt, options: [...q.options] }
    : { id: q.id, type: "numeric", prompt: q.prompt };
}

/** Fisher-Yates with an injectable random source so tests are deterministic. */
export function pickQuestions(pool: Question[], count: number, rnd: () => number = Math.random): Question[] {
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(count, a.length));
}

const GRACE_SECONDS = 15;
const COOLDOWN_MS = 5_000;

export function createAssessmentService(
  store: Store,
  progress: ProgressService,
  opts: { now?: () => number; rnd?: () => number; bank?: Question[] } = {},
) {
  const now = opts.now ?? Date.now;
  const bank = opts.bank ?? QUESTIONS;

  return {
    async start(actor: Profile | null, topicId: string) {
      if (!actor) throw new ForbiddenError("Sign in required");
      await progress.assertCanTest(actor, actor.id, topicId);
      const pool = bank.filter((q) => q.topicId === topicId);
      if (pool.length === 0) throw new NotFoundError("No questions for this topic yet");
      const prior = await store.listAttempts(actor.id, topicId);
      const open = prior.find((a) => a.submittedAt === null && now() - a.startedAt < (a.timeLimitSeconds ?? Infinity) * 1000 + GRACE_SECONDS * 1000);
      if (open) throw new RuleError("Finish or submit your current test first.");
      const last = Math.max(0, ...prior.map((a) => a.submittedAt ?? a.startedAt));
      if (now() - last < COOLDOWN_MS) throw new RuleError("Please wait a few seconds before retrying.");
      const picked = pickQuestions(pool, QUESTIONS_PER_TEST, opts.rnd);
      const attempt: Attempt = {
        id: randomUUID(), studentId: actor.id, topicId,
        questionIds: picked.map((q) => q.id), startedAt: now(),
        timeLimitSeconds: TEST_TIME_LIMIT_SECONDS, submittedAt: null,
      };
      await store.saveAttempt(attempt);
      return { attemptId: attempt.id, timeLimitSeconds: attempt.timeLimitSeconds, questions: picked.map(toPublic) };
    },

    async submit(actor: Profile | null, attemptId: string, answers: Record<string, AnswerValue>) {
      if (!actor) throw new ForbiddenError("Sign in required");
      const attempt = await store.getAttempt(attemptId);
      // Same message for "missing" and "someone else's" so ids can't be probed.
      if (!attempt || attempt.studentId !== actor.id) throw new NotFoundError("Attempt not found");
      if (attempt.submittedAt !== null) throw new RuleError("This attempt was already submitted.");
      if (attempt.timeLimitSeconds !== null && now() - attempt.startedAt > (attempt.timeLimitSeconds + GRACE_SECONDS) * 1000) {
        await store.saveAttempt({ ...attempt, submittedAt: now() });
        throw new RuleError("Time ran out for this attempt. Start a new one.");
      }
      await store.saveAttempt({ ...attempt, submittedAt: now() }); // close first: no double-submit
      const questions = attempt.questionIds.map((id) => bank.find((q) => q.id === id) as Question);
      const results = questions.map((q) => ({
        questionId: q.id,
        correct: gradeQuestion(q, answers[q.id]),
        explanation: q.explanation,
        sectionId: q.sectionId,
      }));
      const correct = results.filter((r) => r.correct).length;
      const updated = await progress.recordTestResult(actor, actor.id, attempt.topicId, correct, questions.length);
      const status = await progress.statusOf(actor.id, attempt.topicId);
      const passed = status === "mastered";
      return {
        correct, total: questions.length, percent: Math.round((correct / questions.length) * 100),
        passed, status, attempts: updated.attempts, results,
        // Remediation: send the student back to the sections they missed.
        reviewSections: passed ? [] : [...new Set(results.filter((r) => !r.correct).map((r) => r.sectionId))],
      };
    },

    async rate(actor: Profile | null, topicId: string, stars: number, comment: string) {
      if (!actor || actor.role !== "student") throw new ForbiddenError("Only students can rate topics");
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new RangeError("Stars must be 1-5");
      if ((await progress.statusOf(actor.id, topicId)) !== "mastered") {
        throw new RuleError("You can rate a topic after you complete it.");
      }
      const rating: Rating = { studentId: actor.id, topicId, stars, comment: comment.trim().slice(0, 500), createdAt: now() };
      await store.saveRating(rating);
      return rating;
    },
  };
}

export type AssessmentService = ReturnType<typeof createAssessmentService>;
