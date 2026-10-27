import Link from "next/link";
import { redirect } from "next/navigation";
import { getActorFromCookies, getContext } from "@/lib/server/context";

export const dynamic = "force-dynamic";

const SUBJECTS = [
  { id: "math", title: "Mathematics" },
  { id: "chemistry", title: "Chemistry" },
  { id: "physics", title: "Physics" },
  { id: "biology", title: "Biology" },
] as const;
const ICON = { locked: "🔒", available: "🟢", in_progress: "🟡", mastered: "🏆" } as const;

export default async function Learn() {
  const actor = await getActorFromCookies();
  if (!actor) redirect("/");
  const ctx = getContext();
  if (actor.role !== "student") {
    return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">{actor.displayName}</h1><p className="mt-2">The {actor.role} portal arrives in a later phase. <Link className="underline" href="/">Switch user</Link></p></main>;
  }
  const topics = await ctx.store.listTopics();
  const states = await ctx.progress.states(actor.id);
  const title = (id: string) => topics.find((t) => t.id === id)?.title ?? id;
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">Welcome, {actor.displayName}</h1>
      <p role="note" className="mt-2 text-sm text-amber-300">{ctx.store.persistenceNotice}</p>
      {SUBJECTS.map((subj) => (
        <section key={subj.id} className="mt-8" aria-labelledby={`h-${subj.id}`}>
          <h2 id={`h-${subj.id}`} className="text-xl font-semibold">{subj.title}</h2>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2">
            {topics.filter((t) => t.subjectId === subj.id).map((t) => {
              const st = states.find((s) => s.topicId === t.id)!;
              const inner = (
                <>
                  <span className="font-medium">{ICON[st.status]} {t.title}</span>
                  <span className="block text-sm text-slate-400">{t.summary}</span>
                  <span className="block text-xs">{st.status === "locked" ? `Locked. Master first: ${st.missingPrerequisites.map(title).join(", ")}` : st.status.replace("_", " ")}</span>
                </>
              );
              return (
                <li key={t.id}>
                  {st.status === "locked"
                    ? <div aria-disabled="true" className="rounded border border-slate-700 p-3 opacity-60">{inner}</div>
                    : <Link href={`/learn/${t.id}`} className="block rounded border border-sky-500 p-3 hover:bg-slate-800">{inner}</Link>}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      <p className="mt-8"><Link className="underline" href="/">Switch demo user</Link></p>
    </main>
  );
}
