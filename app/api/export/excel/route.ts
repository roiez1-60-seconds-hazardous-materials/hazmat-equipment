import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/export/excel — Export all items as CSV
export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM equipment ORDER BY id ASC`;

    // BOM for Hebrew support in Excel
    const BOM = "\uFEFF";
    
    // Headers
    const headers = [
      "מספר", "קטגוריה", "תיאור עברית", "English Description",
      "כמות", "סטטוס", "הערות", "חברה", "צורה",
      "אורך (cm)", "רוחב (cm)", "גובה (cm)", "קוטר (cm)",
      "משקל (kg)", "קישור יצרן", "מספר תמונות", "סרטון"
    ];

    const catNames: Record<string, string> = {
      protection: "ציוד מיגון",
      stabilization: "ציוד ייצוב",
      containment: "הכלת אירוע",
      monitoring: "ציוד ניטור",
      additional: "ציוד נוסף",
    };

    const shapeNames: Record<string, string> = {
      box: "תיבה",
      cylinder: "גליל",
      sphere: "כדורי",
      long: "ארוך וצר",
      bag: "שק/תיק",
      irregular: "לא סדיר",
    };

    const csvRows = rows.map((r: any) => {
      const photos = r.photos || [];
      return [
        r.id,
        catNames[r.cat] || r.cat,
        `"${(r.he || "").replace(/"/g, '""')}"`,
        `"${(r.en || "").replace(/"/g, '""')}"`,
        r.qty || "",
        r.st === "new" ? "חדש" : "קיים",
        `"${(r.notes || "").replace(/"/g, '""')}"`,
        r.co || "",
        shapeNames[r.shape] || r.shape,
        r.dim_l || "",
        r.dim_w || "",
        r.dim_h || "",
        r.dim_d || "",
        r.wt || "",
        r.url || "",
        photos.length,
        r.video ? "✓" : "",
      ].join(",");
    });

    const csv = BOM + headers.join(",") + "\n" + csvRows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hazmat-equipment-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
