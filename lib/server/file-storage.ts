import { mkdir, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { UPLOAD_DIR } from "@/lib/server/paths";

const bucketName = process.env.SUPABASE_UPLOAD_BUCKET || "uploads";

export async function saveUploadFile(buffer: Buffer, safeName: string, contentType: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const storagePath = `uploads/${safeName}`;
    const { error } = await supabase.storage.from(bucketName).upload(storagePath, buffer, {
      contentType,
      upsert: false
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return storagePath;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filePath = path.join(UPLOAD_DIR, safeName);
  await writeFile(filePath, buffer);
  return filePath;
}

export async function saveTempFile(buffer: Buffer, safeName: string) {
  const tempPath = path.join(os.tmpdir(), safeName);
  await writeFile(tempPath, buffer);
  return tempPath;
}
