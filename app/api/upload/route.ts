import { NextRequest, NextResponse } from "next/server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

// Get access token from refresh token
async function getToken() {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN || "",
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

// Create folder in Drive
async function createFolder(token: string, itemId: number, itemName: string) {
  const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID || "";
  const name = `${String(itemId).padStart(2, "0")} — ${itemName.substring(0, 50)}`;
  
  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Folder error: ${JSON.stringify(data.error)}`);
  return data.id;
}

// Upload file to Drive folder
async function uploadToDrive(token: string, folderId: string, fileName: string, mimeType: string, buffer: Buffer) {
  const boundary = "hazmat_boundary_" + Date.now();
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });

  const parts = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
  ];

  const body = Buffer.concat([
    Buffer.from(parts[0]),
    Buffer.from(parts[1]),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  const data = await res.json();
  if (data.error) throw new Error(`Upload error: ${JSON.stringify(data.error)}`);
  return data;
}

// Make file public
async function makePublic(token: string, fileId: string) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
}

// ─── GET /api/upload — Test Drive connectivity ───
export async function GET() {
  try {
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasRefresh = !!process.env.GOOGLE_REFRESH_TOKEN;
    const hasFolder = !!process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!hasClientId || !hasSecret || !hasRefresh || !hasFolder) {
      return NextResponse.json({
        status: "missing_env",
        GOOGLE_CLIENT_ID: hasClientId,
        GOOGLE_CLIENT_SECRET: hasSecret,
        GOOGLE_REFRESH_TOKEN: hasRefresh,
        GOOGLE_DRIVE_FOLDER_ID: hasFolder,
      });
    }

    const token = await getToken();
    
    // Test: list files in the target folder
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${process.env.GOOGLE_DRIVE_FOLDER_ID}'+in+parents&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    return NextResponse.json({
      status: "connected",
      folder: process.env.GOOGLE_DRIVE_FOLDER_ID,
      token_ok: true,
      files_in_folder: data.files?.length || 0,
      files: data.files || [],
    });
  } catch (e: any) {
    return NextResponse.json({ status: "error", error: e.message }, { status: 500 });
  }
}

// ─── POST /api/upload — Upload file to Drive ───
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const itemId = formData.get("itemId") as string;
    const itemName = formData.get("itemName") as string;
    const type = formData.get("type") as string;

    if (!file || !itemId) {
      return NextResponse.json({ error: "Missing file or itemId" }, { status: 400 });
    }

    const token = await getToken();

    // Create folder for this item
    const folderId = await createFolder(token, parseInt(itemId), itemName || `Item ${itemId}`);

    // Upload file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split(".").pop() || (type === "video" ? "mp4" : "jpg");
    const fileName = `${type}_${Date.now()}.${ext}`;

    const result = await uploadToDrive(token, folderId, fileName, file.type, buffer);

    // Make public
    await makePublic(token, result.id);

    return NextResponse.json({
      ok: true,
      fileId: result.id,
      folderId,
      webViewLink: result.webViewLink || "",
      fileName,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
