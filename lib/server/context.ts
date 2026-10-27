import { createDemoStore } from "@/lib/store/demo-adapter";
import { createProgressService } from "@/lib/progression/service";
import { createAssessmentService } from "@/lib/assessment/service";
import { loadEnv } from "@/lib/env";
import type { Profile } from "@/lib/domain/types";

/** One shared instance per server process (demo mode keeps data in memory). */
const globalForEdu = globalThis as unknown as { __eduverse?: ReturnType<typeof build> };

function build() {
  const env = loadEnv();
  if (env.EDUVERSE_MODE === "supabase") {
    throw new Error("Supabase adapter is not implemented yet. Use EDUVERSE_MODE=demo.");
  }
  const store = createDemoStore();
  const progress = createProgressService(store);
  return { store, progress, assessment: createAssessmentService(store, progress) };
}

export function getContext() {
  return (globalForEdu.__eduverse ??= build());
}

/**
 * DEMO AUTH ONLY. The actor comes from the x-demo-user header or the demo-user cookie.
 * Replace with a verified Supabase session before any production use.
 */
export async function getActor(req: Request): Promise<Profile | null> {
  const header = req.headers.get("x-demo-user");
  const cookie = /(?:^|;\s*)demo-user=([^;]+)/.exec(req.headers.get("cookie") ?? "")?.[1];
  return getContext().store.getProfile(header ?? cookie ?? "");
}

/** For server components: read the demo cookie. Same demo-only caveat as getActor. */
export async function getActorFromCookies(): Promise<Profile | null> {
  const { cookies } = await import("next/headers");
  const id = (await cookies()).get("demo-user")?.value ?? "";
  return getContext().store.getProfile(id);
}
