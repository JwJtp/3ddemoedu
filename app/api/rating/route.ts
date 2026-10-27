import { NextResponse } from "next/server";
import { z } from "zod";
import { getActor, getContext } from "@/lib/server/context";
import { fail, readJson } from "@/lib/server/respond";

const Body = z
  .object({ topicId: z.string().min(1), stars: z.number().int().min(1).max(5), comment: z.string().max(500).default("") })
  .strict();

export async function POST(req: Request) {
  const actor = await getActor(req);
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const r = await getContext().assessment.rate(actor, parsed.data.topicId, parsed.data.stars, parsed.data.comment);
    return NextResponse.json({ rating: { stars: r.stars, comment: r.comment } });
  } catch (e) {
    return fail(e, actor);
  }
}
