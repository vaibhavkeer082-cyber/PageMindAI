import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeText } from "@/lib/server/ai";
import { requireUser } from "@/lib/server/auth";
import { createResult, getUpload, updateUploadStatus } from "@/lib/server/storage";

const requestSchema = z.object({
  uploadId: z.string().uuid(),
  customInstruction: z.string().max(260).optional().default("")
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = requestSchema.parse(await request.json());
    const upload = await getUpload(parsed.uploadId);
    if (!upload) return NextResponse.json({ error: "Upload not found." }, { status: 404 });
    if (upload.userId !== user.id) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

    const result = await analyzeText(upload.ocr.raw_text, parsed.customInstruction);
    await createResult({
      id: crypto.randomUUID(),
      uploadId: upload.id,
      userId: user.id,
      result,
      createdAt: new Date().toISOString()
    });
    await updateUploadStatus(upload.id, "analyzed");

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed." },
      { status: 500 }
    );
  }
}
