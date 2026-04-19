import { NextResponse } from "next/server";

const GEMINI_KEY = "AIzaSyCbdnQ8_EVWzCHRbe9UsTY0P3BT8zTVCps";

// GET /api/test-translate — Test if Gemini translation works
export async function GET() {
  try {
    const testTexts = ["החליפה תאוחסן בתלייה", "ציוד ניטור מלא"];
    const prompt = `Translate each of the following Hebrew lines to English. Return ONLY the English translations, one per line, in the same order. No numbering, no extra text.\n\n${testTexts.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
    
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
        }),
      }
    );
    
    const status = res.status;
    const data = await res.json();
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    return NextResponse.json({
      status,
      input: testTexts,
      output: output.trim().split("\n"),
      raw: data,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
