import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Translate text from Hebrew to English via free Google Translate
async function translateText(text: string): Promise<string> {
  if (!text || !text.trim()) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=he&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    // Response format: [[["translated","original",null,null,10]],null,"he",...]
    return data?.[0]?.map((s: any) => s[0]).join("") || text;
  } catch {
    return text;
  }
}

// Batch translate array of Hebrew strings
async function translateAll(texts: string[]): Promise<string[]> {
  // Translate all in parallel (max ~50 items, each is fast)
  return Promise.all(texts.map(t => translateText(t)));
}

// Category display order
const CAT_ORDER = ["protection", "stabilization", "containment", "monitoring", "command", "washing", "additional"];

// GET /api/export/pdf?lang=he|en
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

    const shapeNames: Record<string, [string, string]> = {
      box: ["תיבה", "Box"], cylinder: ["גליל", "Cylinder"], sphere: ["כדורי", "Spherical"],
      long: ["ארוך וצר", "Long & Narrow"], garment: ["חליפה/תלוי", "Garment/Hanging"],
      bag: ["שק/תיק", "Bag"], irregular: ["לא סדיר", "Irregular"],
    };

    const statusNames: Record<string, [string, string]> = {
      existing: ["קיים", "Existing"], new: ["חדש", "New"],
    };

    // Full translations
    const T: Record<string, Record<string,string>> = {
      title:     { he: 'דו״ח אפיון ציוד מכולת חומ"ס', en: "HazMat Container Equipment Specification Report" },
      subtitle:  { he: "כבאות והצלה • ענף חומ\"ס • אלמוג", en: "Israel Fire & Rescue • HazMat Division • Almog" },
      printBtn:  { he: "🖨️ הדפס / שמור PDF", en: "🖨️ Print / Save PDF" },
      items:     { he: "פריטים", en: "Items" },
      measured:  { he: "נמדדו", en: "Measured" },
      photos:    { he: "צולמו", en: "Photographed" },
      elec:      { he: "חשמליים", en: "Electric" },
      totalWt:   { he: "משקל כולל", en: "Total Weight" },
      status:    { he: "סטטוס", en: "Status" },
      shape:     { he: "צורה", en: "Shape" },
      dims:      { he: "מידות", en: "Dimensions" },
      weight:    { he: "משקל", en: "Weight" },
      qty:       { he: "כמות", en: "Quantity" },
      company:   { he: "חברה / יצרן", en: "Manufacturer" },
      electric:  { he: "מפרט חשמלי", en: "Electrical Specs" },
      url:       { he: "קישור יצרן", en: "Manufacturer URL" },
      notes:     { he: "הערות", en: "Notes" },
      mediaFiles:{ he: "קבצי מדיה", en: "Media Files" },
      photosLbl: { he: "תמונות", en: "Photos" },
      videoLbl:  { he: "סרטון", en: "Video" },
      volume:    { he: "נפח", en: "Volume" },
      yes:       { he: "כן", en: "Yes" },
      no:        { he: "לא", en: "No" },
      none:      { he: "אין", en: "None" },
      footer:    { he: '© כבאות והצלה • ענף חומ"ס', en: "© Israel Fire & Rescue • HazMat Division" },
      generated: { he: "נוצר ב-", en: "Generated on " },
    };
    const tr = (k: string) => T[k]?.[lang] || k;

    // Calculate volume
    const calcVol = (r: any): string => {
      const l = parseFloat(r.dim_l) || 0;
      const w = parseFloat(r.dim_w) || 0;
      const h = parseFloat(r.dim_h) || 0;
      const d = parseFloat(r.dim_d) || 0;
      let vol = 0;
      if (r.shape === "sphere" && d) vol = (4/3) * Math.PI * Math.pow(d/2, 3);
      else if (r.shape === "cylinder" && d && h) vol = Math.PI * Math.pow(d/2, 2) * h;
      else if (r.shape === "long" && l && d) vol = Math.PI * Math.pow(d/2, 2) * l;
      else if (l && w && h) vol = l * w * h;
      if (vol > 0) return (vol / 1000).toFixed(1) + " L";
      return "—";
    };

    // Group by category
    const groups: Record<string, any[]> = {};
    rows.forEach((r: any) => { if (!groups[r.cat]) groups[r.cat] = []; groups[r.cat].push(r); });

    // Stats
    const totalItems = rows.length;
    const measured = rows.filter((r: any) => r.dim_l || r.dim_d).length;
    const withPhotos = rows.filter((r: any) => (r.photos || []).length > 0).length;
    const electricItems = rows.filter((r: any) => r.is_electric).length;
    const electricComplete = rows.filter((r: any) => r.is_electric && r.voltage && (r.current || r.power)).length;
    const totalWeight = rows.reduce((sum: number, r: any) => sum + (parseFloat(r.wt) || 0) * (r.qty || 1), 0);
    const date = new Date().toLocaleDateString(isEn ? "en-US" : "he-IL");

    // Auto-translate Hebrew texts for English report
    const translations: Record<number, { name: string; notes: string }> = {};
    if (isEn) {
      const toTranslate: { id: number; field: "name" | "notes"; text: string }[] = [];
      rows.forEach((r: any) => {
        if ((!r.en || !r.en.trim()) && r.he) toTranslate.push({ id: r.id, field: "name", text: r.he });
        if (r.notes && r.notes.trim()) toTranslate.push({ id: r.id, field: "notes", text: r.notes });
      });
      if (toTranslate.length > 0) {
        const translated = await translateAll(toTranslate.map(t => t.text));
        toTranslate.forEach((t, i) => {
          if (!translations[t.id]) translations[t.id] = { name: "", notes: "" };
          translations[t.id][t.field] = translated[i] || t.text;
        });
      }
    }

    // Build item cards — sorted by category order
    let itemsHtml = "";
    let itemNum = 0;
    for (const catKey of CAT_ORDER) {
      const items = groups[catKey];
      if (!items || !items.length) continue;
      const [he, en, color] = catNames[catKey] || [catKey, catKey, "#666"];
      const catLabel = isEn ? en : he;
      itemsHtml += `<div class="cat-header" style="background:${color}">${catLabel} (${items.length})</div>`;

      for (const r of items) {
        const trans = translations[r.id];
        const name = isEn ? (r.en || trans?.name || r.he || "") : (r.he || "");
        const nameSec = isEn ? "" : (r.en || "");
        const notesText = isEn ? (trans?.notes || r.notes || "") : (r.notes || "");
        const shapeLbl = shapeNames[r.shape] ? shapeNames[r.shape][isEn ? 1 : 0] : "—";
        const statusLbl = statusNames[r.st] ? statusNames[r.st][isEn ? 1 : 0] : r.st;
        const dims = [r.dim_l && `L: ${r.dim_l}`, r.dim_w && `W: ${r.dim_w}`, r.dim_h && `H: ${r.dim_h}`, r.dim_d && `⌀: ${r.dim_d}`].filter(Boolean).join(" × ") || "—";
        const vol = calcVol(r);
        const photoCount = (r.photos || []).length;
        const hasVideo = !!r.video;

        let elecHtml = "";
        if (r.is_electric) {
          const v = parseFloat(r.voltage) || 0;
          const a = parseFloat(r.current) || 0;
          let w = parseFloat(r.power) || 0;
          if (!w && v && a) w = v * a;
          const qty = r.qty || 1;
          const parts = [r.voltage && `${r.voltage}V`, r.current && `${r.current}A`, w ? `${w.toFixed(0)}W` : ""].filter(Boolean).join(" / ");
          const totalLabel = isEn ? "Total" : "כולל";
          const totalPart = qty > 1 && w ? ` → <strong style="color:#C0272D">${totalLabel}: ${(w * qty).toFixed(0)}W (${(w * qty / 1000).toFixed(1)}kW)</strong>` : "";
          elecHtml = `<div class="field elec-field"><span class="field-label">⚡ ${tr("electric")}</span><span class="field-value">${parts || "—"}${totalPart}</span></div>`;
        }

          const unitWt = parseFloat(r.wt) || 0;
          const qty = r.qty || 1;
          const totalWt = unitWt * qty;
          const wtLabel = isEn ? "Unit Weight" : "משקל יחידה";
          const totalWtLabel = isEn ? "Total Weight" : "משקל כולל";

          itemsHtml += `
        <div class="item-card">
          <div class="item-header">
            <span class="item-id" style="background:${color}">${++itemNum}</span>
            <div class="item-title">
              <div class="item-name">${name}</div>
              ${nameSec ? `<div class="item-name-sec">${nameSec}</div>` : ""}
            </div>
            <span class="item-status ${r.st}">${statusLbl}</span>
          </div>
          <div class="fields-grid">
            <div class="field"><span class="field-label">📐 ${tr("shape")}</span><span class="field-value">${shapeLbl}</span></div>
            <div class="field"><span class="field-label">📏 ${tr("dims")} (cm)</span><span class="field-value mono">${dims}</span></div>
            <div class="field"><span class="field-label">📦 ${tr("volume")}</span><span class="field-value mono">${vol}</span></div>
            <div class="field"><span class="field-label">⚖️ ${wtLabel}</span><span class="field-value mono">${unitWt ? unitWt + " kg" : "—"}</span></div>
            <div class="field"><span class="field-label">🔢 ${tr("qty")}</span><span class="field-value">${qty}</span></div>
            <div class="field" style="${qty > 1 && unitWt ? 'background:#E8F5E9' : ''}"><span class="field-label">⚖️ ${totalWtLabel}</span><span class="field-value mono" style="${qty > 1 && unitWt ? 'color:#2E7D32;font-size:20px' : ''}">${unitWt ? totalWt.toFixed(1) + " kg" : "—"}</span></div>
            <div class="field"><span class="field-label">🏭 ${tr("company")}</span><span class="field-value">${r.co || "—"}</span></div>
            ${elecHtml}
            <div class="field"><span class="field-label">📸 ${tr("photosLbl")}</span><span class="field-value">${photoCount > 0 ? photoCount : "—"}</span></div>
            <div class="field"><span class="field-label">🎬 ${tr("videoLbl")}</span><span class="field-value">${hasVideo ? "✅" : "—"}</span></div>
          </div>
          ${r.url ? `<div class="item-url"><span class="field-label">🔗 ${tr("url")}</span><a href="${r.url}" target="_blank">${r.url}</a></div>` : ""}
          ${notesText ? `<div class="item-notes"><span class="field-label">📝 ${tr("notes")}</span><span>${notesText}</span></div>` : ""}
        </div>`;
      }
    }

    const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${isEn ? "ltr" : "rtl"}">
