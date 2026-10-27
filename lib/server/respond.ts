import { NextResponse } from "next/server";
import { ForbiddenError, NotFoundError, RuleError } from "@/lib/progression/service";
import type { Profile } from "@/lib/domain/types";

export function fail(e: unknown, actor: Profile | null) {
  if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: actor ? 403 : 401 });
  if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 });
  if (e instanceof RuleError) return NextResponse.json({ error: e.message }, { status: 409 });
  if (e instanceof RangeError) return NextResponse.json({ error: e.message }, { status: 400 });
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}

export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => null);
}
