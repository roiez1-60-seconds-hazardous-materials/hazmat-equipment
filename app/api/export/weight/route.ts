import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/export/weight?lang=he|en
export async function GET(req: NextRequest) {
  try {
    const lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "he";
    const isEn = lang === "en";
    const sql = getDb();
    const rows = await sql`SELECT * FROM equipment ORDER BY id ASC`;

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
      title:      { he: "דו״ח משקל מפורט — מכולת חומ״ס", en: "Detailed Weight Report — HazMat Container" },
      subtitle:   { he: "כבאות והצלה • אלמוג", en: "Fire & Rescue • Almog" },
      printBtn:   { he: "🖨️ הדפס / שמור PDF", en: "🖨️ Print / Save PDF" },
      col_id:     { he: "#", en: "#" },
      col_item:   { he: "פריט", en: "Item" },
      col_qty:    { he: "כמות", en: "Qty" },
      col_unit_wt:{ he: "משקל יחידה (kg)", en: "Unit Weight (kg)" },
      col_total:  { he: "משקל כולל (kg)", en: "Total Weight (kg)" },
      subtotal:   { he: "סה״כ קטגוריה", en: "Category Subtotal" },
      grand:      { he: "סה״כ משקל מכולה", en: "Grand Total Weight" },
      noWt:       { he: "לא שוקלל", en: "Not weighed" },
      missing:    { he: "פריטים ללא משקל", en: "Items without weight" },
      footer:     { he: "© כבאות והצלה • ענף חומ\"ס", en: "© Fire & Rescue • HazMat Division" },
    };
    const tr = (k: keyof typeof T) => T[k][lang as "he"|"en"];

    // Group by category
    const groups: Record<string, any[]> = {};
    rows.forEach((r: any) => {
      if (!groups[r.cat]) groups[r.cat] = [];
      groups[r.cat].push(r);
    });

    let tableHtml = "";
    let grandTotal = 0;
    let missingItems: string[] = [];
    const catTotals: { name: string; color: string; total: number }[] = [];

    for (const [cat, items] of Object.entries(groups)) {
      const [he, en, color] = catNames[cat] || [cat, cat, "#666"];
      const catLabel = isEn ? en : he;
      let catTotal = 0;

      tableHtml += `<tr class="cat-row" style="background:${color}"><td colspan="5">${catLabel}</td></tr>`;

      for (const r of items) {
        const qty = r.qty || 1;
        const unitWt = parseFloat(r.wt) || 0;
        const totalWt = unitWt * qty;
        catTotal += totalWt;
        const name = isEn ? (r.en || r.he) : r.he;

        if (!unitWt) missingItems.push(`#${r.id} ${name}`);

        tableHtml += `<tr>
          <td class="center">${r.id}</td>
          <td>${name}</td>
          <td class="center">${qty}</td>
          <td class="center mono">${unitWt ? unitWt.toFixed(2) : `<span class="na">${tr("noWt")}</span>`}</td>
          <td class="center mono bold">${totalWt ? totalWt.toFixed(2) : "—"}</td>
        </tr>`;
      }

      tableHtml += `<tr class="subtotal"><td colspan="4" style="text-align:${isEn?"right":"left"}">${tr("subtotal")}: ${catLabel}</td><td class="center mono bold" style="color:${color}">${catTotal.toFixed(2)} kg</td></tr>`;
      grandTotal += catTotal;
      catTotals.push({ name: catLabel, color, total: catTotal });
    }

    const date = new Date().toLocaleDateString(isEn ? "en-US" : "he-IL");

    // Bar chart data for category breakdown
    const maxCat = Math.max(...catTotals.map(c => c.total), 1);
    let chartHtml = catTotals.map(c => 
      `<div style="display:flex;align-items:center;gap:8px;margin:4px 0">
        <span style="width:120px;font-size:10px;font-weight:700;text-align:${isEn?"left":"right"}">${c.name}</span>
        <div style="flex:1;background:#f0efeb;border-radius:4px;height:20px;overflow:hidden">
          <div style="width:${(c.total/maxCat*100).toFixed(0)}%;background:${c.color};height:100%;border-radius:4px;transition:width 0.5s"></div>
        </div>
        <span style="width:60px;font-size:11px;font-weight:800;font-family:monospace">${c.total.toFixed(1)}kg</span>
      </div>`
    ).join("");

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
  
  h1 { font-size: 20px; color: #C0272D; margin-bottom: 4px; }
  .sub { font-size: 11px; color: #888; margin-bottom: 16px; }
  
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f8f7f4; padding: 8px; text-align: ${isEn?"left":"right"}; font-weight: 800; border-bottom: 2px solid #e5e2dc; font-size: 11px; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0efeb; font-size: 11px; }
  .center { text-align: center; }
  .mono { font-family: monospace; }
  .bold { font-weight: 800; }
  .na { color: #ccc; font-size: 10px; }
  .cat-row td { color: white; font-weight: 900; font-size: 12px; padding: 6px 12px; }
  .subtotal { background: #fafaf8; }
  .subtotal td { font-weight: 700; border-top: 2px solid #e5e2dc; padding: 8px; }
  .grand { background: #C0272D; color: white; }
  .grand td { font-weight: 900; font-size: 14px; padding: 10px 12px; }
  
  .chart-box { padding: 16px; background: #fafaf8; border-radius: 12px; border: 1px solid #e5e2dc; margin-bottom: 20px; }
  .missing-box { padding: 12px 16px; background: #FFF3E0; border-radius: 10px; border: 1px solid #FFE0B2; margin-bottom: 20px; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #e5e2dc; display: flex; justify-content: space-between; font-size: 10px; color: #bbb; }
  
  .print-btn { position: fixed; bottom: 20px; ${isEn?"right":"left"}: 20px; padding: 12px 24px; background: #C0272D; color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 100; font-family: 'Heebo'; }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">${tr("printBtn")}</button>

<h1>⚖️ ${tr("title")}</h1>
<div class="sub">${tr("subtitle")} • ${date}</div>

<div class="chart-box">
  <h3 style="font-size:12px;margin-bottom:8px">${isEn?"Weight by Category":"משקל לפי קטגוריה"}</h3>
  ${chartHtml}
</div>

<table>
<thead><tr>
  <th>${tr("col_id")}</th>
  <th>${tr("col_item")}</th>
  <th>${tr("col_qty")}</th>
  <th>${tr("col_unit_wt")}</th>
  <th>${tr("col_total")}</th>
</tr></thead>
<tbody>
${tableHtml}
<tr class="grand"><td colspan="4" style="text-align:${isEn?"right":"left"}">${tr("grand")}</td><td class="center">${grandTotal.toFixed(2)} kg</td></tr>
</tbody>
</table>

${missingItems.length > 0 ? `<div class="missing-box"><strong>⚠️ ${tr("missing")} (${missingItems.length}):</strong><br><span style="font-size:10px;color:#E65100">${missingItems.join(" • ")}</span></div>` : ""}

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
