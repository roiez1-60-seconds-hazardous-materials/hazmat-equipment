export type Shape = "box" | "cylinder" | "sphere" | "long" | "bag" | "irregular";
export type Status = "existing" | "new";
export type Category = "protection" | "stabilization" | "containment" | "monitoring" | "additional";

export interface Dims {
  l: string;
  w: string;
  h: string;
  d: string;
}

export interface PhotoItem {
  dataUrl: string;
  name: string;
  driveId?: string; // Google Drive file ID once uploaded
}

export interface VideoItem {
  name: string;
  size: number;
  driveId?: string;
}

export interface EquipmentItem {
  id: number;
  cat: Category;
  he: string;
  en: string;
  qty: number | null;
  st: Status;
  notes: string;
  co: string; // company
  dims: Dims;
  wt: string; // weight
  url: string;
  photos: PhotoItem[];
  video: VideoItem | null;
  shape: Shape;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryDef {
  he: string;
  en: string;
  emoji: string;
  color: string;
  bg: string;
}

export interface ShapeDef {
  id: Shape;
  emoji: string;
  he: string;
  en: string;
  fields: string[];
}

export interface DimLabel {
  he: string;
  en: string;
  unit: string;
  color: string;
}

// Constants
export const CATEGORIES: Record<Category, CategoryDef> = {
  protection:    { he: "ציוד מיגון",   en: "Protection",    emoji: "🛡️", color: "#C0272D", bg: "#FEF2F2" },
  stabilization: { he: "ציוד ייצוב",   en: "Stabilization", emoji: "💧", color: "#1565C0", bg: "#E3F2FD" },
  containment:   { he: "הכלת אירוע",   en: "Containment",   emoji: "🔧", color: "#E65100", bg: "#FFF3E0" },
  monitoring:    { he: "ציוד ניטור",    en: "Monitoring",    emoji: "📡", color: "#2E7D32", bg: "#E8F5E9" },
  additional:    { he: "ציוד נוסף",     en: "Additional",    emoji: "🏷️", color: "#6A1B9A", bg: "#F3E5F5" },
};

export const SHAPES: ShapeDef[] = [
  { id: "box",       emoji: "📦", he: "תיבה / ארגז",  en: "Box / Crate",     fields: ["l","w","h"] },
  { id: "cylinder",  emoji: "🛢️", he: "גליל / חבית",  en: "Cylinder / Drum", fields: ["d","h"] },
  { id: "sphere",    emoji: "⚽", he: "כדורי",         en: "Spherical",       fields: ["d"] },
  { id: "long",      emoji: "📏", he: "ארוך וצר",      en: "Long & Narrow",   fields: ["l","d"] },
  { id: "bag",       emoji: "🎒", he: "שק / תיק",     en: "Bag / Pack",      fields: ["l","w","h"] },
  { id: "irregular", emoji: "⚙️", he: "לא סדיר",      en: "Irregular",       fields: ["l","w","h"] },
];

export const DIM_LABELS: Record<string, DimLabel> = {
  l: { he: "אורך",  en: "Length",   unit: "cm", color: "#C0272D" },
  w: { he: "רוחב",  en: "Width",    unit: "cm", color: "#1565C0" },
  h: { he: "גובה",  en: "Height",   unit: "cm", color: "#2E7D32" },
  d: { he: "קוטר",  en: "Diameter", unit: "cm", color: "#E65100" },
};

export const PHOTO_ANGLES = [
  { id: "front",  he: "חזית",      en: "Front" },
  { id: "right",  he: "צד ימין",   en: "Right" },
  { id: "back",   he: "גב",        en: "Back" },
  { id: "left",   he: "צד שמאל",   en: "Left" },
  { id: "top",    he: "מלמעלה",    en: "Top" },
  { id: "detail", he: "פרט/תווית", en: "Detail" },
];

// Compute completion percentage — only measurement fields
export function calcCompletion(item: EquipmentItem): number {
  let filled = 0;
  const total = 4;
  const shape = SHAPES.find(s => s.id === item.shape) || SHAPES[0];
  if (shape.fields.every(f => item.dims[f as keyof Dims])) filled++;
  if (item.wt) filled++;
  if (item.photos.length > 0) filled++;
  if (item.video) filled++;
  return Math.round((filled / total) * 100);
}

// Compute volume in liters based on shape
export function calcVolume(item: EquipmentItem): number | null {
  const shape = SHAPES.find(s => s.id === item.shape) || SHAPES[0];
  if (!shape.fields.every(f => item.dims[f as keyof Dims])) return null;
  
  const d = parseFloat(item.dims.d) || 0;
  const l = parseFloat(item.dims.l) || 0;
  const w = parseFloat(item.dims.w) || 0;
  const h = parseFloat(item.dims.h) || 0;
  
  switch (item.shape) {
    case "sphere":   return (Math.PI / 6) * Math.pow(d, 3) / 1000;
    case "cylinder": return (Math.PI / 4) * d * d * h / 1000;
    case "long":     return (Math.PI / 4) * d * d * l / 1000;
    default:         return (l * w * h) / 1000;
  }
}
