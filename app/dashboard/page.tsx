import Link from "next/link";
import { ArrowUpRight, Brain, FileText, Gauge, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/server/auth";
import { getUserUploads } from "@/lib/server/storage";
import { Navbar } from "@/components/navbar";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const uploads = user ? await getUserUploads(user.id) : [];

  return (
    <main className="workspace-shell min-h-screen text-black">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5">
        <Navbar user={user} />
        <section className="grid flex-1 gap-6 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="panel rounded-3xl p-6">
            <div className="flex items-center gap-3 text-black">
              <Gauge size={22} />
              <span className="text-sm uppercase tracking-[0.18em] text-black/55">Learning workspace</span>
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.035em] md:text-5xl">
              Your study operating system.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-black/64">
              Upload history, daily usage, and saved visual intelligence live here. The layout stays quiet so your study
              material remains the focus.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex items-center gap-2 rounded-full border-[1.5px] border-black bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]"
            >
              New upload <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric icon={<FileText size={18} />} label="Uploads" value={uploads.length.toString()} />
              <Metric icon={<Brain size={18} />} label="Plan" value={user?.plan ?? "free"} />
              <Metric icon={<Sparkles size={18} />} label="Daily free" value={process.env.FREE_UPLOADS_PER_DAY ?? "5"} />
            </div>
            <div className="panel rounded-3xl p-5">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">Recent uploads</h2>
              <div className="mt-4 divide-y divide-black/15">
                {uploads.length === 0 ? (
                  <p className="py-8 text-sm text-black/55">No uploads yet. Your first page is waiting.</p>
                ) : (
                  uploads.map((upload) => (
                    <div key={upload.id} className="flex items-center justify-between gap-4 py-4">
                      <div>
                        <p className="font-medium">{upload.fileName}</p>
                        <p className="text-xs text-black/50">{upload.subjectDetected || "Subject pending"}</p>
                      </div>
                      <span className="rounded-full border-[1.5px] border-black bg-[#fbfaf5] px-3 py-1 text-xs text-black/65">
                        {upload.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="quiet-panel rounded-2xl p-4">
      <div className="text-black">{icon}</div>
      <p className="mt-4 text-2xl font-semibold capitalize">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-black/45">{label}</p>
    </div>
  );
}
