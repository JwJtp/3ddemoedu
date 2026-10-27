import { NextResponse } from "next/server";
import { getActor, getContext } from "@/lib/server/context";

/** Returns the signed-in student's own topic states and progress. */
export async function GET(req: Request) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (actor.role !== "student") return NextResponse.json({ error: "Students only" }, { status: 403 });
  const ctx = getContext();
  return NextResponse.json({
    notice: ctx.store.persistenceNotice,
    states: await ctx.progress.states(actor.id),
    progress: await ctx.store.listProgress(actor.id),
  });
}
