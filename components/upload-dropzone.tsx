"use client";

import { useRef, useState } from "react";
import { FileImage, FileText, Loader2, UploadCloud } from "lucide-react";
import type { UploadResponse } from "@/lib/types";

const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

export function UploadDropzone({ onUploaded }: { onUploaded: (upload: UploadResponse) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function uploadFile(file?: File) {
    setError("");
    if (!file) return;
    if (!allowedTypes.includes(file.type)) {
      setError("Upload a PDF, JPG, or PNG file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Keep files under 10MB for fast analysis.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      onUploaded(data);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void uploadFile(event.dataTransfer.files[0]);
      }}
      className={`panel rounded-3xl p-4 transition ${dragging ? "translate-y-[-2px] bg-[#fbfaf5]" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,image/png,image/jpeg"
        onChange={(event) => void uploadFile(event.target.files?.[0])}
      />
      <div className="flex min-h-[310px] flex-col items-center justify-center rounded-2xl border-[1.5px] border-dashed border-black bg-[#fbfaf5] px-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border-[1.5px] border-black bg-white">
          {loading ? <Loader2 className="animate-spin" size={28} /> : <UploadCloud size={30} />}
        </div>
        <h2 className="mt-7 text-2xl font-semibold tracking-[-0.02em]">Upload a textbook page</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-black/60">
          Drop a PDF, JPG, or PNG here. The workspace will extract the page and prepare structured study outputs.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="control mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? "Preparing workspace" : "Choose file"}
        </button>
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-black/58">
          <span className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-3 py-2">
            <FileText size={14} /> PDF
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-black bg-white px-3 py-2">
            <FileImage size={14} /> JPG / PNG
          </span>
        </div>
        {error ? <p className="mt-5 text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}
