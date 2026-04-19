import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/clear-thumbnails — Remove base64 photo data from DB (photos stay in Google Drive)
export async function GET() {
  try {
    const sql = getDb();
    
    // Count photos before
    const before = await sql`SELECT id, jsonb_array_length(photos) as count FROM equipment WHERE jsonb_array_length(photos) > 0`;
    const totalPhotos = before.reduce((s: number, r: any) => s + r.count, 0);
    
    // Clear all photo arrays (keep empty array, not null)
    await sql`UPDATE equipment SET photos = '[]'::jsonb WHERE jsonb_array_length(photos) > 0`;
    
    return NextResponse.json({
      status: "cleared",
      items_affected: before.length,
      photos_removed: totalPhotos,
      note: "Photos are still in Google Drive. Only DB thumbnails were removed.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
