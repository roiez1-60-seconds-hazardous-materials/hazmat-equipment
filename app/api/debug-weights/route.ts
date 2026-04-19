import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/debug-weights — Check all weights
export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT id, he, en, qty, wt, cat FROM equipment ORDER BY id ASC`;
    
    const items = rows.map((r: any) => {
      const qty = r.qty || 1;
      const unitWt = parseFloat(r.wt) || 0;
      const totalWt = unitWt * qty;
      return {
        id: r.id,
        name: r.he,
        cat: r.cat,
        qty,
        unit_kg: unitWt,
        total_kg: totalWt,
        suspicious: unitWt > 50 ? "HIGH" : unitWt > 0 && unitWt < 0.05 ? "LOW" : "",
      };
    });

    const withWeight = items.filter(i => i.unit_kg > 0);
    const grandTotal = items.reduce((s, i) => s + i.total_kg, 0);

    return NextResponse.json({
      grand_total_kg: grandTotal,
      items_with_weight: withWeight.length,
      items_without_weight: items.length - withWeight.length,
      suspicious: items.filter(i => i.suspicious),
      all: withWeight,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
