import { NextResponse } from "next/server";
import { extractText } from "@/lib/server/ocr";
import { assertUploadAllowed } from "@/lib/server/rate-limit";
import { requireUser } from "@/lib/server/auth";
import { createUpload, ensureStorage, incrementUsage } from "@/lib/server/storage";
import { saveTempFile, saveUploadFile } from "@/lib/server/file-storage";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const user = await requireUser();
    await assertUploadAllowed(user);
    await ensureStorage();

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: "Only PDF, JPG, and PNG files are supported." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be between 1 byte and 10MB." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "upload";
    const safeName = `${id}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const ocrFilePath = await saveTempFile(buffer, safeName);
    const storedFilePath = await saveUploadFile(buffer, safeName, file.type);

    const ocr = await extractText(ocrFilePath, file.type);
    const upload = {
      id,
      userId: user.id,
      fileName: file.name,
      fileType: file.type,
      filePath: storedFilePath,
      status: "uploaded" as const,
      ocr,
      subjectDetected: ocr.subject_detected,
      createdAt: new Date().toISOString(),
      processingMs: Date.now() - startedAt
    };
    await createUpload(upload);
    await incrementUsage(user.id, new Date().toISOString().slice(0, 10));

    return NextResponse.json({
      id: upload.id,
      fileName: upload.fileName,
      fileType: upload.fileType,
      status: upload.status,
      ocr: upload.ocr
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 }
    );
  }
}
