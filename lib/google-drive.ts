// Google Drive API integration for photo/video storage
// Uses OAuth2 refresh token flow (same as Italy trip app)

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function getAccessToken(): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get Google access token");
  return data.access_token;
}

// Create a folder for an equipment item
export async function createItemFolder(itemId: number, itemName: string): Promise<string> {
  const token = await getAccessToken();
  const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  
  const folderName = `${String(itemId).padStart(2, "0")} — ${itemName.substring(0, 50)}`;
  
  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  
  const data = await res.json();
  return data.id;
}

// Upload a file (photo or video) to an item's folder
export async function uploadFile(
  folderId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer
): Promise<{ id: string; webViewLink: string }> {
  const token = await getAccessToken();
  
  // Multipart upload
  const boundary = "hazmat_upload_boundary";
  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
  });
  
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  
  const data = await res.json();
  return { id: data.id, webViewLink: data.webViewLink || "" };
}

// Make a file publicly readable (for the design company)
export async function makePublic(fileId: string): Promise<void> {
  const token = await getAccessToken();
  
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone",
    }),
  });
}
