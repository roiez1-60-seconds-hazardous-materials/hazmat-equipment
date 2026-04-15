import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// GET /api/items — fetch all equipment
export async function GET() {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .order("id", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map DB columns to frontend format
  const items = (data || []).map(row => ({
    id: row.id,
    cat: row.cat,
    he: row.he,
    en: row.en || "",
    qty: row.qty,
    st: row.st,
    notes: row.notes || "",
    co: row.co || "",
    dims: { l: row.dim_l || "", w: row.dim_w || "", h: row.dim_h || "", d: row.dim_d || "" },
    wt: row.wt || "",
    url: row.url || "",
    photos: row.photos || [],
    video: row.video,
    shape: row.shape || "box",
  }));

  return NextResponse.json(items);
}

// POST /api/items — create new item
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("equipment")
    .insert({
      cat: body.cat || "additional",
      he: body.he || "",
      en: body.en || "",
      qty: body.qty || null,
      st: body.st || "new",
      notes: body.notes || "",
      co: body.co || "",
      dim_l: body.dims?.l || "",
      dim_w: body.dims?.w || "",
      dim_h: body.dims?.h || "",
      dim_d: body.dims?.d || "",
      wt: body.wt || "",
      url: body.url || "",
      shape: body.shape || "box",
      photos: body.photos || [],
      video: body.video || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PUT /api/items — update item
export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getServiceClient();
  const updates: any = {};

  if (body.he !== undefined) updates.he = body.he;
  if (body.en !== undefined) updates.en = body.en;
  if (body.cat !== undefined) updates.cat = body.cat;
  if (body.qty !== undefined) updates.qty = body.qty;
  if (body.st !== undefined) updates.st = body.st;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.co !== undefined) updates.co = body.co;
  if (body.wt !== undefined) updates.wt = body.wt;
  if (body.url !== undefined) updates.url = body.url;
  if (body.shape !== undefined) updates.shape = body.shape;
  if (body.photos !== undefined) updates.photos = body.photos;
  if (body.video !== undefined) updates.video = body.video;
  if (body.dims) {
    if (body.dims.l !== undefined) updates.dim_l = body.dims.l;
    if (body.dims.w !== undefined) updates.dim_w = body.dims.w;
    if (body.dims.h !== undefined) updates.dim_h = body.dims.h;
    if (body.dims.d !== undefined) updates.dim_d = body.dims.d;
  }

  const { error } = await supabase
    .from("equipment")
    .update(updates)
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/items — delete item
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("equipment")
    .delete()
    .eq("id", parseInt(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
