"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { PublicQuestion } from "@/lib/domain/types";
import type { TopicContent } from "@/lib/curriculum/content";
import { UnitCircle } from "./UnitCircle";
import { ProjectileLab } from "./ProjectileLab";

interface Props { topicId: string; studentId: string; content: TopicContent }
interface Prog { sectionsDone: string[]; tasksDone: string[]; testPassed: boolean }
interface Quiz { attemptId: string; timeLimitSeconds: number | null; questions: PublicQuestion[] }
interface Result {
  correct: number; total: number; percent: number; passed: boolean; reviewSections: string[];
  results: { questionId: string; correct: boolean; explanation: string }[];
}

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body === undefined ? undefined : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong");
  return data as T;
}

export function TopicRunner({ topicId, studentId, content }: Props) {
  const [prog, setProg] = useState<Prog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [rated, setRated] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const d = await api<{ progress: (Prog & { topicId: string })[] }>("/api/state");
      setProg(d.progress.find((p) => p.topicId === topicId) ?? { sectionsDone: [], tasksDone: [], testPassed: false });
      setError(null);
    } catch (e) { setError((e as Error).message); }
  }, [topicId]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function mark(body: object) {
    setBusy(true);
    try { await api("/api/progress", { ...body, studentId, topicId }); await refresh(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function startQuiz() {
    setBusy(true); setResult(null); setError(null);
    try {
      const q = await api<Quiz>("/api/quiz/start", { topicId });
      setQuiz(q); setAnswers({}); setSecondsLeft(q.timeLimitSeconds);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const submit = useCallback(async () => {
    if (!quiz) return;
    setBusy(true);
    try {
      const r = await api<Result>("/api/quiz/submit", { attemptId: quiz.attemptId, answers });
      setResult(r); setQuiz(null); setSecondsLeft(null); await refresh();
    } catch (e) { setError((e as Error).message); setQuiz(null); }
    finally { setBusy(false); }
  }, [quiz, answers, refresh]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) { void submit(); return; }
    const id = setTimeout(() => setSecondsLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, submit]);

  async function sendRating() {
    try { await api("/api/rating", { topicId, stars, comment }); setRated(true); setError(null); }
    catch (e) { setError((e as Error).message); }
  }

  if (!prog) return <p role="status">{error ?? "Loading your progress…"}</p>;

  const sectionsAllDone = content.sections.every((s) => prog.sectionsDone.includes(s.id));
  const taskDone = prog.tasksDone.includes(content.taskId);
  const ready = sectionsAllDone && taskDone;

  return (
    <div className="space-y-8">
      {error && <p role="alert" className="rounded border border-red-400 bg-red-950 p-3 text-red-200">{error}</p>}

      <section aria-labelledby="lessons">
        <h2 id="lessons" className="text-xl font-semibold">1. Lessons</h2>
        {content.sections.map((s) => {
          const done = prog.sectionsDone.includes(s.id);
          return (
            <article key={s.id} id={`section-${s.id}`} className="mt-3 rounded border border-slate-700 p-4">
              <h3 className="font-medium">{s.title} {done && <span aria-label="completed">✅</span>}</h3>
              {s.body.map((p, i) => <p key={i} className="mt-2 text-slate-300">{p}</p>)}
              {!done && (
                <button type="button" disabled={busy} className="mt-3 rounded bg-sky-600 px-3 py-1 disabled:opacity-50"
                  onClick={() => mark({ kind: "section", sectionId: s.id })}>
                  I have read this section
                </button>
              )}
            </article>
          );
        })}
        <p className="mt-2 text-xs text-slate-400">Section completion is self-reported; it cannot prove how closely you read.</p>
      </section>

      <section aria-labelledby="sim">
        <h2 id="sim" className="text-xl font-semibold">2. Simulation: {content.taskTitle}</h2>
        <div className="mt-3">
          {content.simulation === "projectile"
            ? <ProjectileLab done={taskDone} onComplete={() => void mark({ kind: "task", taskId: content.taskId })} />
            : <UnitCircle done={taskDone} onComplete={() => void mark({ kind: "task", taskId: content.taskId })} />}
        </div>
      </section>

      <section aria-labelledby="test">
        <h2 id="test" className="text-xl font-semibold">3. Unit test</h2>
        {!ready && <p className="mt-2 text-slate-400">Finish every lesson section and the simulation task to unlock the test.</p>}
        {ready && !quiz && !result?.passed && !prog.testPassed && (
          <button type="button" disabled={busy} onClick={startQuiz} className="mt-3 rounded bg-emerald-600 px-4 py-2 disabled:opacity-50">
            {result ? "Retry the test" : "Start the test"}
          </button>
        )}
        {quiz && (
          <form className="mt-3 space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            {secondsLeft !== null && <p role="timer" aria-live="off">Time left: {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</p>}
            {quiz.questions.map((q, i) => (
              <fieldset key={q.id} className="rounded border border-slate-700 p-3">
                <legend className="px-1 font-medium">Question {i + 1}: {q.prompt}</legend>
                {q.type === "mcq" ? q.options.map((o, oi) => (
                  <label key={oi} className="mt-1 block">
                    <input type="radio" name={q.id} checked={answers[q.id] === oi} onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} /> {o}
                  </label>
                )) : (
                  <label className="mt-1 block">Your answer
                    <input inputMode="decimal" className="ml-2 w-28 rounded border bg-slate-900 px-2 py-1"
                      onChange={(e) => { const v = e.target.value.trim(); setAnswers((a) => ({ ...a, [q.id]: v === "" || Number.isNaN(Number(v)) ? null : Number(v) })); }} />
                  </label>
                )}
              </fieldset>
            ))}
            <button type="submit" disabled={busy} className="rounded bg-emerald-600 px-4 py-2 disabled:opacity-50">Submit test</button>
          </form>
        )}
        {result && (
          <div className="mt-3 space-y-3" role="status">
            <p className="text-lg font-semibold">{result.correct}/{result.total} correct ({result.percent}%) — {result.passed ? "Passed! 🎉" : "Not yet — let’s review and try again."}</p>
            <ul className="space-y-1 text-sm">
              {result.results.map((r) => <li key={r.questionId}>{r.correct ? "✅" : "❌"} {r.explanation}</li>)}
            </ul>
            {!result.passed && result.reviewSections.length > 0 && (
              <p>Review these sections:{" "}
                {result.reviewSections.map((id) => (
                  <a key={id} className="mr-2 underline" href={`#section-${id}`}>{content.sections.find((s) => s.id === id)?.title ?? id}</a>
                ))}
              </p>
            )}
          </div>
        )}
        {!result && prog.testPassed && <p className="mt-2 text-green-300">You have already passed this unit test.</p>}
      </section>

      {(result?.passed || prog.testPassed) && (
        <section aria-labelledby="rate">
          <h2 id="rate" className="text-xl font-semibold">4. How was this topic?</h2>
          <p className="text-sm text-slate-400">Your rating is feedback only. It does not change your results.</p>
          {rated ? <p role="status" className="mt-2 text-green-300">Thanks for your feedback!</p> : (
            <div className="mt-2 space-y-2">
              <fieldset><legend className="sr-only">Star rating</legend>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="mr-3"><input type="radio" name="stars" checked={stars === n} onChange={() => setStars(n)} /> {n}★</label>
                ))}
              </fieldset>
              <label className="block text-sm">Optional comment (max 500 characters)
                <textarea maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} className="mt-1 block w-full rounded border bg-slate-900 p-2" />
              </label>
              <button type="button" disabled={stars === 0} onClick={sendRating} className="rounded bg-sky-600 px-3 py-1 disabled:opacity-50">Send rating</button>
            </div>
          )}
          <Link href="/learn" className="mt-4 inline-block underline">Back to the topic map</Link>
        </section>
      )}
    </div>
  );
}
