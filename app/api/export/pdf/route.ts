import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/export/pdf — Bilingual print-ready HTML (user prints to PDF)
export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM equipment ORDER BY id ASC`;

    const catNames: Record<string, [string, string, string]> = {
      protection:    ["ציוד מיגון",   "Protection",    "#C0272D"],
      stabilization: ["ציוד ייצוב",   "Stabilization", "#1565C0"],
      containment:   ["הכלת אירוע",   "Containment",   "#E65100"],
      monitoring:    ["ציוד ניטור",    "Monitoring",    "#2E7D32"],
      additional:    ["ציוד נוסף",     "Additional",    "#6A1B9A"],
    };

    const shapeNames: Record<string, string> = {
      box: "תיבה", cylinder: "גליל", sphere: "כדורי",
      long: "ארוך וצר", bag: "שק/תיק", irregular: "לא סדיר",
    };

    // Group by category
    const groups: Record<string, any[]> = {};
    rows.forEach((r: any) => {
      if (!groups[r.cat]) groups[r.cat] = [];
      groups[r.cat].push(r);
    });

    let itemsHtml = "";
    for (const [cat, items] of Object.entries(groups)) {
      const [he, en, color] = catNames[cat] || [cat, cat, "#666"];
      itemsHtml += `<div class="cat-header" style="background:${color}">${he} — ${en} (${items.length})</div>`;
      itemsHtml += `<table><thead><tr>
        <th>#</th><th>תיאור / Description</th><th>כמות</th>
        <th>צורה</th><th>מידות (cm)</th><th>משקל</th><th>⚡ חשמל</th><th>חברה</th><th>הערות</th>
      </tr></thead><tbody>`;
      
      for (const r of items) {
        const dims = [r.dim_l && `L:${r.dim_l}`, r.dim_w && `W:${r.dim_w}`, r.dim_h && `H:${r.dim_h}`, r.dim_d && `⌀:${r.dim_d}`].filter(Boolean).join(" × ") || "—";
        const electric = r.is_electric 
          ? ([r.voltage && `${r.voltage}V`, r.current && `${r.current}A`, r.power && `${r.power}W`].filter(Boolean).join(" / ") || "⚡")
          : "—";
        itemsHtml += `<tr>
          <td class="center">${r.id}</td>
          <td><div class="he">${r.he || ""}</div><div class="en">${r.en || ""}</div></td>
          <td class="center">${r.qty || "—"}</td>
          <td class="center">${shapeNames[r.shape] || "—"}</td>
          <td class="mono">${dims}</td>
          <td class="center">${r.wt ? r.wt + " kg" : "—"}</td>
          <td class="mono center ${r.is_electric ? "elec" : ""}">${electric}</td>
          <td>${r.co || "—"}</td>
          <td class="small">${r.notes || ""}</td>
        </tr>`;
      }
      itemsHtml += `</tbody></table>`;
    }

    const totalItems = rows.length;
    const measured = rows.filter((r: any) => r.dim_l || r.dim_d).length;
    const withPhotos = rows.filter((r: any) => (r.photos || []).length > 0).length;
    const electricItems = rows.filter((r: any) => r.is_electric).length;
    const electricComplete = rows.filter((r: any) => r.is_electric && r.voltage && (r.current || r.power)).length;
    const date = new Date().toLocaleDateString("he-IL");

    const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<title>אפיון ציוד מכולת חומ״ס — ${date}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Heebo', sans-serif; color: #2D2D2D; padding: 20px; font-size: 11px; }
  @media print { body { padding: 0; } .no-print { display: none; } }
  
  .header { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 3px solid #C0272D; margin-bottom: 20px; }
  .header h1 { font-size: 22px; color: #C0272D; }
  .header .sub { font-size: 12px; color: #888; }
  .header .stats { text-align: left; direction: ltr; }
  .header .stat { display: inline-block; padding: 4px 12px; background: #f5f3ef; border-radius: 8px; margin: 2px; font-weight: 700; font-size: 11px; }
  
  .cat-header { color: white; font-weight: 900; font-size: 14px; padding: 8px 16px; border-radius: 8px; margin: 20px 0 8px; }
  
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
  th { background: #f8f7f4; padding: 6px 8px; text-align: right; font-weight: 800; border-bottom: 2px solid #e5e2dc; font-size: 10px; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0efeb; vertical-align: top; }
  tr:hover { background: #fafaf8; }
  .center { text-align: center; }
  .mono { font-family: monospace; font-size: 10px; direction: ltr; text-align: left; }
  .he { font-weight: 700; font-size: 11px; line-height: 1.4; }
  .en { font-size: 9px; color: #999; direction: ltr; }
  .small { font-size: 9px; color: #777; }
  .elec { background: #FFF3E0 !important; color: #E65100; font-weight: 700; }
  
  .footer { margin-top: 30px; padding-top: 12px; border-top: 2px solid #e5e2dc; display: flex; justify-content: space-between; font-size: 10px; color: #bbb; }
  
  .print-btn { position: fixed; bottom: 20px; left: 20px; padding: 14px 28px; background: #C0272D; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 100; font-family: 'Heebo', sans-serif; }
  .print-btn:hover { background: #8B1A1A; }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">🖨️ הדפס / שמור PDF</button>

<div class="header">
  <div>
    <h1>🚒 אפיון ציוד מכולת חומ״ס</h1>
    <div class="sub">כבאות והצלה • ענף חומ״ס • אלמוג</div>
    <div class="sub">HazMat Container Equipment Characterization</div>
  </div>
  <div class="stats">
    <div class="sub">${date}</div>
    <div><span class="stat">📦 ${totalItems} פריטים</span></div>
    <div><span class="stat">📐 ${measured} נמדדו</span> <span class="stat">📸 ${withPhotos} צולמו</span></div>
    <div><span class="stat">⚡ ${electricComplete}/${electricItems} חשמליים</span></div>
  </div>
</div>

${itemsHtml}

<div class="footer">
  <span>© כבאות והצלה • ענף חומ״ס</span>
  <span>נוצר ב-${date} • hazmat-equipment-drab.vercel.app</span>
</div>

</body></html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
