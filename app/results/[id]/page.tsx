import { Navbar } from "@/components/navbar";
import { ResultClient } from "@/components/result-client";
import { getCurrentUser } from "@/lib/server/auth";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  return (
    <main className="workspace-shell min-h-screen text-black">
      <div className="mx-auto min-h-screen w-full max-w-6xl px-5 py-5">
        <Navbar user={user} />
        <ResultClient uploadId={id} />
      </div>
    </main>
  );
}
