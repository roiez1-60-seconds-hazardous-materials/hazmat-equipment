import { NextResponse } from "next/server";

// GET /api/test-translate — Test Google Translate
export async function GET() {
  try {
    const testTexts = ["החליפה תאוחסן בתלייה", "ציוד ניטור מלא"];
    const results: string[] = [];
    
    for (const text of testTexts) {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=he&tl=en&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      const translated = data?.[0]?.map((s: any) => s[0]).join("") || text;
      results.push(translated);
    }

    return NextResponse.json({
      status: "ok",
      input: testTexts,
      output: results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
