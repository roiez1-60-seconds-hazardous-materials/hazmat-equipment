import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM equipment ORDER BY id ASC`;
    const items = rows.map((row: any) => ({
      id: row.id, cat: row.cat, he: row.he, en: row.en || "", qty: row.qty, st: row.st,
      notes: row.notes || "", co: row.co || "",
      dims: { l: row.dim_l || "", w: row.dim_w || "", h: row.dim_h || "", d: row.dim_d || "" },
      wt: row.wt || "", url: row.url || "", photos: row.photos || [], video: row.video, shape: row.shape || "box",
    }));
    return NextResponse.json(items);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const sql = getDb();
    const rows = await sql`
      INSERT INTO equipment (cat,he,en,qty,st,notes,co,dim_l,dim_w,dim_h,dim_d,wt,url,shape,photos,video)
      VALUES (${b.cat||"additional"},${b.he||""},${b.en||""},${b.qty||null},${b.st||"new"},${b.notes||""},${b.co||""},${b.dims?.l||""},${b.dims?.w||""},${b.dims?.h||""},${b.dims?.d||""},${b.wt||""},${b.url||""},${b.shape||"box"},${JSON.stringify(b.photos||[])}::jsonb,${b.video?JSON.stringify(b.video):null}::jsonb)
      RETURNING *`;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const sql = getDb();
    await sql`UPDATE equipment SET
      he=COALESCE(${b.he??null},he), en=COALESCE(${b.en??null},en), cat=COALESCE(${b.cat??null},cat),
      qty=${b.qty!==undefined?b.qty:null}, st=COALESCE(${b.st??null},st),
      notes=COALESCE(${b.notes??null},notes), co=COALESCE(${b.co??null},co),
      wt=COALESCE(${b.wt??null},wt), url=COALESCE(${b.url??null},url), shape=COALESCE(${b.shape??null},shape),
      dim_l=COALESCE(${b.dims?.l??null},dim_l), dim_w=COALESCE(${b.dims?.w??null},dim_w),
      dim_h=COALESCE(${b.dims?.h??null},dim_h), dim_d=COALESCE(${b.dims?.d??null},dim_d),
      photos=COALESCE(${b.photos?JSON.stringify(b.photos):null}::jsonb,photos),
      video=${b.video!==undefined?(b.video?JSON.stringify(b.video):null):null}::jsonb,
      updated_at=now()
      WHERE id=${b.id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const sql = getDb();
    await sql`DELETE FROM equipment WHERE id=${parseInt(id)}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
