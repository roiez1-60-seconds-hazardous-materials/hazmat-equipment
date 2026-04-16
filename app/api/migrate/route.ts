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

    // Reset all to false first
    await sql`UPDATE equipment SET is_electric = false`;

    // Mark electrical items only — verified list:
    // 5=LED flashlights, 14=blower, 26=vacuum pump, 34=monitoring kit, 35=lighting,
    // 36=thermal cam, 37=weather station, 38=binoculars+laser, 39=air time system,
    // 41=tablet, 45=Karcher, 46=STEED, 47=compressor, 49=drone, 50=TV
    // REMOVED: 4 (air cylinder — not electric), 27 (metal extinguisher — powder), 40 (scene marking — chemsticks)
    await sql`UPDATE equipment SET is_electric = true WHERE id IN (
      5, 14, 26, 34, 35, 36, 37, 38, 39, 41, 45, 46, 47, 49, 50
    )`;

    // Auto-set HazMat suits to garment shape (items 1=Level A, 2=Level B)
    await sql`UPDATE equipment SET shape = 'garment' WHERE id IN (1, 2)`;
    
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
