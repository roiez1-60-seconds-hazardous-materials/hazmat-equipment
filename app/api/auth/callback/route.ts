import { NextResponse } from "next/server";

// GET /api/auth/callback — Google OAuth callback
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const baseUrl = `${url.protocol}//${url.host}`;

  if (error) {
    return new NextResponse(`<html dir="rtl"><body style="font-family:Heebo,sans-serif;padding:40px;text-align:center">
      <h1>❌ שגיאה</h1><p>${error}</p>
      <a href="${baseUrl}/api/auth/google">נסה שוב</a>
    </body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  if (!code) {
    return new NextResponse(`<html dir="rtl"><body style="font-family:Heebo,sans-serif;padding:40px;text-align:center">
      <h1>❌ חסר קוד</h1>
      <a href="${baseUrl}/api/auth/google">נסה שוב</a>
    </body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // Exchange code for tokens
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: "416064515394-o1f3ed9h5ls3e4apau1f9pc4slalgjtd",
        client_secret: "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",
        redirect_uri: `${baseUrl}/api/auth/callback`,
        grant_type: "authorization_code",
      }),
    });

    const data = await res.json();

    if (data.error) {
      return new NextResponse(`<html dir="rtl"><body style="font-family:Heebo,sans-serif;padding:40px;text-align:center">
        <h1>❌ שגיאת Google</h1><p>${data.error}: ${data.error_description}</p>
        <a href="${baseUrl}/api/auth/google">נסה שוב</a>
      </body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    const refreshToken = data.refresh_token;
    
    return new NextResponse(`<html dir="rtl"><body style="font-family:Heebo,sans-serif;padding:40px;max-width:600px;margin:0 auto">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:48px">✅</div>
        <h1 style="color:#2E7D32">Google Drive מחובר!</h1>
      </div>
      <div style="background:#E8F5E9;border:2px solid #A5D6A7;border-radius:12px;padding:20px;margin-bottom:20px">
        <p style="font-weight:700;margin-bottom:8px">Refresh Token:</p>
        <textarea id="token" readonly style="width:100%;height:80px;padding:10px;border-radius:8px;border:1px solid #ccc;font-family:monospace;font-size:11px">${refreshToken || "NO REFRESH TOKEN - try again"}</textarea>
        <button onclick="navigator.clipboard.writeText(document.getElementById('token').value);this.textContent='✅ הועתק!'" 
          style="margin-top:10px;padding:10px 24px;background:#2E7D32;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px">
          📋 העתק Token
        </button>
      </div>
      <div style="background:#FFF3E0;border:2px solid #FFE0B2;border-radius:12px;padding:20px">
        <h3 style="color:#E65100">📌 מה עכשיו?</h3>
        <p>הוסף ב-Vercel Settings → Environment Variables:</p>
        <p><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px">GOOGLE_REFRESH_TOKEN</code> = ה-token שהעתקת</p>
        <p><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px">GOOGLE_CLIENT_ID</code> = 416064515394-o1f3ed9h5ls3e4apau1f9pc4slalgjtd</p>
        <p><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px">GOOGLE_CLIENT_SECRET</code> = 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</p>
        <p><code style="background:#f5f5f5;padding:4px 8px;border-radius:4px">GOOGLE_DRIVE_FOLDER_ID</code> = 1oFbaC6o2EHWrmHf0tfPVgUYc31SYAKrn</p>
        <p style="margin-top:12px">אחרי ההוספה → Redeploy</p>
      </div>
    </body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });

  } catch (e: any) {
    return new NextResponse(`<html dir="rtl"><body style="font-family:Heebo,sans-serif;padding:40px;text-align:center">
      <h1>❌ שגיאה</h1><p>${e.message}</p>
      <a href="${baseUrl}/api/auth/google">נסה שוב</a>
    </body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}
