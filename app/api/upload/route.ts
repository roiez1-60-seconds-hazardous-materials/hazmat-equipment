import { NextRequest, NextResponse } from "next/server";
import { createItemFolder, uploadFile, makePublic } from "@/lib/google-drive";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const itemId = formData.get("itemId") as string;
    const itemName = formData.get("itemName") as string;
    const type = formData.get("type") as string; // "photo" or "video"

    if (!file || !itemId) {
      return NextResponse.json({ error: "Missing file or itemId" }, { status: 400 });
    }

    // Create folder for item if needed (or use existing)
    let folderId = formData.get("folderId") as string;
    if (!folderId) {
      folderId = await createItemFolder(parseInt(itemId), itemName || `Item ${itemId}`);
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate filename
    const ext = file.name.split(".").pop() || (type === "video" ? "mp4" : "jpg");
    const timestamp = Date.now();
    const fileName = type === "video" 
      ? `video_360_${timestamp}.${ext}`
      : `photo_${timestamp}.${ext}`;

    // Upload to Google Drive
    const result = await uploadFile(folderId, fileName, file.type, buffer);

    // Make publicly readable for the design company
    await makePublic(result.id);

    return NextResponse.json({
      ok: true,
      fileId: result.id,
      folderId,
      webViewLink: result.webViewLink,
      fileName,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Route segment config (Next.js 14+)
export const runtime = "nodejs";
export const maxDuration = 60;
