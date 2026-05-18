export type Plan = "free" | "paid";

export type SafeUser = {
  id: string;
  email: string;
  plan: Plan;
};

export type StoredUser = SafeUser & {
  passwordHash: string;
  createdAt: string;
};

export type OcrOutput = {
  raw_text: string;
  pages: number;
  subject_detected: string;
};

export type UploadRecord = {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  filePath: string;
  status: "uploaded" | "analyzed" | "failed";
  ocr: OcrOutput;
  subjectDetected: string;
  createdAt: string;
  processingMs: number;
};

export type UploadResponse = {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  status: UploadRecord["status"];
  ocr: OcrOutput;
};

export type MindmapNode = {
  topic: string;
  children: string[];
};

export type AnalysisResult = {
  summary: string;
  key_points: string[];
  flowchart: string;
  mindmap: MindmapNode[];
  simplified_explanation: string;
  exam_notes: string[];
};

export type ResultRecord = {
  id: string;
  uploadId: string;
  userId: string;
  result: AnalysisResult;
  createdAt: string;
};
