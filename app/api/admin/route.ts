import { NextRequest, NextResponse } from "next/server";

// POST /api/admin — verify admin password
export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correct = process.env.ADMIN_PASSWORD || "hazmat2026";
  
  if (password === correct) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "סיסמה שגויה" }, { status: 401 });
}
