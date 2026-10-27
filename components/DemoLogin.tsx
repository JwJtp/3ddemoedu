"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const USERS = [
  { id: "demo-student-1", label: "Student: Nova-7" },
  { id: "demo-student-2", label: "Student: Orbit-3" },
  { id: "demo-teacher-1", label: "Teacher (portal coming later)" },
  { id: "demo-guardian-1", label: "Guardian (portal coming later)" },
  { id: "demo-admin-1", label: "Admin (portal coming later)" },
];

export function DemoLogin() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function login(userId: string) {
    const res = await fetch("/api/demo-login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId }) });
    if (!res.ok) { setError("Could not sign in."); return; }
    router.push("/learn");
  }
  return (
    <div>
      <ul className="mt-3 space-y-2">
        {USERS.map((u) => (
          <li key={u.id}><button type="button" onClick={() => login(u.id)} className="rounded border border-slate-500 px-3 py-2 hover:bg-slate-800">{u.label}</button></li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-red-300">{error}</p>}
    </div>
  );
}