<head>
<meta charset="UTF-8">
<title>${tr("title")} — ${date}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Heebo', sans-serif; color: #2D2D2D; padding: 24px; font-size: 16px; line-height: 1.6; }
  @media print { body { padding: 12px; } .no-print { display: none; } .item-card { break-inside: avoid; } }

  .header { display: flex; justify-content: space-between; align-items: center; padding: 24px 0; border-bottom: 4px solid #C0272D; margin-bottom: 28px; }
  .header h1 { font-size: 32px; color: #C0272D; line-height: 1.3; }
  .header .sub { font-size: 16px; color: #888; margin-top: 6px; }
  .header .stats { text-align: ${isEn ? "right" : "left"}; }
  .header .stat { display: inline-block; padding: 8px 16px; background: #f5f3ef; border-radius: 10px; margin: 3px; font-weight: 700; font-size: 15px; }

  .cat-header { color: white; font-weight: 900; font-size: 22px; padding: 12px 24px; border-radius: 12px; margin: 32px 0 16px; }

  .item-card { border: 2px solid #e5e2dc; border-radius: 16px; margin-bottom: 16px; overflow: hidden; }
  .item-header { display: flex; align-items: center; gap: 14px; padding: 16px 20px; background: #fafaf8; border-bottom: 1px solid #e5e2dc; }
  .item-id { width: 44px; height: 44px; border-radius: 12px; color: white; font-weight: 900; font-size: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .item-title { flex: 1; min-width: 0; }
  .item-name { font-size: 20px; font-weight: 900; line-height: 1.3; }
  .item-name-sec { font-size: 14px; color: #999; margin-top: 2px; ${isEn ? "" : "direction: ltr; text-align: left;"} }
  .item-status { font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 8px; flex-shrink: 0; }
  .item-status.existing { background: #E8F5E9; color: #2E7D32; }
  .item-status.new { background: #FEF3C7; color: #92400E; }

  .fields-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0; padding: 0; }
  .field { padding: 12px 20px; border-bottom: 1px solid #f0efeb; display: flex; flex-direction: column; gap: 3px; }
  .field-label { font-size: 13px; font-weight: 700; color: #999; }
  .field-value { font-size: 18px; font-weight: 700; }
  .elec-field { background: #FFF8E1; }
  .mono { font-family: monospace; direction: ltr; }

  .item-url { padding: 10px 20px; border-bottom: 1px solid #f0efeb; font-size: 14px; display: flex; gap: 10px; align-items: center; }
  .item-url a { color: #1565C0; text-decoration: none; word-break: break-all; font-size: 13px; }
  .item-notes { padding: 12px 20px; font-size: 15px; color: #666; display: flex; gap: 10px; align-items: flex-start; }

  .footer { margin-top: 36px; padding-top: 16px; border-top: 3px solid #e5e2dc; display: flex; justify-content: space-between; font-size: 14px; color: #bbb; }

  .print-btn { position: fixed; bottom: 20px; ${isEn ? "right" : "left"}: 20px; padding: 14px 28px; background: #C0272D; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 100; font-family: 'Heebo'; }
  .lang-toggle { position: fixed; bottom: 20px; ${isEn ? "left" : "right"}: 20px; padding: 14px 24px; background: #fff; color: #2D2D2D; border: 2px solid #E5E2DC; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; z-index: 100; font-family: 'Heebo'; text-decoration: none; }
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
    <div class="sub" style="font-size:13px;font-weight:700">${date}</div>
    <div><span class="stat">📦 ${totalItems} ${tr("items")}</span></div>
    <div><span class="stat">📐 ${measured} ${tr("measured")}</span> <span class="stat">📸 ${withPhotos} ${tr("photos")}</span></div>
    <div><span class="stat">⚡ ${electricComplete}/${electricItems} ${tr("elec")}</span></div>
    <div><span class="stat">⚖️ ${tr("totalWt")}: ${totalWeight.toFixed(1)} kg</span></div>
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
