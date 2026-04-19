import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/export/pdf?lang=he|en
export async function GET(req: NextRequest) {
  try {
    const lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "he";
    const isEn = lang === "en";
    
    const sql = getDb();
    const rows = await sql`SELECT * FROM equipment ORDER BY id ASC`;

    const catNames: Record<string, [string, string, string]> = {
      protection:    ["ציוד מיגון",   "Protection",    "#C0272D"],
      stabilization: ["ציוד ייצוב",   "Stabilization", "#1565C0"],
      containment:   ["הכלת אירוע",   "Containment",   "#E65100"],
      monitoring:    ["ציוד ניטור",    "Monitoring",    "#2E7D32"],
      command:       ["ציוד שליטה",    "Command & Control", "#0277BD"],
      additional:    ["ציוד נוסף",     "Additional",    "#6A1B9A"],
    };

    const shapeNames: Record<string, [string, string]> = {
      box:       ["תיבה",      "Box"],
      cylinder:  ["גליל",      "Cylinder"],
      sphere:    ["כדורי",      "Spherical"],
      long:      ["ארוך וצר",   "Long & Narrow"],
      garment:   ["חליפה/תלוי", "Garment/Hanging"],
      bag:       ["שק/תיק",    "Bag"],
      irregular: ["לא סדיר",    "Irregular"],
    };

    // Text translations
    const T = {
      title:    { he: 'אפיון ציוד מכולת חומ"ס', en: "HazMat Container Equipment Specification" },
      subtitle: { he: "כבאות והצלה • ענף חומ\"ס • אלמוג", en: "Fire & Rescue • HazMat Division" },
      items:    { he: "פריטים", en: "items" },
      measured: { he: "נמדדו", en: "measured" },
      photos:   { he: "צולמו", en: "photographed" },
      elec:     { he: "חשמליים", en: "electric" },
      printBtn: { he: "🖨️ הדפס / שמור PDF", en: "🖨️ Print / Save PDF" },
      col_id:    { he: "#", en: "#" },
      col_desc:  { he: "תיאור", en: "Description" },
      col_qty:   { he: "כמות", en: "Qty" },
      col_shape: { he: "צורה", en: "Shape" },
      col_dims:  { he: "מידות (cm)", en: "Dimensions (cm)" },
      col_wt:    { he: "משקל", en: "Weight" },
      col_elec:  { he: "⚡ חשמל", en: "⚡ Electric" },
      col_co:    { he: "חברה", en: "Company" },
      col_notes: { he: "הערות", en: "Notes" },
      footer:    { he: '© כבאות והצלה • ענף חומ"ס', en: "© Fire & Rescue • HazMat Division" },
      generated: { he: "נוצר ב-", en: "Generated on " },
    };
    const tr = (k: keyof typeof T) => T[k][lang as "he" | "en"];

    // Group by category
    const groups: Record<string, any[]> = {};
    rows.forEach((r: any) => {
      if (!groups[r.cat]) groups[r.cat] = [];
      groups[r.cat].push(r);
    });

    let itemsHtml = "";
    for (const [cat, items] of Object.entries(groups)) {
      const [he, en, color] = catNames[cat] || [cat, cat, "#666"];
      const catLabel = isEn ? en : he;
      itemsHtml += `<div class="cat-header" style="background:${color}">${catLabel} (${items.length})</div>`;
      itemsHtml += `<table><thead><tr>
        <th>${tr("col_id")}</th>
        <th>${tr("col_desc")}</th>
        <th>${tr("col_qty")}</th>
        <th>${tr("col_shape")}</th>
        <th>${tr("col_dims")}</th>
        <th>${tr("col_wt")}</th>
        <th>${tr("col_elec")}</th>
        <th>${tr("col_co")}</th>
        <th>${tr("col_notes")}</th>
      </tr></thead><tbody>`;
      
      for (const r of items) {
        const dims = [r.dim_l && `L:${r.dim_l}`, r.dim_w && `W:${r.dim_w}`, r.dim_h && `H:${r.dim_h}`, r.dim_d && `⌀:${r.dim_d}`].filter(Boolean).join(" × ") || "—";
        const electric = r.is_electric 
          ? ([r.voltage && `${r.voltage}V`, r.current && `${r.current}A`, r.power && `${r.power}W`].filter(Boolean).join(" / ") || "⚡")
          : "—";
        const shapeLbl = shapeNames[r.shape] ? shapeNames[r.shape][isEn ? 1 : 0] : "—";
        
        // Description: show primary language first, other as small text
        const primary = isEn ? (r.en || r.he || "") : (r.he || "");
        const secondary = isEn ? (r.he || "") : (r.en || "");
        
        itemsHtml += `<tr>
          <td class="center">${r.id}</td>
          <td><div class="primary">${primary}</div>${secondary ? `<div class="secondary">${secondary}</div>` : ""}</td>
          <td class="center">${r.qty || "—"}</td>
          <td class="center">${shapeLbl}</td>
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
    const date = new Date().toLocaleDateString(isEn ? "en-US" : "he-IL");

    const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${isEn ? "ltr" : "rtl"}">
<head>
<meta charset="UTF-8">
<title>${tr("title")} — ${date}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Heebo', sans-serif; color: #2D2D2D; padding: 20px; font-size: 11px; }
  @media print { body { padding: 0; } .no-print { display: none; } }
  
  .header { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 3px solid #C0272D; margin-bottom: 20px; }
  .header h1 { font-size: 22px; color: #C0272D; }
  .header .sub { font-size: 12px; color: #888; }
  .header .stats { text-align: ${isEn ? "right" : "left"}; direction: ltr; }
  .header .stat { display: inline-block; padding: 4px 12px; background: #f5f3ef; border-radius: 8px; margin: 2px; font-weight: 700; font-size: 11px; }
  
  .cat-header { color: white; font-weight: 900; font-size: 14px; padding: 8px 16px; border-radius: 8px; margin: 20px 0 8px; }
  
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
  th { background: #f8f7f4; padding: 6px 8px; text-align: ${isEn ? "left" : "right"}; font-weight: 800; border-bottom: 2px solid #e5e2dc; font-size: 10px; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0efeb; vertical-align: top; }
  tr:hover { background: #fafaf8; }
  .center { text-align: center; }
  .mono { font-family: monospace; font-size: 10px; direction: ltr; text-align: ${isEn ? "left" : "center"}; }
  .primary { font-weight: 700; font-size: 11px; line-height: 1.4; ${isEn ? "direction: ltr; text-align: left;" : ""} }
  .secondary { font-size: 9px; color: #999; ${isEn ? "" : "direction: ltr; text-align: left;"} }
  .small { font-size: 9px; color: #777; }
  .elec { background: #FFF3E0 !important; color: #E65100; font-weight: 700; }
  
  .footer { margin-top: 30px; padding-top: 12px; border-top: 2px solid #e5e2dc; display: flex; justify-content: space-between; font-size: 10px; color: #bbb; }
  
  .print-btn { position: fixed; bottom: 20px; ${isEn ? "right" : "left"}: 20px; padding: 14px 28px; background: #C0272D; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 100; font-family: 'Heebo', sans-serif; }
  .print-btn:hover { background: #8B1A1A; }
  .lang-toggle { position: fixed; bottom: 20px; ${isEn ? "left" : "right"}: 20px; padding: 14px 24px; background: #fff; color: #2D2D2D; border: 2px solid #E5E2DC; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; z-index: 100; font-family: 'Heebo', sans-serif; text-decoration: none; }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">${tr("printBtn")}</button>
<a href="?lang=${isEn ? "he" : "en"}" class="lang-toggle no-print">🌐 ${isEn ? "עברית" : "English"}</a>

<div class="header">
  <div>
    <h1>🚒 ${tr("title")}</h1>
    <div class="sub">${tr("subtitle")}</div>
  </div>
  <div class="stats">
    <div class="sub">${date}</div>
    <div><span class="stat">📦 ${totalItems} ${tr("items")}</span></div>
    <div><span class="stat">📐 ${measured} ${tr("measured")}</span> <span class="stat">📸 ${withPhotos} ${tr("photos")}</span></div>
    <div><span class="stat">⚡ ${electricComplete}/${electricItems} ${tr("elec")}</span></div>
  </div>
</div>

${itemsHtml}

<div class="footer">
  <span>${tr("footer")}</span>
  <span>${tr("generated")}${date} • hazmat-equipment-drab.vercel.app</span>
</div>

</body></html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
