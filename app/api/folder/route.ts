import { NextRequest, NextResponse } from "next/server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

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

// GET /api/folder?itemId=12&itemName=יריעת כיסוי
// Returns existing folder ID or creates new one
export async function GET(req: NextRequest) {
  try {
    const itemId = req.nextUrl.searchParams.get("itemId");
    const itemName = req.nextUrl.searchParams.get("itemName") || `Item ${itemId}`;
    
    if (!itemId) return NextResponse.json({ error: "Missing itemId" }, { status: 400 });

    const token = await getToken();
    const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID || "";
    const prefix = String(itemId).padStart(2, "0") + " —";

    // Search for existing folder
    const searchQ = `'${parentId}' in parents and name contains '${prefix}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQ)}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      return NextResponse.json({ folderId: searchData.files[0].id, name: searchData.files[0].name, created: false });
    }

    // Create new folder
    const folderName = `${String(itemId).padStart(2, "0")} — ${itemName.substring(0, 50)}`;
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: folderName, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
    });
    const createData = await createRes.json();
    if (createData.error) throw new Error(JSON.stringify(createData.error));

    return NextResponse.json({ folderId: createData.id, name: folderName, created: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
