import { getRequiredSupabaseAdmin } from "@/lib/server/supabase";

const bucketName = "uploads";

const extensionByType: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png"
};

export type StoredFile = {
  storagePath: string;
  publicUrl: string;
};

export async function uploadFileToStorage(
  buffer: Buffer,
  originalFileName: string,
  contentType: string,
  userId: string
): Promise<StoredFile> {
  if (!buffer.byteLength) {
    throw new Error("Cannot upload an empty file.");
  }

  const supabase = getRequiredSupabaseAdmin();
  const extension = getSafeExtension(originalFileName, contentType);
  const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(bucketName).upload(storagePath, buffer, {
    contentType,
    cacheControl: "31536000",
    upsert: false
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
  if (!data.publicUrl) {
    throw new Error("Storage upload succeeded, but no public URL was returned.");
  }

  return {
    storagePath,
    publicUrl: data.publicUrl
  };
}

function getSafeExtension(fileName: string, contentType: string) {
  const extension = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (extension && ["pdf", "jpg", "jpeg", "png"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }
  return extensionByType[contentType] ?? "bin";
}
