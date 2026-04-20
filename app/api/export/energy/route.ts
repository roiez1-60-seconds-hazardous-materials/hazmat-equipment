import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/export/energy?lang=he|en
export async function GET(req: NextRequest) {
  try {
    const lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "he";
    const isEn = lang === "en";
    const sql = getDb();
    const rows = await sql`SELECT * FROM equipment WHERE is_electric = true ORDER BY id ASC`;

    const catNames: Record<string, [string, string, string]> = {
      protection:    ["ציוד מיגון",        "Protection",        "#C0272D"],
      stabilization: ["ציוד ייצוב",        "Stabilization",     "#1565C0"],
      containment:   ["ציוד הכלת אירוע",   "Containment",       "#E65100"],
      monitoring:    ["ציוד ניטור",         "Monitoring",        "#2E7D32"],
      command:       ["ציוד שליטה",         "Command & Control", "#0277BD"],
      washing:       ["ציוד שטיפה",         "Decon / Washing",   "#00838F"],
      additional:    ["ציוד נוסף",          "Additional",        "#6A1B9A"],
    };

    const T = {
      title:     { he: "דו״ח צרכני אנרגיה — מכולת חומ״ס", en: "Energy Consumers Report — HazMat Container" },
      subtitle:  { he: "כבאות והצלה • אלמוג", en: "Fire & Rescue • Almog" },
      printBtn:  { he: "🖨️ הדפס / שמור PDF", en: "🖨️ Print / Save PDF" },
      col_id:    { he: "#", en: "#" },
      col_item:  { he: "פריט", en: "Item" },
      col_cat:   { he: "קטגוריה", en: "Category" },
      col_qty:   { he: "כמות", en: "Qty" },
      col_v:     { he: "מתח (V)", en: "Voltage (V)" },
      col_a:     { he: "זרם (A)", en: "Current (A)" },
      col_w:     { he: "הספק יחידה (W)", en: "Unit Power (W)" },
      col_total: { he: "הספק כולל (W)", en: "Total Power (W)" },
      col_co:    { he: "חברה", en: "Company" },
      grand:     { he: "סה״כ הספק מקסימלי", en: "Maximum Total Power" },
      missing:   { he: "פריטים ללא נתוני אנרגיה", en: "Items missing energy data" },
      summary:   { he: "סיכום", en: "Summary" },
      consumers: { he: "צרכני אנרגיה", en: "Energy consumers" },
      complete:  { he: "עם נתונים מלאים", en: "with complete data" },
      footer:    { he: "© כבאות והצלה • ענף חומ\"ס", en: "© Fire & Rescue • HazMat Division" },
    };
    const tr = (k: keyof typeof T) => T[k][lang as "he"|"en"];

    let tableHtml = "";
    let grandTotalW = 0;
    let missingItems: string[] = [];
    let completeCount = 0;

    for (const r of rows) {
      const name = isEn ? (r.en || r.he) : r.he;
      const [he, en, color] = catNames[r.cat] || [r.cat, r.cat, "#666"];
      const catLabel = isEn ? en : he;
      const qty = r.qty || 1;
      const v = parseFloat(r.voltage) || 0;
      const a = parseFloat(r.current) || 0;
      let w = parseFloat(r.power) || 0;

      // Calculate power if missing
      if (!w && v && a) w = v * a;
      const totalW = w * qty;
      grandTotalW += totalW;

      const hasData = v > 0 && (a > 0 || w > 0);
      if (hasData) completeCount++;
      if (!hasData) missingItems.push(`#${r.id} ${name}`);

      tableHtml += `<tr${!hasData ? ' class="incomplete"' : ""}>
        <td class="center">${r.id}</td>
        <td><strong>${name}</strong></td>
        <td class="center"><span style="font-size:9px;color:${color};font-weight:700">${catLabel}</span></td>
        <td class="center">${qty}</td>
        <td class="center mono">${v ? v : '<span class="na">—</span>'}</td>
        <td class="center mono">${a ? a : '<span class="na">—</span>'}</td>
        <td class="center mono">${w ? w.toFixed(0) : '<span class="na">—</span>'}</td>
        <td class="center mono bold">${totalW ? totalW.toFixed(0) : "—"}</td>
        <td>${r.co || ""}</td>
      </tr>`;
    }

    const date = new Date().toLocaleDateString(isEn ? "en-US" : "he-IL");
    const totalAmps = grandTotalW / 230;

    const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${isEn?"ltr":"rtl"}">
<head>
<meta charset="UTF-8">
<title>${tr("title")} — ${date}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Heebo', sans-serif; color: #2D2D2D; padding: 20px; font-size: 11px; }
  @media print { body { padding: 10px; } .no-print { display: none; } }
  
  h1 { font-size: 20px; color: #E65100; margin-bottom: 4px; }
  .sub { font-size: 11px; color: #888; margin-bottom: 16px; }
  
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 20px; }
  .summary-card { padding: 14px; border-radius: 12px; text-align: center; }
  .summary-card .val { font-size: 22px; font-weight: 900; font-family: monospace; }
  .summary-card .lbl { font-size: 10px; font-weight: 700; margin-top: 4px; }
  
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #FFF3E0; padding: 8px; text-align: ${isEn?"left":"right"}; font-weight: 800; border-bottom: 2px solid #FFE0B2; font-size: 10px; color: #E65100; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0efeb; font-size: 11px; }
  .center { text-align: center; }
  .mono { font-family: monospace; }
  .bold { font-weight: 800; }
  .na { color: #ddd; }
  .incomplete { background: #FFFDE7; }
  .grand { background: #E65100; color: white; }
  .grand td { font-weight: 900; font-size: 13px; padding: 10px 12px; }
  
  .missing-box { padding: 12px 16px; background: #FFF3E0; border-radius: 10px; border: 1px solid #FFE0B2; margin-bottom: 20px; font-size: 11px; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #e5e2dc; display: flex; justify-content: space-between; font-size: 10px; color: #bbb; }
  
  .print-btn { position: fixed; bottom: 20px; ${isEn?"right":"left"}: 20px; padding: 12px 24px; background: #E65100; color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 100; font-family: 'Heebo'; }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">${tr("printBtn")}</button>

<h1>⚡ ${tr("title")}</h1>
<div class="sub">${tr("subtitle")} • ${date}</div>

<div class="summary-grid">
  <div class="summary-card" style="background:#FFF3E0;color:#E65100">
    <div class="val">${rows.length}</div>
    <div class="lbl">${tr("consumers")}</div>
  </div>
  <div class="summary-card" style="background:#E8F5E9;color:#2E7D32">
    <div class="val">${completeCount}/${rows.length}</div>
    <div class="lbl">${tr("complete")}</div>
  </div>
  <div class="summary-card" style="background:#FCE4EC;color:#C0272D">
    <div class="val">${(grandTotalW/1000).toFixed(1)} kW</div>
    <div class="lbl">${tr("grand")}</div>
  </div>
  <div class="summary-card" style="background:#E3F2FD;color:#1565C0">
    <div class="val">${totalAmps.toFixed(1)} A</div>
    <div class="lbl">${isEn?"@ 230V":"@ 230V"}</div>
  </div>
</div>

<table>
<thead><tr>
  <th>${tr("col_id")}</th>
  <th>${tr("col_item")}</th>
  <th>${tr("col_cat")}</th>
  <th>${tr("col_qty")}</th>
  <th>${tr("col_v")}</th>
  <th>${tr("col_a")}</th>
  <th>${tr("col_w")}</th>
  <th>${tr("col_total")}</th>
  <th>${tr("col_co")}</th>
</tr></thead>
<tbody>
${tableHtml}
<tr class="grand">
  <td colspan="7" style="text-align:${isEn?"right":"left"}">${tr("grand")}</td>
  <td class="center">${grandTotalW.toFixed(0)} W (${(grandTotalW/1000).toFixed(1)} kW)</td>
  <td></td>
</tr>
</tbody>
</table>

${missingItems.length > 0 ? `<div class="missing-box"><strong>⚠️ ${tr("missing")} (${missingItems.length}):</strong><br><span style="font-size:10px;color:#E65100">${missingItems.join(" • ")}</span></div>` : ""}

<div style="padding:14px;background:#fafaf8;border-radius:10px;border:1px solid #e5e2dc;margin-bottom:20px;font-size:11px">
  💡 ${isEn 
    ? `<strong>Planning note:</strong> Max simultaneous load is ${(grandTotalW/1000).toFixed(1)} kW (${totalAmps.toFixed(1)}A @ 230V). Actual load depends on usage pattern — not all equipment runs simultaneously.`
    : `<strong>הערת תכנון:</strong> עומס מקסימלי בו-זמני ${(grandTotalW/1000).toFixed(1)} kW (${totalAmps.toFixed(1)}A @ 230V). העומס בפועל תלוי בתבנית השימוש — לא כל הציוד פועל בו-זמנית.`}
</div>

<div class="footer">
  <span>${tr("footer")}</span>
  <span>hazmat-equipment-drab.vercel.app</span>
</div>

</body></html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
