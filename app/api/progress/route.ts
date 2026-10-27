import { NextResponse } from "next/server";
import { z } from "zod";
import { getActor, getContext } from "@/lib/server/context";
import { fail, readJson } from "@/lib/server/respond";

/**
 * Demo auth only (see getActor). There is deliberately no score field:
 * test results are only ever recorded by the server-side grader.
 */
const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("section"), studentId: z.string(), topicId: z.string(), sectionId: z.string() }).strict(),
  z.object({ kind: z.literal("task"), studentId: z.string(), topicId: z.string(), taskId: z.string() }).strict(),
]);

export async function POST(req: Request) {
  const actor = await getActor(req);
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const b = parsed.data;
  try {
    const ctx = getContext();
    const result =
      b.kind === "section"
        ? await ctx.progress.completeSection(actor, b.studentId, b.topicId, b.sectionId)
        : await ctx.progress.completeTask(actor, b.studentId, b.topicId, b.taskId);
    return NextResponse.json({ progress: result });
  } catch (e) {
    return fail(e, actor);
  }
}
