"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { File as FileIcon, Loader2, Paperclip, SendHorizontal, X } from "lucide-react";
import { Navbar } from "@/components/navbar";
import type { SafeUser, UploadResponse } from "@/lib/types";

const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

export function HomeExperience({ user }: { user?: SafeUser | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function chooseFile(file?: File) {
    setError("");
    if (!file) return;
    if (!allowedTypes.includes(file.type)) {
      setError("Use PDF, JPG, or PNG.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Keep files under 10MB.");
      return;
    }
    setSelectedFile(file);
  }

  async function submit() {
    setError("");
    if (!selectedFile) {
      setError("Attach a textbook page first.");
      inputRef.current?.click();
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    setLoading(true);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      const upload = data as UploadResponse;
      sessionStorage.setItem("pagemind:lastUpload", JSON.stringify(upload));
      sessionStorage.setItem("pagemind:initialInstruction", instruction.trim());
      router.push(`/results/${upload.id}?auto=1`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec] text-black">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5">
        <Navbar user={user} />

        <section className="flex flex-1 flex-col justify-end pb-8">
          <div className="mx-auto w-full max-w-3xl">
            {selectedFile ? (
              <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-black bg-white px-3 py-2 text-sm">
                <FileIcon size={15} />
                <span className="truncate">{selectedFile.name}</span>
                <button type="button" aria-label="Remove file" onClick={() => setSelectedFile(null)}>
                  <X size={15} />
                </button>
              </div>
            ) : null}

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,image/png,image/jpeg"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                chooseFile(event.dataTransfer.files[0]);
              }}
              className="rounded-[28px] border border-black bg-white p-3 shadow-[0_1px_0_rgba(0,0,0,0.16)]"
            >
              <div className="flex items-end gap-3">
                <button
                  type="button"
                  aria-label="Attach textbook page"
                  onClick={() => inputRef.current?.click()}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-black bg-[#faf8f0] transition hover:bg-[#f0ede3]"
                >
                  <Paperclip size={18} />
                </button>
                <textarea
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submit();
                    }
                  }}
                  rows={1}
                  className="max-h-36 min-h-11 flex-1 resize-none bg-transparent py-3 text-[15px] leading-6 outline-none placeholder:text-black/40"
                  placeholder="Attach a page, then ask for notes, flowchart, exam points, or a simple explanation"
                />
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={loading}
                  aria-label="Upload and analyze"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black text-white transition hover:bg-[#2a2a2a] disabled:cursor-wait disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin" size={17} /> : <SendHorizontal size={17} />}
                </button>
              </div>
            </div>

            {error ? <p className="mt-3 px-3 text-sm text-red-700">{error}</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
