import { NextResponse } from "next/server";

// GET /api/auth/google — Start OAuth flow for Google Drive
export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  
  const params = new URLSearchParams({
    client_id: "416064515394-o1f3ed9h5ls3e4apau1f9pc4slalgjtd",
    redirect_uri: `${baseUrl}/api/auth/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file",
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
