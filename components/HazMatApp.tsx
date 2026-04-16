"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import {
  EquipmentItem, CATEGORIES, SHAPES, DIM_LABELS, PHOTO_ANGLES,
  calcCompletion, calcVolume, Category, Shape,
} from "@/lib/types";

interface Props {
  items: EquipmentItem[];
  onSave: (id: number, updates: Partial<EquipmentItem>) => void;
  onAdd: () => Promise<EquipmentItem>;
  onDelete: (id: number) => void;
}

// ─── PROGRESS RING ───
function Ring({ value, size = 48, color = "#C0272D" }: { value: number; size?: number; color?: string }) {
  const s = 4, r = (size - s) / 2, circ = 2 * Math.PI * r, off = circ - (value / 100) * circ;
  const done = value === 100;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eee" strokeWidth={s} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={done ? "#2E7D32" : color} strokeWidth={s}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: size < 42 ? 9 : 11, fontWeight: 900, fill: done ? "#2E7D32" : "#555", transform: "rotate(90deg)", transformOrigin: "center" }}>{value}%</text>
    </svg>
  );
}

// ─── 3D SHAPE VIEWER ───
function ShapeViewer({ dims, shape }: { dims: EquipmentItem["dims"]; shape: Shape }) {
  const ref = useRef<HTMLDivElement>(null);
  const D = parseFloat(dims.d) || 0;
  const L = parseFloat(dims.l) || 30, W = parseFloat(dims.w) || 20, H = parseFloat(dims.h) || 15;

  let eL: number, eW: number, eH: number;
  if (shape === "sphere") { eL = eW = eH = D || 30; }
  else if (shape === "cylinder") { eL = eW = D || 30; eH = H || 30; }
  else if (shape === "long") { eL = L || 60; eW = eH = D || 10; }
  else { eL = L; eW = W; eH = H; }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const width = el.clientWidth, height = 240;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFAFAF8);
    const cam = new THREE.PerspectiveCamera(38, width / height, 0.1, 2000);
    const mx = Math.max(eL, eW, eH);
    cam.position.set(mx * 2.2, mx * 1.5, mx * 2.2);
    cam.lookAt(0, 0, 0);
    const rnd = new THREE.WebGLRenderer({ antialias: true });
    rnd.setSize(width, height);
    rnd.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(rnd.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dl = new THREE.DirectionalLight(0xffffff, 0.7);
    dl.position.set(50, 80, 60); scene.add(dl);
    const grid = new THREE.GridHelper(mx * 3, 16, 0xd5d3ce, 0xe8e6e1);
    grid.position.y = -eH / 2; scene.add(grid);

    let geo: THREE.BufferGeometry;
    if (shape === "sphere") geo = new THREE.SphereGeometry(eL / 2, 24, 18);
    else if (shape === "cylinder") geo = new THREE.CylinderGeometry(eL / 2, eL / 2, eH, 24);
    else if (shape === "long") { geo = new THREE.CylinderGeometry(eW / 2, eW / 2, eL, 16); geo.rotateZ(Math.PI / 2); }
    else if (shape === "garment") geo = new THREE.BoxGeometry(eL, eH, Math.min(eW, 8)); // Flat hanging shape — depth limited
    else if (shape === "bag") { geo = new THREE.SphereGeometry(Math.max(eL, eW, eH) / 2, 16, 12); geo.scale(eL / Math.max(eL, eW, eH), eH / Math.max(eL, eW, eH), eW / Math.max(eL, eW, eH)); }
    else geo = new THREE.BoxGeometry(eL, eH, eW);

    scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xC0272D })));
    scene.add(new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xC0272D, transparent: true, opacity: 0.06, side: THREE.DoubleSide })));

    const pad = mx * 0.15;
    const addLine = (start: number[], end: number[], color: number) => {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...start as [number, number, number]), new THREE.Vector3(...end as [number, number, number])]);
      scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color })));
      const sg = new THREE.SphereGeometry(mx * 0.015, 8, 8);
      [start, end].forEach(p => { const m = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color })); m.position.set(p[0], p[1], p[2]); scene.add(m); });
    };
    addLine([-eL / 2, -eH / 2, eW / 2 + pad], [eL / 2, -eH / 2, eW / 2 + pad], 0xC0272D);
    addLine([eL / 2 + pad, -eH / 2, -eW / 2], [eL / 2 + pad, -eH / 2, eW / 2], 0x1565C0);
    addLine([eL / 2 + pad, -eH / 2, -eW / 2 - pad], [eL / 2 + pad, eH / 2, -eW / 2 - pad], 0x2E7D32);

    const rot = { x: 0.35, y: 0.7 };
    let down = false, lx = 0, ly = 0, anim: number;
    const loop = () => { anim = requestAnimationFrame(loop); if (!down) rot.y += 0.003; scene.rotation.x = rot.x; scene.rotation.y = rot.y; rnd.render(scene, cam); };
    loop();

    const md = (cx: number, cy: number) => { down = true; lx = cx; ly = cy; };
    const mm = (cx: number, cy: number) => { if (!down) return; rot.y += (cx - lx) * 0.006; rot.x = Math.max(-1, Math.min(1, rot.x + (cy - ly) * 0.006)); lx = cx; ly = cy; };
    const mu = () => { down = false; };
    el.onmousedown = e => md(e.clientX, e.clientY);
    el.onmousemove = e => mm(e.clientX, e.clientY);
    el.onmouseup = mu; el.onmouseleave = mu;
    el.ontouchstart = e => md(e.touches[0].clientX, e.touches[0].clientY);
    el.ontouchmove = e => { e.preventDefault(); mm(e.touches[0].clientX, e.touches[0].clientY); };
    el.ontouchend = mu;

    return () => { cancelAnimationFrame(anim); rnd.dispose(); if (el.contains(rnd.domElement)) el.removeChild(rnd.domElement); };
  }, [eL, eW, eH, shape]);

  const vol = calcVolume({ dims, shape } as EquipmentItem);
  const dimTags = shape === "sphere" ? [["⌀", dims.d, "#E65100"]]
    : shape === "cylinder" ? [["⌀", dims.d, "#E65100"], ["H", dims.h, "#2E7D32"]]
    : shape === "long" ? [["L", dims.l, "#C0272D"], ["⌀", dims.d, "#E65100"]]
    : [["L", dims.l, "#C0272D"], ["W", dims.w, "#1565C0"], ["H", dims.h, "#2E7D32"]];

  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "2px solid #e5e2dc", background: "#FAFAF8" }}>
      <div ref={ref} style={{ width: "100%", height: 240, cursor: "grab" }} />
      <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, display: "flex", gap: 5, flexWrap: "wrap", pointerEvents: "none" }}>
        {dimTags.map(([l, v, c]) => (
          <span key={l as string} style={{ fontSize: 11, fontWeight: 800, color: c as string, background: "rgba(255,255,255,0.92)", padding: "2px 8px", borderRadius: 14 }}>{l}:{v}cm</span>
        ))}
        {vol !== null && <span style={{ fontSize: 11, color: "#888", background: "rgba(255,255,255,0.85)", padding: "2px 8px", borderRadius: 14, marginInlineStart: "auto" }}>📦{vol.toFixed(1)}L</span>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════
export default function HazMatApp({ items, onSave, onAdd, onDelete }: Props) {
  const [tab, setTab] = useState("dash");
  const [edit, setEdit] = useState<EquipmentItem | null>(null);
  const [lang, setLang] = useState("he");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [admin, setAdmin] = useState(false);
  const [delModal, setDelModal] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [showPwDialog, setShowPwDialog] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<any[]>([]);

  // Keep photosRef in sync with edit.photos
  useEffect(() => {
    if (edit) photosRef.current = edit.photos;
  }, [edit?.photos]);

  const t = (he: string, en: string) => lang === "he" ? he : en;

  // Cache folder IDs so we don't create duplicates
  const folderCache = useRef<Record<number, string>>({});

  // Upload file DIRECTLY from browser to Google Drive
  const uploadToDrive = async (file: File, itemId: number, itemName: string, type: "photo" | "video") => {
    setUploading(true);
    setUploadMsg(t("מעלה ל-Google Drive...", "Uploading to Drive..."));
    try {
      // 1. Get temporary access token from server
      const tokenRes = await fetch("/api/token");
      const tokenData = await tokenRes.json();
      if (tokenData.error || !tokenData.access_token) throw new Error(tokenData.error || "No token");
      const token = tokenData.access_token;
      const parentFolderId = tokenData.folder_id;

      // 2. Find or create subfolder (cached)
      let subFolderId = folderCache.current[itemId];
      
      if (!subFolderId) {
        // Search for existing folder
        const prefix = String(itemId).padStart(2, "0") + " —";
        const searchQ = encodeURIComponent(`'${parentFolderId}' in parents and name contains '${prefix}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${searchQ}&fields=files(id,name)`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const searchData = await searchRes.json();

        if (searchData.files && searchData.files.length > 0) {
          subFolderId = searchData.files[0].id;
        } else {
          // Create new folder
          const folderName = `${String(itemId).padStart(2, "0")} — ${itemName.substring(0, 50)}`;
          const folderRes = await fetch("https://www.googleapis.com/drive/v3/files", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ name: folderName, mimeType: "application/vnd.google-apps.folder", parents: [parentFolderId] }),
          });
          const folderData = await folderRes.json();
          if (folderData.error) throw new Error(folderData.error.message || "Folder creation failed");
          subFolderId = folderData.id;
        }
        
        // Cache it
        folderCache.current[itemId] = subFolderId;
      }

      // 3. Upload file directly to Drive
      const fileName = `${type}_${Date.now()}.${file.name.split(".").pop() || "bin"}`;
      const metadata = new Blob([JSON.stringify({ name: fileName, parents: [subFolderId] })], { type: "application/json" });
      const form = new FormData();
      form.append("metadata", metadata);
      form.append("file", file);

      const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const uploadData = await uploadRes.json();
      if (uploadData.error) throw new Error(uploadData.error.message || JSON.stringify(uploadData.error));

      // 4. Make file public
      await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      });

      setUploadMsg(`✅ ${t("הועלה ל-Drive!", "Uploaded!")} (${(file.size/1024/1024).toFixed(1)}MB)`);
      setTimeout(() => setUploadMsg(""), 3000);
      setUploading(false);
      return { ok: true, fileId: uploadData.id, folderId: subFolderId };
    } catch (err: any) {
      setUploadMsg("❌ " + (err.message || "Upload failed"));
      setTimeout(() => setUploadMsg(""), 5000);
      setUploading(false);
      return { error: err.message };
    }
  };

  useEffect(() => { window.scrollTo({ top: 0 }); }, [tab]);

  const shown = items.filter(i => {
    if (filter !== "all" && i.cat !== filter) return false;
    if (q) { const s = q.toLowerCase(); return i.he.includes(s) || (i.en || "").toLowerCase().includes(s) || (i.co || "").toLowerCase().includes(s); }
    return true;
  });

  const stats = useMemo(() => ({
    total: items.length,
    done: items.filter(i => calcCompletion(i) === 100).length,
    meas: items.filter(i => { const shp = SHAPES.find(s => s.id === i.shape) || SHAPES[0]; return shp.fields.every(fld => (i.dims as any)[fld]); }).length,
    pics: items.filter(i => i.photos.length > 0).length,
    avg: items.length ? Math.round(items.reduce((s, i) => s + calcCompletion(i), 0) / items.length) : 0,
  }), [items]);

  const openItem = (item: EquipmentItem) => { setEdit({ ...item }); setTab("detail"); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const handleAdd = async () => {
    const ni = await onAdd();
    openItem(ni);
  };

  // Debounced save — updates DB after 500ms of no typing
  const saveTimer = useRef<any>(null);
  const debouncedSave = (id: number, updates: Partial<EquipmentItem>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSave(id, updates), 500);
  };

  const sv = (field: string, value: any) => {
    setEdit(prev => {
      if (!prev) return prev;
      debouncedSave(prev.id, { [field]: value });
      return { ...prev, [field]: value };
    });
  };

  const svD = (axis: string, value: string) => {
    setEdit(prev => {
      if (!prev) return prev;
      const d = { ...prev.dims, [axis]: value };
      debouncedSave(prev.id, { dims: d });
      return { ...prev, dims: d };
    });
  };

  // Save photos/video immediately (not debounced)
  const svNow = (field: string, value: any) => {
    setEdit(prev => {
      if (!prev) return prev;
      onSave(prev.id, { [field]: value });
      return { ...prev, [field]: value };
    });
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!edit) return;
    const editId = edit.id;
    const editHe = edit.he;
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new window.Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          const TH = 400;
          let w = img.width, h = img.height;
          if (w > TH || h > TH) { const s = TH / Math.max(w, h); w *= s; h *= s; }
          c.width = w; c.height = h;
          c.getContext("2d")!.drawImage(img, 0, 0, w, h);
          const dataUrl = c.toDataURL("image/jpeg", 0.70);

          // Add thumbnail to state immediately
          setEdit(prev => {
            if (!prev) return prev;
            const updated = [...prev.photos, { dataUrl, name: file.name, driveId: "" }];
            onSave(prev.id, { photos: updated });
            return { ...prev, photos: updated };
          });

          // Silent Drive upload — ZERO state updates, ZERO re-renders
          (async () => {
            try {
              if (!folderCache.current[editId]) {
                const fRes = await fetch(`/api/folder?itemId=${editId}&itemName=${encodeURIComponent(editHe)}`);
                const fData = await fRes.json();
                if (fData.folderId) folderCache.current[editId] = fData.folderId;
              }
              if (folderCache.current[editId]) {
                const fd = new FormData();
                fd.append("file", file);
                fd.append("folderId", folderCache.current[editId]);
                fd.append("type", "photo");
                await fetch("/api/upload", { method: "POST", body: fd });
              }
            } catch (err) {
              console.error("Drive upload failed:", err);
            }
          })();
        };
        img.src = ev.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // ═══ DASHBOARD ═══
  const Dash = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 12 }}>
        {[
          { e: "📦", l: t("סה״כ", "Total"), v: stats.total, c: "#C0272D" },
          { e: "✅", l: t("הושלמו", "Done"), v: stats.done, c: "#2E7D32" },
          { e: "📐", l: t("נמדדו", "Measured"), v: stats.meas, c: "#1565C0" },
          { e: "📸", l: t("צולמו", "Photos"), v: stats.pics, c: "#E65100" },
          { e: "📊", l: t("השלמה", "Avg%"), v: `${stats.avg}%`, c: "#6A1B9A" },
        ].map((s, i) => (
          <div key={i} style={{ padding: 18, borderRadius: 14, border: "2px solid #ECEAE4", background: "#fff" }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{s.e}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#999" }}>{s.l}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Category progress */}
      <div className="sec" style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>{t("התקדמות לפי קטגוריה", "Progress by Category")}</div>
        {Object.entries(CATEGORIES).map(([k, c]) => {
          const ci = items.filter(i => i.cat === k);
          const avg = ci.length ? Math.round(ci.reduce((s, i) => s + calcCompletion(i), 0) / ci.length) : 0;
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{c.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#555", width: 80 }}>{c[lang as "he" | "en"]}</span>
              <div style={{ flex: 1, height: 8, background: "#f0efeb", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 4, width: `${avg}%`, background: c.color, transition: "width 0.8s" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 900, width: 40, textAlign: "left" as const, color: c.color }}>{avg}%</span>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("🔍 חיפוש...", "🔍 Search...")}
          className="inp" style={{ flex: 1, minWidth: 180 }} />
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={{
            padding: "7px 14px", borderRadius: 10, border: "2px solid", fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: filter === "all" ? "#2D2D2D" : "#fff", color: filter === "all" ? "#fff" : "#777", borderColor: filter === "all" ? "#2D2D2D" : "#E5E2DC",
          }}>{t("הכל", "All")}</button>
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: "7px 12px", borderRadius: 10, border: "2px solid", fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: filter === k ? c.color : "#fff", color: filter === k ? "#fff" : c.color, borderColor: filter === k ? c.color : "#E5E2DC",
            }}>{c.emoji} {c[lang as "he" | "en"]}</button>
          ))}
        </div>
      </div>

      {/* Items grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 12 }}>
        {shown.map(item => {
          const p = calcCompletion(item), c = CATEGORIES[item.cat];
          return (
            <div key={item.id} className="card" onClick={() => openItem(item)} style={{ position: "relative" }}>
              {admin && <button style={{ position: "absolute", top: 8, left: 8, zIndex: 5, width: 30, height: 30, borderRadius: "50%", background: "#fee2e2", border: "2px solid #fca5a5", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14 }}
                onClick={e => { e.stopPropagation(); setDelModal(item.id); }}>🗑️</button>}
              <div style={{ height: 4, background: `linear-gradient(90deg, ${c.color}, ${c.color}88)` }} />
              <div style={{ padding: 16, display: "flex", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: c.color, flexShrink: 0 }}>{item.id}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.color }}>{c.emoji} {c[lang as "he" | "en"]}</span>
                    {item.st === "new" && <span className="tag" style={{ background: "#FEF3C7", color: "#92400E" }}>✨ {t("חדש", "New")}</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, color: "#2D2D2D", marginBottom: 6 }}>{lang === "en" && item.en ? item.en : item.he}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {item.is_electric && <span className="tag" style={{ background: "#FFF3E0", color: "#E65100" }}>⚡ {item.voltage ? `${item.voltage}V` : t("חשמלי", "Electric")}</span>}
                    {item.qty && <span className="tag" style={{ background: "#f5f5f0", color: "#666" }}>×{item.qty}</span>}
                    {item.wt && <span className="tag" style={{ background: "#E8F5E9", color: "#2E7D32" }}>{item.wt}kg</span>}
                    {item.co && <span className="tag" style={{ background: "#F3E5F5", color: "#6A1B9A" }}>{item.co}</span>}
                  </div>
                </div>
                <Ring value={p} size={44} color={c.color} />
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={handleAdd} style={{
        width: "100%", padding: 20, borderRadius: 16, border: "3px dashed #d5d2cc",
        background: "transparent", color: "#999", fontSize: 14, fontWeight: 700,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>➕ {t("הוסף פריט חדש", "Add New Item")}</button>
    </div>
  );

  // ═══ DETAIL ═══
  const Detail = () => {
    if (!edit) return <div style={{ textAlign: "center", padding: 80, color: "#bbb" }}><div style={{ fontSize: 48 }}>📋</div><p>{t("בחר פריט", "Select item")}</p></div>;
    const c = CATEGORIES[edit.cat], p = calcCompletion(edit);
    const shp = SHAPES.find(s => s.id === edit.shape) || SHAPES[0];
    const dimsOk = shp.fields.every(fld => (edit.dims as any)[fld]);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Sticky Header */}
        <div style={{ 
          position: "sticky", 
          top: 100, 
          zIndex: 30,
          background: "rgba(250,250,248,0.97)", 
          backdropFilter: "blur(12px)", 
          marginInline: -16,
          marginTop: -20,
          paddingInline: 16, 
          paddingBlock: 10,
          borderBottom: "2px solid #ECEAE4",
          display: "flex", 
          alignItems: "center", 
          gap: 10,
        }}>
          <button onClick={() => { setTab("dash"); setEdit(null); }} style={{ padding: "6px 10px", borderRadius: 10, background: "#fff", border: "2px solid #E5E2DC", cursor: "pointer", fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{lang === "he" ? "→" : "←"}</button>
          <Ring value={p} size={40} color={c.color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2, flexWrap: "wrap" }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: c.bg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: c.color, flexShrink: 0 }}>{edit.id}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: c.color, background: c.bg, padding: "2px 6px", borderRadius: 6 }}>{c.emoji} {c[lang as "he" | "en"]}</span>
              {edit.is_electric && <span style={{ fontSize: 10, fontWeight: 700, color: "#E65100", background: "#FFF3E0", padding: "2px 6px", borderRadius: 6 }}>⚡</span>}
              {edit.st === "new" && <span style={{ fontSize: 10, fontWeight: 700, color: "#92400E", background: "#FEF3C7", padding: "2px 6px", borderRadius: 6 }}>✨</span>}
            </div>
            <h2 style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{lang === "en" && edit.en ? edit.en : (edit.he || t("פריט חדש", "New Item"))}</h2>
          </div>
        </div>

        {/* Details */}
        <div className="sec">
          <div style={{ padding: "14px 18px", borderBottom: "2px solid #f5f3ef" }}><h3 style={{ fontSize: 14, fontWeight: 800 }}>📝 {t("פרטי הפריט", "Item Details")}</h3></div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label className="lbl">{t("תיאור עברית *", "Hebrew *")}</label><textarea value={edit.he} onChange={e => sv("he", e.target.value)} rows={3} className="inp" style={{ resize: "vertical" }} /></div>
            <div><label className="lbl">{t("תיאור אנגלית", "English")}</label><textarea value={edit.en || ""} onChange={e => sv("en", e.target.value)} rows={2} className="inp" style={{ resize: "vertical", direction: "ltr", textAlign: "left" as const }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label className="lbl">{t("סטטוס", "Status")}</label><select value={edit.st} onChange={e => sv("st", e.target.value)} className="inp"><option value="existing">📌 {t("קיים", "Existing")}</option><option value="new">✨ {t("חדש", "New")}</option></select></div>
              <div><label className="lbl">{t("קטגוריה", "Category")}</label><select value={edit.cat} onChange={e => sv("cat", e.target.value)} className="inp">{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v[lang as "he" | "en"]}</option>)}</select></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label className="lbl">{t("כמות", "Qty")}</label><input type="number" value={edit.qty || ""} onChange={e => sv("qty", e.target.value ? parseInt(e.target.value) : null)} className="inp" style={{ textAlign: "center" }} /></div>
              <div><label className="lbl">{t("שם חברה", "Company")}</label><input value={edit.co || ""} onChange={e => sv("co", e.target.value)} className="inp" /></div>
            </div>
            <div><label className="lbl">{t("קישור יצרן", "URL")}</label><div style={{ display: "flex", gap: 8 }}><input type="url" value={edit.url || ""} onChange={e => sv("url", e.target.value)} className="inp" style={{ flex: 1, direction: "ltr", textAlign: "left" as const }} placeholder="https://" />{edit.url && <a href={edit.url} target="_blank" rel="noopener noreferrer" style={{ padding: 10, borderRadius: 12, background: "#E3F2FD", border: "2px solid #BBDEFB", color: "#1565C0", display: "flex", alignItems: "center", textDecoration: "none", fontSize: 14 }}>🔗</a>}</div></div>
            <div><label className="lbl">{t("הערות", "Notes")}</label><textarea value={edit.notes || ""} onChange={e => sv("notes", e.target.value)} rows={2} className="inp" style={{ resize: "vertical" }} /></div>
          </div>
        </div>

        {/* Dimensions */}
        <div className="sec">
          <div style={{ padding: "14px 18px", borderBottom: "2px solid #f5f3ef" }}><h3 style={{ fontSize: 14, fontWeight: 800 }}>📐 {t("מידות ומשקל", "Dimensions")}</h3></div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label className="lbl">{t("צורת הפריט", "Shape")}</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SHAPES.map(s => (<button key={s.id} onClick={() => sv("shape", s.id)} style={{ padding: "8px 12px", borderRadius: 10, border: "2px solid", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, background: edit.shape === s.id ? "#FEF2F2" : "#fff", borderColor: edit.shape === s.id ? "#C0272D" : "#E5E2DC", color: edit.shape === s.id ? "#C0272D" : "#777" }}>{s.emoji} {s[lang as "he" | "en"]}</button>))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${shp.fields.length}, 1fr)`, gap: 8 }}>
              {shp.fields.map(fld => {
                const dl = DIM_LABELS[fld];
                return (<div key={fld}><label className="lbl"><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: dl.color, marginInlineEnd: 4 }} />{t(dl.he, dl.en)} ({dl.unit})</label><input type="number" value={(edit.dims as any)[fld] || ""} onChange={e => svD(fld, e.target.value)} className="inp" placeholder={fld === "d" ? "⌀" : fld.toUpperCase()} style={{ textAlign: "center", fontFamily: "monospace", borderColor: (edit.dims as any)[fld] ? dl.color + "55" : "#E5E2DC" }} /></div>);
              })}
            </div>
            <div><label className="lbl">⚖️ {t("משקל (kg)", "Weight (kg)")}</label><input type="number" step="0.1" value={edit.wt} onChange={e => sv("wt", e.target.value)} className="inp" placeholder="kg" style={{ textAlign: "center", fontFamily: "monospace" }} /></div>
            {(() => {
              const vol = calcVolume(edit);
              if (vol === null) return null;
              return (<div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#f8f7f4", borderRadius: 10, fontSize: 12, color: "#777" }}><span>📦 {t("נפח", "Vol")}: <b style={{ color: "#2D2D2D" }}>{vol.toFixed(1)} L</b></span>{edit.wt && <span>⚖️ <b style={{ color: "#2D2D2D" }}>{(parseFloat(edit.wt) / (vol / 1000)).toFixed(0)} kg/m³</b></span>}</div>);
            })()}
          </div>
        </div>

        {/* Electrical specs */}
        <div className="sec">
          <div style={{ padding: "14px 18px", borderBottom: "2px solid #f5f3ef", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 14, fontWeight: 800 }}>⚡ {t("מפרט חשמלי", "Electrical Specs")}</h3>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, color: edit.is_electric ? "#E65100" : "#aaa" }}>
              <input type="checkbox" checked={edit.is_electric || false} onChange={e => sv("is_electric", e.target.checked)}
                style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#E65100" }} />
              {t("צרכן חשמל", "Powered")}
            </label>
          </div>
          {edit.is_electric && (
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <label className="lbl"><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#E65100", marginInlineEnd: 4 }} />{t("מתח", "Voltage")} (V)</label>
                  <input type="text" inputMode="decimal" value={edit.voltage || ""} onChange={e => sv("voltage", e.target.value)} className="inp" placeholder="230" style={{ textAlign: "center", fontFamily: "monospace" }} />
                </div>
                <div>
                  <label className="lbl"><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#FFC107", marginInlineEnd: 4 }} />{t("זרם", "Current")} (A)</label>
                  <input type="text" inputMode="decimal" value={edit.current || ""} onChange={e => sv("current", e.target.value)} className="inp" placeholder="10" style={{ textAlign: "center", fontFamily: "monospace" }} />
                </div>
                <div>
                  <label className="lbl"><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#9C27B0", marginInlineEnd: 4 }} />{t("הספק", "Power")} (W)</label>
                  <input type="text" inputMode="decimal" value={edit.power || ""} onChange={e => sv("power", e.target.value)} className="inp" placeholder="2300" style={{ textAlign: "center", fontFamily: "monospace" }} />
                </div>
              </div>
              {(() => {
                const v = parseFloat(edit.voltage || "0");
                const a = parseFloat(edit.current || "0");
                const w = parseFloat(edit.power || "0");
                if (v && a && !w) {
                  return <div style={{ padding: "10px 14px", background: "#FFF3E0", borderRadius: 10, fontSize: 12, color: "#E65100", display: "flex", alignItems: "center", gap: 8 }}>💡 {t("הספק מחושב:", "Calculated power:")} <b>{(v * a).toFixed(0)} W</b></div>;
                }
                if (v && w && !a) {
                  return <div style={{ padding: "10px 14px", background: "#FFF3E0", borderRadius: 10, fontSize: 12, color: "#E65100", display: "flex", alignItems: "center", gap: 8 }}>💡 {t("זרם מחושב:", "Calculated current:")} <b>{(w / v).toFixed(2)} A</b></div>;
                }
                return null;
              })()}
              <div style={{ fontSize: 11, color: "#999", padding: "8px 12px", background: "#fafaf8", borderRadius: 8 }}>
                💡 {t("חובה מילוי עבור ציוד חשמלי — נדרש לצורך תכנון המכולה", "Required for electric equipment — needed for container electrical planning")}
              </div>
            </div>
          )}
        </div>

        {/* 3D View */}
        <div className="sec">
          <div style={{ padding: "14px 18px", borderBottom: "2px solid #f5f3ef" }}><h3 style={{ fontSize: 14, fontWeight: 800 }}>🧊 {t("תצוגה 3D", "3D View")}</h3></div>
          <div style={{ padding: 18 }}>
            {dimsOk ? <ShapeViewer dims={edit.dims} shape={edit.shape} /> : (<div style={{ height: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8f7f4", borderRadius: 14, border: "2px dashed #E5E2DC" }}><span style={{ fontSize: 36, opacity: 0.3 }}>🧊</span><p style={{ fontSize: 12, color: "#bbb", textAlign: "center", marginTop: 8 }}>{t("הזן את כל המידות", "Enter all dims")}</p></div>)}
          </div>
        </div>

        {/* Photos */}
        <div className="sec">
          <div style={{ padding: "14px 18px", borderBottom: "2px solid #f5f3ef", display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3 style={{ fontSize: 14, fontWeight: 800 }}>📸 {t("תמונות", "Photos")}</h3><span style={{ fontSize: 11, fontWeight: 800, color: "#aaa", background: "#f5f3ef", padding: "3px 10px", borderRadius: 20 }}>{edit.photos.length}/6</span></div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {PHOTO_ANGLES.map((a, i) => {
                const photo = edit.photos[i];
                return (<div key={a.id} style={{ aspectRatio: "1", borderRadius: 12, border: `2px ${photo ? "solid #A5D6A7" : "dashed #E5E2DC"}`, background: photo ? "#E8F5E9" : "#FAFAF8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: photo ? "default" : "pointer", overflow: "hidden", position: "relative" }} onClick={() => !photo && fileRef.current?.click()}>
                  {photo ? (<><img src={photo.dataUrl} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /><button onClick={ev => { ev.stopPropagation(); setEdit(prev => { if (!prev) return prev; const updated = prev.photos.filter((_, j) => j !== i); onSave(prev.id, { photos: updated }); return { ...prev, photos: updated }; }); }} style={{ position: "absolute", top: 3, left: 3, width: 22, height: 22, borderRadius: "50%", background: "rgba(220,38,38,0.9)", border: "none", color: "#fff", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button></>) : (<><span style={{ fontSize: 22, opacity: 0.25 }}>📷</span><span style={{ fontSize: 10, color: "#bbb", fontWeight: 600 }}>{a[lang as "he" | "en"]}</span></>)}
                </div>);
              })}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={handlePhoto} />
            <button onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: 14, borderRadius: 12, border: "2px dashed #d5d2cc", background: "transparent", color: "#999", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>📤 {t("העלה תמונות", "Upload")}</button>
            <div style={{ display: "flex", gap: 8, padding: 12, background: "#E3F2FD", borderRadius: 10 }}><span style={{ fontSize: 14 }}>💡</span><p style={{ fontSize: 11, color: "#1565C0", lineHeight: 1.5 }}>{t("תמונות נשמרות ברזולוציה מלאה ב-Google Drive. צלם עם סרגל לייחוס.", "Full resolution photos saved to Google Drive. Include a ruler for scale.")}</p></div>
          </div>
        </div>

        {/* Video */}
        <div className="sec">
          <div style={{ padding: "14px 18px", borderBottom: "2px solid #f5f3ef" }}><h3 style={{ fontSize: 14, fontWeight: 800 }}>🎬 {t("סרטון 360°", "360° Video")}</h3></div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div onClick={() => document.getElementById(`vid-${edit.id}`)?.click()} style={{ padding: 28, borderRadius: 14, border: "2px dashed #E5E2DC", background: "#FAFAF8", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <span style={{ fontSize: 32, opacity: 0.3 }}>🎬</span>
              <p style={{ fontSize: 12, color: "#aaa" }}>{t("צלם/העלה סרטון סיבוב", "Upload rotation video")}</p>
              <span style={{ fontSize: 10, color: "#bbb", background: "#fff", padding: "4px 12px", borderRadius: 20, border: "1px solid #E5E2DC" }}>{t("עד 100MB • Google Drive", "Up to 100MB • Google Drive")}</span>
              <input id={`vid-${edit.id}`} type="file" accept="video/*" capture="environment" style={{ display: "none" }} onChange={async e => { const f = e.target.files?.[0]; if (f && edit) { const dr = await uploadToDrive(f, edit.id, edit.he, "video"); svNow("video", { name: f.name, size: f.size, driveId: dr?.fileId || "" }); } }} />
            </div>
            {edit.video && (<div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "#DCFCE7", borderRadius: 12 }}><span style={{ fontSize: 18 }}>✅</span><div style={{ flex: 1 }}><p style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>{edit.video.name}</p><p style={{ fontSize: 10, color: "#22C55E" }}>{(edit.video.size / 1024 / 1024).toFixed(1)} MB</p></div><button onClick={() => svNow("video", null)} style={{ padding: 6, background: "transparent", border: "none", cursor: "pointer", fontSize: 16 }}>🗑️</button></div>)}
          </div>
        </div>
      </div>
    );
  };

  // ═══ EXPORT ═══
  const Export = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 900 }}>{t("ייצוא", "Export")}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        <a href={`/api/export/pdf?lang=${lang}`} target="_blank" rel="noopener" style={{ textDecoration: "none" }}>
          <div className="sec" style={{ padding: 20, cursor: "pointer" }}><span style={{ fontSize: 32 }}>📄</span><h3 style={{ fontSize: 15, fontWeight: 800, margin: "8px 0 4px", color: "#2D2D2D" }}>{t("PDF דו-לשוני", "Bilingual PDF")}</h3><span style={{ fontSize: 12, fontWeight: 700, color: "#C0272D" }}>🖨️ {t("פתח והדפס", "Open & Print")}</span></div>
        </a>
        <a href={`/api/export/excel?lang=${lang}`} style={{ textDecoration: "none" }}>
          <div className="sec" style={{ padding: 20, cursor: "pointer" }}><span style={{ fontSize: 32 }}>📊</span><h3 style={{ fontSize: 15, fontWeight: 800, margin: "8px 0 4px", color: "#2D2D2D" }}>Excel / CSV</h3><span style={{ fontSize: 12, fontWeight: 700, color: "#2E7D32" }}>⬇️ {t("הורד", "Download")}</span></div>
        </a>
        <a href="https://drive.google.com/drive/folders/1oFbaC6o2EHWrmHf0tfPVgUYc31SYAKrn" target="_blank" rel="noopener" style={{ textDecoration: "none" }}>
          <div className="sec" style={{ padding: 20, cursor: "pointer" }}><span style={{ fontSize: 32 }}>📁</span><h3 style={{ fontSize: 15, fontWeight: 800, margin: "8px 0 4px", color: "#2D2D2D" }}>{t("תיקיית מדיה", "Media Folder")}</h3><span style={{ fontSize: 12, fontWeight: 700, color: "#1565C0" }}>🔗 {t("פתח ב-Google Drive", "Open in Drive")}</span></div>
        </a>
      </div>
      <div className="sec" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>💾 {t("אחסון", "Storage")} — <span style={{ color: "#2E7D32" }}>{t("חינם", "Free")}</span></h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ padding: 16, borderRadius: 12, background: "#E8F5E9", border: "1px solid #A5D6A7" }}><p style={{ fontSize: 12, fontWeight: 800, color: "#2E7D32" }}>📊 Neon Postgres — DB</p><p style={{ fontSize: 11, color: "#388E3C" }}>{t("מטא-דאטה בלבד", "Metadata only")}</p></div>
          <div style={{ padding: 16, borderRadius: 12, background: "#E3F2FD", border: "1px solid #90CAF9" }}><p style={{ fontSize: 12, fontWeight: 800, color: "#1565C0" }}>📁 Google Drive</p><p style={{ fontSize: 11, color: "#1976D2" }}>{t("תמונות + סרטונים", "Photos + videos")}</p></div>
        </div>
      </div>
    </div>
  );

  // ═══ RENDER ═══
  return (
    <div dir={lang === "he" ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'Heebo',sans-serif", color: "#2D2D2D" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", borderBottom: "2px solid #ECEAE4", padding: "0 16px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#C0272D,#8B1A1A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 3px 10px rgba(192,39,45,0.25)" }}>🚒</div>
              <div><h1 style={{ fontSize: 14, fontWeight: 900 }}>{t('אפיון ציוד מכולת חומ"ס', "HazMat Equipment Spec")}</h1><p style={{ fontSize: 10, color: "#aaa" }}>{t('כבאות והצלה • ענף חומ"ס • אלמוג', "Fire & Rescue • HazMat")}</p></div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { if (admin) { setAdmin(false); } else { setShowPwDialog(true); setPwInput(""); setPwError(""); } }} style={{ padding: "6px 12px", borderRadius: 8, border: `2px solid ${admin ? "#C0272D" : "#E5E2DC"}`, background: admin ? "#FEF2F2" : "#fff", color: admin ? "#C0272D" : "#999", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{admin ? "🔓 " + t("עריכה", "Edit") : "🔒"}</button>
              <button onClick={() => setLang(lang === "he" ? "en" : "he")} style={{ padding: "6px 12px", borderRadius: 8, border: "2px solid #E5E2DC", background: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", color: "#666" }}>🌐 {lang === "he" ? "EN" : "עב"}</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 2, marginBottom: -2 }}>
            {[{ id: "dash", e: "📊", l: t("לוח בקרה", "Dashboard") }, { id: "detail", e: "📝", l: t("פרטי פריט", "Detail") }, { id: "export", e: "📤", l: t("ייצוא", "Export") }].map(tb => (
              <button key={tb.id} onClick={() => setTab(tb.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", borderRadius: "8px 8px 0 0", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", borderBottom: `3px solid ${tab === tb.id ? "#C0272D" : "transparent"}`, background: tab === tb.id ? "#fff" : "transparent", color: tab === tb.id ? "#C0272D" : "#999" }}>{tb.e} {tb.l}</button>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
        {tab === "dash" && Dash()}
        {tab === "detail" && Detail()}
        {tab === "export" && Export()}
      </main>

      <footer style={{ borderTop: "2px solid #ECEAE4", background: "#fff", padding: "14px 24px", marginTop: 40 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#bbb" }}>
          <span>{t('© כבאות והצלה • ענף חומ"ס', "© Fire & Rescue • HazMat")}</span>
          <span>v1.0</span>
        </div>
      </footer>

      {/* Upload indicator */}
      {uploadMsg && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 100, background: uploadMsg.includes("❌") ? "#C0272D" : uploadMsg.includes("✅") ? "#2E7D32" : "#1565C0", color: "#fff", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", maxWidth: "90%", textAlign: "center" as const }}>
          {uploadMsg}
        </div>
      )}
      {/* Password dialog */}
      {showPwDialog && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowPwDialog(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 340, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ textAlign: "center", fontSize: 36, marginBottom: 12 }}>🔐</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, textAlign: "center", marginBottom: 16 }}>{t("סיסמת עריכה", "Edit Password")}</h3>
            <input type="password" value={pwInput} onChange={e => { setPwInput(e.target.value); setPwError(""); }}
              onKeyDown={async e => { if (e.key === "Enter") { const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pwInput }) }); const d = await r.json(); if (d.ok) { setAdmin(true); setShowPwDialog(false); } else { setPwError(t("סיסמה שגויה", "Wrong password")); } } }}
              placeholder={t("הזן סיסמה...", "Enter password...")}
              style={{ width: "100%", padding: 14, borderRadius: 12, border: `2px solid ${pwError ? "#C0272D" : "#E5E2DC"}`, fontSize: 16, textAlign: "center", outline: "none", fontFamily: "inherit" }} autoFocus />
            {pwError && <p style={{ color: "#C0272D", fontSize: 13, fontWeight: 700, textAlign: "center", marginTop: 8 }}>{pwError}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowPwDialog(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: "2px solid #E5E2DC", background: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{t("ביטול", "Cancel")}</button>
              <button onClick={async () => { const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pwInput }) }); const d = await r.json(); if (d.ok) { setAdmin(true); setShowPwDialog(false); } else { setPwError(t("סיסמה שגויה", "Wrong password")); } }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: "#C0272D", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{t("כניסה", "Enter")}</button>
            </div>
          </div>
        </div>
      )}
      {/* Delete modal */}
      {delModal !== null && (() => {
        const item = items.find(i => i.id === delModal);
        if (!item) return null;
        return (<div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setDelModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 360, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ textAlign: "center", fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>{t("למחוק?", "Delete?")}</h3>
            <p style={{ fontSize: 13, color: "#777", textAlign: "center", marginBottom: 20 }}>#{item.id} — {item.he}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDelModal(null)} style={{ flex: 1, padding: 12, borderRadius: 12, border: "2px solid #E5E2DC", background: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{t("ביטול", "Cancel")}</button>
              <button onClick={() => { onDelete(delModal); setDelModal(null); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: "#C0272D", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{t("מחק", "Delete")}</button>
            </div>
          </div>
        </div>);
      })()}
    </div>
  );
}
