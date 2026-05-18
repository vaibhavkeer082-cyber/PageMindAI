import { z } from "zod";
import type { AnalysisResult } from "@/lib/types";

const resultSchema = z.object({
  summary: z.string().min(1),
  key_points: z.array(z.string()).min(1),
  flowchart: z.string().min(1),
  mindmap: z.array(z.object({ topic: z.string(), children: z.array(z.string()) })).min(1),
  simplified_explanation: z.string().min(1),
  exam_notes: z.array(z.string()).min(1)
});

export async function analyzeText(rawText: string, customInstruction = ""): Promise<AnalysisResult> {
  const cleanInstruction = customInstruction.trim().slice(0, 260);
  if (cleanInstruction && !/[a-zA-Z0-9]/.test(cleanInstruction)) {
    throw new Error("Instruction looks empty or invalid.");
  }

  const generated = await tryHuggingFace(buildPrompt(rawText, cleanInstruction));
  if (!generated) return fallbackAnalysis(rawText, cleanInstruction);

  try {
    return resultSchema.parse(JSON.parse(extractJson(generated)));
  } catch {
    return fallbackAnalysis(rawText, cleanInstruction);
  }
}

function buildPrompt(rawText: string, customInstruction: string) {
  return `You are PageMind AI, a document intelligence engine for students.
Return only valid JSON. No markdown. No commentary.

Required JSON shape:
{
  "summary": "short paragraph",
  "key_points": ["point"],
  "flowchart": "graph TD\\n  A[Main idea] --> B[Detail]",
  "mindmap": [{"topic": "topic", "children": ["child"]}],
  "simplified_explanation": "simple explanation",
  "exam_notes": ["note"]
}

Rules:
- The flowchart must be valid Mermaid graph TD syntax.
- Keep outputs concise and study-focused.
- Follow the optional instruction when useful.

Optional instruction: ${customInstruction || "None"}

Textbook content:
${rawText.slice(0, 18000)}`;
}

async function tryHuggingFace(prompt: string) {
  const token = process.env.HF_API_KEY;
  const model = process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";
  if (!token) return null;

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: `<s>[INST] ${prompt} [/INST]`,
        parameters: {
          max_new_tokens: 1200,
          temperature: 0.2,
          return_full_text: false
        }
      })
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{ generated_text?: string }> | { generated_text?: string };
    return Array.isArray(data) ? data[0]?.generated_text ?? null : data.generated_text ?? null;
  } catch {
    return null;
  }
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found.");
  return match[0];
}

function fallbackAnalysis(rawText: string, customInstruction: string): AnalysisResult {
  const sentences = rawText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const keyPoints = sentences.slice(0, 5).map((sentence) => sentence.slice(0, 180));
  const topic = inferTopic(rawText);

  return {
    summary:
      sentences.slice(0, 3).join(" ") ||
      "PageMind AI extracted the document text, but the content was too sparse for a detailed summary.",
    key_points: keyPoints.length ? keyPoints : ["Review the uploaded page and confirm the source text is readable."],
    flowchart: `graph TD\n  A[${escapeMermaid(topic)}] --> B[Read core idea]\n  B --> C[Identify key points]\n  C --> D[Revise with exam notes]\n  D --> E[Recall visually]`,
    mindmap: [
      { topic, children: keyPoints.slice(0, 3).length ? keyPoints.slice(0, 3) : ["Main idea", "Important terms", "Revision cue"] },
      { topic: customInstruction || "Revision focus", children: ["Short notes", "Visual structure", "Exam-ready recall"] }
    ],
    simplified_explanation:
      sentences[0] ||
      "This page should be treated as source material. Upload a clearer page or configure Hugging Face for richer explanations.",
    exam_notes: keyPoints.slice(0, 4).length ? keyPoints.slice(0, 4) : ["Underline definitions, dates, formulas, and cause-effect links."]
  };
}

function inferTopic(text: string) {
  const words = text.match(/[A-Za-z]{5,}/g)?.slice(0, 20) ?? [];
  return words[0] ? words[0][0].toUpperCase() + words[0].slice(1).toLowerCase() : "Uploaded Page";
}

function escapeMermaid(value: string) {
  return value.replace(/[\[\]{}|"]/g, "").slice(0, 48);
}
