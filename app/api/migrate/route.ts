import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/migrate — Add electrical specs columns (voltage, current)
export async function GET() {
  try {
    const sql = getDb();

    // Add columns if not exist
    await sql`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS voltage TEXT DEFAULT ''`;
    await sql`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS current TEXT DEFAULT ''`;
    await sql`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS power TEXT DEFAULT ''`;
    await sql`ALTER TABLE equipment ADD COLUMN IF NOT EXISTS is_electric BOOLEAN DEFAULT false`;

    // Mark electrical items automatically
    await sql`UPDATE equipment SET is_electric = true WHERE id IN (
      4, 5, 14, 26, 27, 34, 35, 36, 37, 38, 39, 40, 41, 45, 46, 47, 49, 50
    )`;
    
    // Count electric items
    const count = await sql`SELECT COUNT(*) as c FROM equipment WHERE is_electric = true`;

    return NextResponse.json({ 
      status: "migrated",
      columns_added: ["voltage", "current", "power", "is_electric"],
      electric_items: count[0].c,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
