import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getActorFromCookies, getContext } from "@/lib/server/context";
import { CONTENT } from "@/lib/curriculum/content";
import { TopicRunner } from "@/components/TopicRunner";

export const dynamic = "force-dynamic";

export default async function TopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const actor = await getActorFromCookies();
  if (!actor || actor.role !== "student") redirect("/");
  const ctx = getContext();
  const topic = (await ctx.store.listTopics()).find((t) => t.id === topicId);
  if (!topic) notFound();
  const status = await ctx.progress.statusOf(actor.id, topicId);
  if (status === "locked") redirect("/learn"); // server-side lock; the API enforces it too
  const content = CONTENT[topicId];
  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/learn" className="underline">← Topic map</Link>
      <h1 className="mt-2 text-3xl font-bold">{topic.title}</h1>
      <p className="mb-6 text-slate-400">{topic.summary}</p>
      {content
        ? <TopicRunner topicId={topicId} studentId={actor.id} content={content} />
        : <p role="status" className="rounded border border-slate-600 p-4">Lesson content for this topic has not been built yet. It arrives in a later phase.</p>}
    </main>
  );
}
