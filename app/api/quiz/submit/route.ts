import { NextResponse } from "next/server";
import { z } from "zod";
import { getActor, getContext } from "@/lib/server/context";
import { fail, readJson } from "@/lib/server/respond";

const Body = z
  .object({ attemptId: z.string().min(1), answers: z.record(z.string(), z.number().finite().nullable()) })
  .strict();

export async function POST(req: Request) {
  const actor = await getActor(req);
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    return NextResponse.json(await getContext().assessment.submit(actor, parsed.data.attemptId, parsed.data.answers));
  } catch (e) {
    return fail(e, actor);
  }
}
