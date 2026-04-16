import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/export/excel?lang=he|en
export async function GET(req: NextRequest) {
  try {
    const lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "he";
    const isEn = lang === "en";

    const sql = getDb();
    const rows = await sql`SELECT * FROM equipment ORDER BY id ASC`;

    const BOM = "\uFEFF";

    const headers = isEn ? [
      "#", "Category", "Hebrew Description", "English Description",
      "Quantity", "Status", "Notes", "Company", "Shape",
      "Length (cm)", "Width (cm)", "Height (cm)", "Diameter (cm)",
      "Weight (kg)", "Electric", "Voltage (V)", "Current (A)", "Power (W)",
      "URL", "Photos", "Video"
    ] : [
      "מספר", "קטגוריה", "תיאור עברית", "תיאור אנגלית",
      "כמות", "סטטוס", "הערות", "חברה", "צורה",
      "אורך (ס״מ)", "רוחב (ס״מ)", "גובה (ס״מ)", "קוטר (ס״מ)",
      "משקל (ק״ג)", "צרכן חשמל", "מתח (V)", "זרם (A)", "הספק (W)",
      "קישור יצרן", "תמונות", "סרטון"
    ];

    const catNames: Record<string, [string, string]> = {
      protection:    ["ציוד מיגון",   "Protection"],
      stabilization: ["ציוד ייצוב",   "Stabilization"],
      containment:   ["הכלת אירוע",   "Containment"],
      monitoring:    ["ציוד ניטור",    "Monitoring"],
      additional:    ["ציוד נוסף",     "Additional"],
    };

    const shapeNames: Record<string, [string, string]> = {
      box:       ["תיבה",      "Box"],
      cylinder:  ["גליל",      "Cylinder"],
      sphere:    ["כדורי",      "Spherical"],
      long:      ["ארוך וצר",   "Long & Narrow"],
      bag:       ["שק/תיק",    "Bag"],
      irregular: ["לא סדיר",    "Irregular"],
    };

    const statusName = (st: string) => {
      if (st === "new") return isEn ? "New" : "חדש";
      return isEn ? "Existing" : "קיים";
    };

    const csvRows = rows.map((r: any) => {
      const photos = r.photos || [];
      const cat = catNames[r.cat] ? catNames[r.cat][isEn ? 1 : 0] : r.cat;
      const shape = shapeNames[r.shape] ? shapeNames[r.shape][isEn ? 1 : 0] : r.shape;
      return [
        r.id,
        cat,
        `"${(r.he || "").replace(/"/g, '""')}"`,
        `"${(r.en || "").replace(/"/g, '""')}"`,
        r.qty || "",
        statusName(r.st),
        `"${(r.notes || "").replace(/"/g, '""')}"`,
        r.co || "",
        shape,
        r.dim_l || "",
        r.dim_w || "",
        r.dim_h || "",
        r.dim_d || "",
        r.wt || "",
        r.is_electric ? (isEn ? "Yes" : "כן") : "",
        r.voltage || "",
        r.current || "",
        r.power || "",
        r.url || "",
        photos.length,
        r.video ? (isEn ? "Yes" : "כן") : "",
      ].join(",");
    });

    const csv = BOM + headers.join(",") + "\n" + csvRows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hazmat-equipment-${lang}-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
