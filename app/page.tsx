import { getContext } from "@/lib/server/context";
import { DemoLogin } from "@/components/DemoLogin";

export const dynamic = "force-dynamic";

export default function Home() {
  const { store } = getContext();
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">EduVerse 3D AI Academy</h1>
      <p role="note" className="mt-3 rounded border border-amber-500 p-3 text-sm">{store.persistenceNotice} Sign-in below is a demo picker, not real authentication.</p>
      <h2 className="mt-8 text-xl font-semibold">Choose a demo user</h2>
      <DemoLogin />
    </main>
  );
}
