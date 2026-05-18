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
  const cleanInstruction = customInstruction.trim().slice(0, 320);
  if (cleanInstruction && !/[a-zA-Z0-9]/.test(cleanInstruction)) {
    throw new Error("Instruction looks empty or invalid.");
  }

  const generated = await tryHuggingFace(buildPrompt(rawText, cleanInstruction));
  if (!generated) return fallbackAnalysis(rawText, cleanInstruction);

  try {
    const parsed = resultSchema.parse(JSON.parse(extractJson(generated)));
    return polishResult(parsed, rawText, cleanInstruction);
  } catch {
    return fallbackAnalysis(rawText, cleanInstruction);
  }
}

function buildPrompt(rawText: string, customInstruction: string) {
  return `You are PageMind AI, an expert study assistant for school and college students.
Return ONLY valid JSON. No markdown. No extra text.

The output must be useful for actual studying, not generic.

Required JSON shape:
{
  "summary": "5-7 sentence student-friendly summary",
  "key_points": ["8-12 crisp points with important facts, causes, effects, definitions, dates, formulas, or terms"],
  "flowchart": "graph TD\\n  A[Topic] --> B[Cause / Idea]\\n  B --> C[Effect / Detail]",
  "mindmap": [{"topic": "Main branch", "children": ["specific child", "specific child"]}],
  "simplified_explanation": "Explain the page clearly in simple language, like teaching a student before an exam.",
  "exam_notes": ["exam-focused note with what to remember and why it matters"]
}

Rules:
- Put the most important learning structure in the flowchart.
- Flowchart must be valid Mermaid graph TD syntax.
- Use short node labels in the flowchart.
- Avoid vague phrases like "this text discusses" unless needed.
- If the page has a process, show the process order.
- If the page has concepts, show concept relationships.
- If the page has history, show cause -> event -> result.
- If the page has science, show definition -> mechanism -> outcome.
- If the page has math, show formula -> steps -> result.
- Follow the optional instruction if it helps.

Optional instruction: ${customInstruction || "Make it exam-useful and easy to revise."}

Textbook page:
${normalizeText(rawText).slice(0, 18000)}`;
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
          max_new_tokens: 1800,
          temperature: 0.15,
          top_p: 0.9,
          return_full_text: false
        },
        options: {
          wait_for_model: true
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
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found.");
  return match[0];
}

function polishResult(result: AnalysisResult, rawText: string, customInstruction: string): AnalysisResult {
  const fallback = fallbackAnalysis(rawText, customInstruction);
  return {
    summary: result.summary || fallback.summary,
    key_points: result.key_points.length >= 4 ? result.key_points.slice(0, 12) : fallback.key_points,
    flowchart: result.flowchart.startsWith("graph") ? result.flowchart : fallback.flowchart,
    mindmap: result.mindmap.length ? result.mindmap.slice(0, 6) : fallback.mindmap,
    simplified_explanation: result.simplified_explanation || fallback.simplified_explanation,
    exam_notes: result.exam_notes.length >= 3 ? result.exam_notes.slice(0, 10) : fallback.exam_notes
  };
}

function fallbackAnalysis(rawText: string, customInstruction: string): AnalysisResult {
  const text = normalizeText(rawText);
  const sentences = getSentences(text);
  const topic = inferTopic(text);
  const keyPoints = selectKeySentences(sentences, 10);
  const terms = extractTerms(text).slice(0, 8);
  const flowItems = (keyPoints.length ? keyPoints : sentences).slice(0, 5).map(shortNode);

  return {
    summary: buildSummary(topic, keyPoints, sentences),
    key_points: keyPoints.length
      ? keyPoints
      : ["The uploaded page has limited readable text. Try a clearer page for stronger notes."],
    flowchart: buildFlowchart(topic, flowItems),
    mindmap: [
      {
        topic: "Core idea",
        children: keyPoints.slice(0, 3).length ? keyPoints.slice(0, 3) : [`Understand the main topic: ${topic}`]
      },
      {
        topic: "Important terms",
        children: terms.length ? terms : ["Main concept", "Definition", "Example"]
      },
      {
        topic: "Exam focus",
        children: buildExamNotes(topic, keyPoints, terms).slice(0, 4)
      }
    ],
    simplified_explanation: buildSimpleExplanation(topic, keyPoints, sentences, customInstruction),
    exam_notes: buildExamNotes(topic, keyPoints, terms)
  };
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").replace(/[^\S\r\n]+/g, " ").trim();
}

function getSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|[\r\n]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35 && sentence.length < 260)
    .slice(0, 80);
}

function selectKeySentences(sentences: string[], count: number) {
  const keywords = /\b(important|because|therefore|however|result|cause|effect|process|called|defined|means|example|first|second|finally|advantage|disadvantage|feature|function|role|formula|law|principle|revolution|movement|cell|energy|force|government|economy)\b/i;
  return sentences
    .map((sentence, index) => ({
      sentence,
      score:
        (keywords.test(sentence) ? 4 : 0) +
        (/\d/.test(sentence) ? 2 : 0) +
        (sentence.includes(":") ? 1 : 0) +
        Math.max(0, 5 - index * 0.2)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((item) => item.sentence.replace(/\s+/g, " "));
}

function extractTerms(text: string) {
  const words = text.match(/\b[A-Z][a-zA-Z]{4,}\b|\b[a-zA-Z]{7,}\b/g) ?? [];
  const stop = new Set([
    "because",
    "therefore",
    "however",
    "between",
    "through",
    "without",
    "another",
    "important",
    "different"
  ]);
  const frequency = new Map<string, number>();
  for (const word of words) {
    const normalized = word.toLowerCase();
    if (stop.has(normalized)) continue;
    frequency.set(normalized, (frequency.get(normalized) ?? 0) + 1);
  }
  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word[0].toUpperCase() + word.slice(1))
    .slice(0, 12);
}

function inferTopic(text: string) {
  const firstHeading = text.match(/^([A-Z][A-Za-z0-9 ,:'"-]{6,70})/)?.[1];
  if (firstHeading) return cleanLabel(firstHeading);
  const terms = extractTerms(text);
  return terms[0] ?? "Uploaded Page";
}

function buildSummary(topic: string, keyPoints: string[], sentences: string[]) {
  const source = keyPoints.length ? keyPoints : sentences;
  if (!source.length) return `This page is about ${topic}. Review the readable parts and upload a clearer scan if needed.`;
  return [`The page focuses on ${topic}.`, ...source.slice(0, 5)].join(" ");
}

function buildSimpleExplanation(topic: string, keyPoints: string[], sentences: string[], customInstruction: string) {
  const points = (keyPoints.length ? keyPoints : sentences).slice(0, 4);
  if (!points.length) return `Think of ${topic} as the main idea you need to understand before making notes.`;
  const instructionHint = customInstruction ? `Based on your instruction, focus on this angle: ${customInstruction}. ` : "";
  return `${instructionHint}In simple terms, ${topic} is the center of this page. The main things to understand are: ${points.join(" ")} When revising, connect each point to the next instead of memorizing them separately.`;
}

function buildExamNotes(topic: string, keyPoints: string[], terms: string[]) {
  const notes = [
    `Define ${topic} clearly in one or two lines.`,
    ...terms.slice(0, 3).map((term) => `Remember the term "${term}" and connect it to the main topic.`),
    ...keyPoints.slice(0, 5).map((point) => `Exam point: ${point}`)
  ];
  return notes.slice(0, 10);
}

function buildFlowchart(topic: string, items: string[]) {
  const safeTopic = escapeMermaid(cleanLabel(topic).slice(0, 42));
  const nodes = items.length ? items : ["Read page", "Find main idea", "Revise notes"];
  const lines = [`graph TD`, `  A[${safeTopic}] --> B[${escapeMermaid(nodes[0])}]`];
  const ids = ["B", "C", "D", "E", "F"];
  for (let index = 1; index < Math.min(nodes.length, ids.length); index += 1) {
    lines.push(`  ${ids[index - 1]} --> ${ids[index]}[${escapeMermaid(nodes[index])}]`);
  }
  return lines.join("\n");
}

function shortNode(sentence: string) {
  return cleanLabel(sentence)
    .split(" ")
    .slice(0, 7)
    .join(" ");
}

function cleanLabel(value: string) {
  return value.replace(/\s+/g, " ").replace(/[()[\]{}]/g, "").trim();
}

function escapeMermaid(value: string) {
  return cleanLabel(value).replace(/["|]/g, "").slice(0, 64);
}
