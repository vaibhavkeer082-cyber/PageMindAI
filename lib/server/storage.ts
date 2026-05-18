import { getRequiredSupabaseAdmin } from "@/lib/server/supabase";
import type { AnalysisResult, OcrOutput, ResultRecord, StoredUser, UploadRecord } from "@/lib/types";

type UsageRecord = { userId: string; date: string; count: number; lastUploadAt?: string };

type LogRecord = {
  id: string;
  userId: string;
  uploadId?: string;
  event: string;
  subject?: string;
  success: boolean;
  processingMs: number;
  createdAt: string;
};

export async function findUserByEmail(email: string) {
  const supabase = getRequiredSupabaseAdmin();
  const { data, error } = await supabase.from("users").select("*").ilike("email", email).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapUser(data) : null;
}

export async function findUserById(id: string) {
  const supabase = getRequiredSupabaseAdmin();
  const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapUser(data) : null;
}

export async function createUser(user: StoredUser) {
  const supabase = getRequiredSupabaseAdmin();
  const { error } = await supabase.from("users").insert(toUserRow(user));
  if (error) throw new Error(error.message);
}

export async function ensureUser(user: StoredUser) {
  const supabase = getRequiredSupabaseAdmin();
  const { error } = await supabase.from("users").upsert(toUserRow(user), {
    onConflict: "id",
    ignoreDuplicates: true
  });
  if (error) throw new Error(error.message);
}

export async function createUpload(upload: UploadRecord) {
  const supabase = getRequiredSupabaseAdmin();
  const log: LogRecord = {
    id: crypto.randomUUID(),
    userId: upload.userId,
    uploadId: upload.id,
    event: "upload",
    subject: upload.subjectDetected,
    success: upload.status !== "failed",
    processingMs: upload.processingMs,
    createdAt: new Date().toISOString()
  };

  const { error: uploadError } = await supabase.from("uploads").insert(toUploadRow(upload));
  if (uploadError) throw new Error(uploadError.message);
  const { error: logError } = await supabase.from("logs").insert(toLogRow(log));
  if (logError) throw new Error(logError.message);
}

export async function getUpload(id: string) {
  const supabase = getRequiredSupabaseAdmin();
  const { data, error } = await supabase.from("uploads").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapUpload(data) : null;
}

export async function updateUploadStatus(id: string, status: UploadRecord["status"]) {
  const supabase = getRequiredSupabaseAdmin();
  const { error } = await supabase.from("uploads").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getUserUploads(userId: string) {
  const supabase = getRequiredSupabaseAdmin();
  const { data, error } = await supabase
    .from("uploads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapUpload);
}

export async function createResult(result: ResultRecord) {
  const supabase = getRequiredSupabaseAdmin();
  const log: LogRecord = {
    id: crypto.randomUUID(),
    userId: result.userId,
    uploadId: result.uploadId,
    event: "analysis",
    success: true,
    processingMs: 0,
    createdAt: new Date().toISOString()
  };

  const { error: resultError } = await supabase.from("results").insert(toResultRow(result));
  if (resultError) throw new Error(resultError.message);
  const { error: logError } = await supabase.from("logs").insert(toLogRow(log));
  if (logError) throw new Error(logError.message);
}

export async function incrementUsage(userId: string, date: string) {
  const supabase = getRequiredSupabaseAdmin();
  const current = await getUsage(userId, date);
  const { error } = await supabase.from("usage").upsert(
    {
      user_id: userId,
      date,
      count: current.count + 1,
      last_upload_at: new Date().toISOString()
    },
    { onConflict: "user_id,date" }
  );
  if (error) throw new Error(error.message);
}

export async function getUsage(userId: string, date: string) {
  const supabase = getRequiredSupabaseAdmin();
  const { data, error } = await supabase.from("usage").select("*").eq("user_id", userId).eq("date", date).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapUsage(data) : { userId, date, count: 0 };
}

function mapUser(row: Record<string, unknown>): StoredUser {
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    plan: row.plan === "paid" ? "paid" : "free",
    createdAt: String(row.created_at)
  };
}

function mapUpload(row: Record<string, unknown>): UploadRecord {
  const ocr = row.ocr as OcrOutput;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    fileName: String(row.file_name),
    fileType: String(row.file_type),
    filePath: String(row.file_path),
    status: row.status === "analyzed" || row.status === "failed" ? row.status : "uploaded",
    ocr,
    subjectDetected: String(row.subject_detected ?? ocr?.subject_detected ?? "General Studies"),
    createdAt: String(row.created_at),
    processingMs: Number(row.processing_ms ?? 0)
  };
}

function mapUsage(row: Record<string, unknown>): UsageRecord {
  return {
    userId: String(row.user_id),
    date: String(row.date),
    count: Number(row.count ?? 0),
    lastUploadAt: row.last_upload_at ? String(row.last_upload_at) : undefined
  };
}

function toUserRow(user: StoredUser) {
  return {
    id: user.id,
    email: user.email,
    password_hash: user.passwordHash,
    plan: user.plan,
    created_at: user.createdAt
  };
}

function toUploadRow(upload: UploadRecord) {
  return {
    id: upload.id,
    user_id: upload.userId,
    file_name: upload.fileName,
    file_type: upload.fileType,
    file_path: upload.filePath,
    status: upload.status,
    ocr: upload.ocr,
    subject_detected: upload.subjectDetected,
    created_at: upload.createdAt,
    processing_ms: upload.processingMs
  };
}

function toResultRow(result: ResultRecord) {
  return {
    id: result.id,
    upload_id: result.uploadId,
    user_id: result.userId,
    result: result.result as AnalysisResult,
    created_at: result.createdAt
  };
}

function toLogRow(log: LogRecord) {
  return {
    id: log.id,
    user_id: log.userId,
    upload_id: log.uploadId,
    event: log.event,
    subject: log.subject,
    success: log.success,
    processing_ms: log.processingMs,
    created_at: log.createdAt
  };
}
