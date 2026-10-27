import { z } from "zod";

/** Server-only environment. Never import this file from client components. */
const EnvSchema = z.object({
  EDUVERSE_MODE: z.enum(["demo", "supabase"]).default("demo"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const env = EnvSchema.parse(source);
  if (env.EDUVERSE_MODE === "supabase" && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error("EDUVERSE_MODE=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return env;
}
