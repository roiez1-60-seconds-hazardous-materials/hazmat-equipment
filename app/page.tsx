"use client";

import { useState, useEffect } from "react";
import { EquipmentItem } from "@/lib/types";
import HazMatApp from "@/components/HazMatApp";

export default function Page() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch items from API
  useEffect(() => {
    fetch("/api/items")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setItems(data);
        } else {
          setError("Failed to load data");
        }
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  // Save item to API
  const saveItem = async (id: number, updates: Partial<EquipmentItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    try {
      await fetch("/api/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  // Add new item
  const addItem = async (): Promise<EquipmentItem> => {
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cat: "additional", st: "new", shape: "box" }),
      });
      const data = await res.json();
      const newItem: EquipmentItem = {
        id: data.id,
        cat: "additional", he: "", en: "", qty: null, st: "new",
        notes: "", co: "", dims: { l: "", w: "", h: "", d: "" },
        wt: "", url: "", photos: [], video: null, shape: "box",
        voltage: "", current: "", power: "", is_electric: false,
      };
      setItems(prev => [...prev, newItem]);
      return newItem;
    } catch (e) {
      console.error("Add error:", e);
      throw e;
    }
  };

  // Delete item
  const deleteItem = async (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await fetch(`/api/items?id=${id}`, { method: "DELETE" });
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16, background: "#FAFAF8",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: "linear-gradient(135deg, #C0272D, #8B1A1A)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
          animation: "pulse 1.5s infinite",
        }}>🚒</div>
        <p style={{ fontSize: 14, color: "#999", fontFamily: "Heebo, sans-serif" }}>טוען נתונים...</p>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16, background: "#FAFAF8",
        fontFamily: "Heebo, sans-serif", padding: 20, textAlign: "center",
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#C0272D" }}>שגיאת טעינה</h2>
        <p style={{ fontSize: 13, color: "#999" }}>{error}</p>
        <button onClick={() => window.location.reload()} style={{
          padding: "12px 24px", borderRadius: 12, background: "#C0272D",
          color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>🔄 נסה שוב</button>
      </div>
    );
  }

  return (
    <HazMatApp
      items={items}
      onSave={saveItem}
      onAdd={addItem}
      onDelete={deleteItem}
    />
  );
}
