"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, FileText, GitFork, Paperclip, SendHorizontal, Sparkles } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { UploadDropzone } from "@/components/upload-dropzone";

export function HomeExperience() {
  const router = useRouter();

  return (
    <main className="workspace-shell min-h-screen text-black">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5">
        <Navbar />

        <section className="flex flex-1 flex-col justify-center gap-10 py-12">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-4 py-2 text-sm">
              <Sparkles size={15} />
              Intelligent document workspace
            </div>
            <h1 className="mt-7 text-4xl font-semibold leading-[1.08] tracking-[-0.035em] md:text-6xl">
              Turn textbook pages into clear study systems.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-black/64">
              Upload a textbook image or PDF. PageMind AI extracts the content and turns it into notes, flowcharts,
              mindmaps, and exam-ready explanations.
            </p>
          </motion.div>

          <motion.div
            id="demo"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.08, ease: "easeOut" }}
            className="mx-auto w-full max-w-3xl"
          >
            <UploadDropzone
              onUploaded={(upload) => {
                sessionStorage.setItem("pagemind:lastUpload", JSON.stringify(upload));
                router.push(`/results/${upload.id}`);
              }}
            />
          </motion.div>

          <div id="features" className="mx-auto grid w-full max-w-4xl gap-4 md:grid-cols-3">
            <Feature icon={<FileText size={18} />} title="Notes" text="Structured summaries and important ideas." />
            <Feature icon={<GitFork size={18} />} title="Diagrams" text="Mermaid flowcharts and mindmap sections." />
            <Feature icon={<BookOpen size={18} />} title="Revision" text="Exam notes shaped for fast recall." />
          </div>

          <WorkspaceInput />
        </section>
      </div>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="quiet-panel rounded-2xl p-5">
      <div className="text-black">{icon}</div>
      <h2 className="mt-5 text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-black/62">{text}</p>
    </div>
  );
}

function WorkspaceInput() {
  return (
    <div id="about" className="mx-auto w-full max-w-3xl rounded-3xl border-[1.5px] border-black bg-white p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Attach file"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-[1.5px] border-black bg-[#fbfaf5] transition hover:bg-[#f2efe5]"
        >
          <Paperclip size={18} />
        </button>
        <input
          className="min-h-11 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-black/42"
          placeholder="Ask about your page, generate notes, create a flowchart, or summarize a chapter"
        />
        <button
          type="button"
          aria-label="Send"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-[1.5px] border-black bg-black text-white transition hover:bg-[#2a2a2a]"
        >
          <SendHorizontal size={17} />
        </button>
      </div>
    </div>
  );
}
