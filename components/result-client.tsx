"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Brain, CheckCircle2, FileText, Loader2, Paperclip, Save, SendHorizontal, Sparkles } from "lucide-react";
import type { AnalysisResult, UploadResponse } from "@/lib/types";
import { MermaidChart } from "@/components/mermaid-chart";
import { MindmapView } from "@/components/mindmap-view";

const examples = ["Focus on exam-important points", "Explain like I'm 10", "Make it super short for revision"];

export function ResultClient({ uploadId }: { uploadId: string }) {
  const [upload, setUpload] = useState<UploadResponse | null>(null);
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const autoStarted = useRef(false);

  const metadata = useMemo(() => {
    if (!upload) return [];
    return [
      ["Pages", upload.ocr.pages.toString()],
      ["Subject", upload.ocr.subject_detected],
      ["Type", upload.fileType],
      ["Status", upload.status]
    ];
  }, [upload]);

  const analyze = useCallback(async (overrideInstruction?: string) => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, customInstruction: overrideInstruction ?? instruction })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed.");
      setResult(data.result);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }, [instruction, uploadId]);

  useEffect(() => {
    const cached = sessionStorage.getItem("pagemind:lastUpload");
    if (cached) {
      const parsed = JSON.parse(cached) as UploadResponse;
      if (parsed.id === uploadId) setUpload(parsed);
    }
    const initialInstruction = sessionStorage.getItem("pagemind:initialInstruction");
    if (initialInstruction) setInstruction(initialInstruction);
  }, [uploadId]);

  useEffect(() => {
    const shouldAutoAnalyze = new URLSearchParams(window.location.search).get("auto") === "1";
    if (!shouldAutoAnalyze || autoStarted.current) return;
    autoStarted.current = true;
    const initialInstruction = sessionStorage.getItem("pagemind:initialInstruction") ?? "";
    setInstruction(initialInstruction);
    void analyze(initialInstruction);
  }, [analyze]);

  return (
    <section className="grid gap-6 py-9 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-5">
        <div className="panel rounded-3xl p-5">
          <div className="flex items-center gap-3 text-black">
            <FileText size={20} />
            <span className="text-sm uppercase tracking-[0.16em] text-black/55">File preview</span>
          </div>
          <div className="mt-5 rounded-2xl border-[1.5px] border-black bg-[#fbfaf5] p-4">
            <p className="break-words text-lg font-semibold tracking-[-0.01em]">{upload?.fileName ?? "Uploaded page"}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {metadata.map(([label, value]) => (
                <div key={label} className="rounded-2xl border-[1.5px] border-black bg-white p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-black/45">{label}</p>
                  <p className="mt-1 text-sm text-black/78">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel rounded-3xl p-5">
          <label className="text-sm font-medium text-black">Custom instruction</label>
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            maxLength={260}
            className="mt-3 min-h-28 w-full resize-none rounded-2xl border-[1.5px] border-black bg-white p-3 text-sm outline-none transition placeholder:text-black/35 focus:bg-[#fbfaf5]"
            placeholder={examples[0]}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setInstruction(example)}
                className="rounded-full border-[1.5px] border-black bg-white px-3 py-1.5 text-xs text-black/65 transition hover:bg-[#f2efe5]"
              >
                {example}
              </button>
            ))}
          </div>
          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
          <button
            type="button"
            onClick={() => void analyze()}
            disabled={loading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-black bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2a2a2a] disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Brain size={18} />}
            Analyze Page
          </button>
        </div>
      </aside>

      <div className="min-h-[640px]">
        {!result ? (
          <div className="panel flex min-h-[640px] flex-col items-center justify-center rounded-3xl p-8 text-center">
            <Sparkles size={42} />
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em]">Analysis workspace</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-black/60">
              The document is staged. Add an instruction, generate notes, or create a clean diagram from the page.
            </p>
            <WorkspaceActionBar instruction={instruction} setInstruction={setInstruction} analyze={analyze} loading={loading} />
          </div>
        ) : (
          <div className="space-y-5">
            <OutputCard title="Flowchart" icon={<Brain size={18} />}>
              <MermaidChart chart={result.flowchart} />
            </OutputCard>
            <OutputCard title="Summary" icon={<Sparkles size={18} />}>
              <p className="text-sm leading-7 text-black/72">{result.summary}</p>
            </OutputCard>
            <OutputCard title="Mindmap" icon={<Brain size={18} />}>
              <MindmapView items={result.mindmap} />
            </OutputCard>
            <OutputCard title="Key Points" icon={<CheckCircle2 size={18} />}>
              <ul className="grid gap-3">
                {result.key_points.map((point) => (
                  <li key={point} className="rounded-2xl border-[1.5px] border-black bg-[#fbfaf5] p-3 text-sm text-black/74">{point}</li>
                ))}
              </ul>
            </OutputCard>
            <OutputCard title="Simplified Explanation" icon={<Sparkles size={18} />}>
              <p className="text-sm leading-7 text-black/72">{result.simplified_explanation}</p>
            </OutputCard>
            <OutputCard title="Exam Notes" icon={<Save size={18} />}>
              <ul className="grid gap-3">
                {result.exam_notes.map((note) => (
                  <li key={note} className="rounded-2xl border-[1.5px] border-black bg-[#fbfaf5] p-3 text-sm text-black/76">{note}</li>
                ))}
              </ul>
            </OutputCard>
            <WorkspaceActionBar instruction={instruction} setInstruction={setInstruction} analyze={analyze} loading={loading} />
          </div>
        )}
      </div>
    </section>
  );
}

function WorkspaceActionBar({
  instruction,
  setInstruction,
  analyze,
  loading
}: {
  instruction: string;
  setInstruction: (value: string) => void;
  analyze: () => Promise<void>;
  loading: boolean;
}) {
  return (
    <div className="mt-8 w-full max-w-2xl rounded-3xl border-[1.5px] border-black bg-white p-3">
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Attach" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-[1.5px] border-black bg-[#fbfaf5]">
          <Paperclip size={18} />
        </button>
        <input
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          className="min-h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-black/38"
          placeholder="Ask a question, generate notes, create flowchart, or summarize chapter"
        />
        <button
          type="button"
          onClick={() => void analyze()}
          disabled={loading}
          aria-label="Run"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-[1.5px] border-black bg-black text-white transition hover:bg-[#2a2a2a] disabled:opacity-70"
        >
          {loading ? <Loader2 className="animate-spin" size={17} /> : <SendHorizontal size={17} />}
        </button>
      </div>
    </div>
  );
}

function OutputCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="panel rounded-3xl p-5"
    >
      <div className="mb-4 flex items-center gap-2 text-black">
        {icon}
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-black">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}
