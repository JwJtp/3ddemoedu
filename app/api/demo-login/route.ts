import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext } from "@/lib/server/context";
import { readJson } from "@/lib/server/respond";

/** Demo mode only: pick a synthetic user. This is not real authentication. */
export async function POST(req: Request) {
  const parsed = z.object({ userId: z.string() }).strict().safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const profile = await getContext().store.getProfile(parsed.data.userId);
  if (!profile) return NextResponse.json({ error: "Unknown demo user" }, { status: 404 });
  const res = NextResponse.json({ role: profile.role });
  res.cookies.set("demo-user", profile.id, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
