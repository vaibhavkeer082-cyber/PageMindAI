import { mkdir, readFile, writeFile } from "fs/promises";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { DB_FILE, DATA_DIR, UPLOAD_DIR } from "@/lib/server/paths";
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

type Database = {
  users: StoredUser[];
  uploads: UploadRecord[];
  results: ResultRecord[];
  usage: UsageRecord[];
  logs: LogRecord[];
};

const initialDb: Database = {
  users: [],
  uploads: [],
  results: [],
  usage: [],
  logs: []
};

export async function ensureStorage() {
  if (getSupabaseAdmin()) return;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DB_FILE, "utf8");
  } catch {
    await writeFile(DB_FILE, JSON.stringify(initialDb, null, 2));
  }
}

export async function readDb(): Promise<Database> {
  await ensureStorage();
  const data = await readFile(DB_FILE, "utf8");
  return JSON.parse(data) as Database;
}

export async function writeDb(db: Database) {
  await ensureStorage();
  await writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

export async function findUserByEmail(email: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("users").select("*").ilike("email", email).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapUser(data) : null;
  }

  const db = await readDb();
  return db.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapUser(data) : null;
  }

  const db = await readDb();
  return db.users.find((user) => user.id === id) ?? null;
}

export async function createUser(user: StoredUser) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("users").insert(toUserRow(user));
    if (error) throw new Error(error.message);
    return;
  }

  const db = await readDb();
  db.users.push(user);
  await writeDb(db);
}

export async function createUpload(upload: UploadRecord) {
  const supabase = getSupabaseAdmin();
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

  if (supabase) {
    const { error: uploadError } = await supabase.from("uploads").insert(toUploadRow(upload));
    if (uploadError) throw new Error(uploadError.message);
    const { error: logError } = await supabase.from("logs").insert(toLogRow(log));
    if (logError) throw new Error(logError.message);
    return;
  }

  const db = await readDb();
  db.uploads.unshift(upload);
  db.logs.push(log);
  await writeDb(db);
}

export async function getUpload(id: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("uploads").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapUpload(data) : null;
  }

  const db = await readDb();
  return db.uploads.find((upload) => upload.id === id) ?? null;
}

export async function updateUploadStatus(id: string, status: UploadRecord["status"]) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("uploads").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }

  const db = await readDb();
  const upload = db.uploads.find((item) => item.id === id);
  if (upload) upload.status = status;
  await writeDb(db);
}

export async function getUserUploads(userId: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("uploads")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapUpload);
  }

  const db = await readDb();
  return db.uploads.filter((upload) => upload.userId === userId).slice(0, 10);
}

export async function createResult(result: ResultRecord) {
  const supabase = getSupabaseAdmin();
  const log: LogRecord = {
    id: crypto.randomUUID(),
    userId: result.userId,
    uploadId: result.uploadId,
    event: "analysis",
    success: true,
    processingMs: 0,
    createdAt: new Date().toISOString()
  };

  if (supabase) {
    const { error: resultError } = await supabase.from("results").insert(toResultRow(result));
    if (resultError) throw new Error(resultError.message);
    const { error: logError } = await supabase.from("logs").insert(toLogRow(log));
    if (logError) throw new Error(logError.message);
    return;
  }

  const db = await readDb();
  db.results.unshift(result);
  db.logs.push(log);
  await writeDb(db);
}

export async function incrementUsage(userId: string, date: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
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
    return;
  }

  const db = await readDb();
  const entry = db.usage.find((item) => item.userId === userId && item.date === date);
  if (entry) {
    entry.count += 1;
    entry.lastUploadAt = new Date().toISOString();
  } else {
    db.usage.push({ userId, date, count: 1, lastUploadAt: new Date().toISOString() });
  }
  await writeDb(db);
}

export async function getUsage(userId: string, date: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("usage").select("*").eq("user_id", userId).eq("date", date).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapUsage(data) : { userId, date, count: 0 };
  }

  const db = await readDb();
  return db.usage.find((item) => item.userId === userId && item.date === date) ?? { userId, date, count: 0 };
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
