import pdf from "pdf-parse";
import { createWorker } from "tesseract.js";
import type { OcrOutput } from "@/lib/types";

const subjects = [
  "History",
  "Science",
  "Mathematics",
  "Geography",
  "Biology",
  "Physics",
  "Chemistry",
  "Economics",
  "Civics",
  "Literature"
];

export async function extractText(fileBuffer: Buffer, fileType: string): Promise<OcrOutput> {
  if (fileType === "application/pdf") {
    const data = await pdf(fileBuffer);
    const text = normalizeText(data.text);
    return {
      raw_text: text || "No selectable text was found in this PDF. OCR fallback should be connected for scanned PDFs.",
      pages: data.numpages || 1,
      subject_detected: detectSubject(text)
    };
  }

  if (fileType === "image/jpeg" || fileType === "image/png") {
    const worker = await createWorker("eng", undefined, { cacheMethod: "none" });
    try {
      const result = await worker.recognize(fileBuffer);
      const text = normalizeText(result.data.text);
      return {
        raw_text: text || "No readable text was detected in this image.",
        pages: 1,
        subject_detected: detectSubject(text)
      };
    } finally {
      await worker.terminate();
    }
  }

  throw new Error("Unsupported file type.");
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 24000);
}

function detectSubject(text: string) {
  const lower = text.toLowerCase();
  const matches = subjects.filter((subject) => lower.includes(subject.toLowerCase()));
  if (matches[0]) return matches[0];
  if (/\b(king|empire|revolution|war|civilization|constitution)\b/i.test(text)) return "History";
  if (/\b(cell|organism|photosynthesis|evolution|enzyme)\b/i.test(text)) return "Biology";
  if (/\b(force|energy|velocity|current|gravity)\b/i.test(text)) return "Physics";
  if (/\b(equation|angle|theorem|algebra|ratio)\b/i.test(text)) return "Mathematics";
  return "General Studies";
}
