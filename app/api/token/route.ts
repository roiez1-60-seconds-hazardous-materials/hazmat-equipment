import { NextResponse } from "next/server";

// GET /api/token — Returns a short-lived Google access token
// Used for direct browser → Google Drive uploads (bypasses Vercel 4.5MB limit)
export async function GET() {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
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
    if (!data.access_token) {
      return NextResponse.json({ error: "Token failed" }, { status: 500 });
    }
    return NextResponse.json({
      access_token: data.access_token,
      folder_id: process.env.GOOGLE_DRIVE_FOLDER_ID || "",
      expires_in: data.expires_in,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
