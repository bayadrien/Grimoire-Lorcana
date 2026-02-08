"use client";

import { useEffect, useMemo, useState } from "react";
import { tInk, tRarity } from "@/lib/lorcana-fr";
import AppHeader from "app/components/AppHeader";

type Trade = {
  id: string;
  fromUser: string;
  toUser: string;
  quantity: number;
  createdAt: string;
  card: {
    name: string;
    setName: string | null;
    setCode: string | null;
    ink?: string | null;
    rarity?: string | null;
    imageUrl?: string | null;
  };
};

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='600'%20height='900'%3E%3Crect%20width='100%25'%20height='100%25'%20fill='%23f7edd9'/%3E%3Ctext%20x='50%25'%20y='50%25'%20dominant-baseline='middle'%20text-anchor='middle'%20fill='%236b5e50'%20font-size='28'%20font-family='Arial'%3EImage%20indisponible%3C/text%3E%3C/svg%3E";

export default function HistoriqueEchange() {
  const [rows, setRows] = useState<Trade[]>([]);
  const [from, setFrom] = useState("all");
  const [to, setTo] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    const p = new URLSearchParams({ from, to });
    fetch(`/api/trades/list?${p.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setRows);
  }, [from, to]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((t) => t.card?.name?.toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <main className="shell">
      <AppHeader
        title="Historique"
        subtitle={`${filtered.length} cartes`}
        icon="📜"
      />

      <div className="topbar" style={{ marginTop: 12, justifyContent: "space-between" }}>
        <div className="controls" style={{ gap: 10 }}>
          <input className="pill" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Rechercher…" />

          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="all">De: tous</option>
            <option value="adrien">De: Adrien</option>
            <option value="angele">De: Angèle</option>
          </select>

          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="all">Vers: tous</option>
            <option value="adrien">Vers: Adrien</option>
            <option value="angele">Vers: Angèle</option>
          </select>
        </div>

        <div style={{ opacity: 0.85 }}>
          {rows.length === 0 ? "Encore vide… fais un premier don 🤝" : "📌 Journal à jour"}
        </div>
      </div>

      <section style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.map((t) => (
          <div key={t.id} className="tradeRow">
            <div className="tradeLeft">
              <img className="tradeImg" src={t.card.imageUrl || PLACEHOLDER} alt={t.card.name} loading="lazy" />
              <div>
                <div className="tradeTitle">{t.card.name}</div>
                <div className="tradeMeta">
                  {t.card.setName}
                  {t.card.setCode ? ` • Chapitre ${t.card.setCode}` : ""} • {tInk(t.card.ink)} •{" "}
                  {tRarity(t.card.rarity)} • Qty: <b>{t.quantity}</b>
                </div>
              </div>
            </div>

            <div className="tradeRight">
              <div className="tradeArrow">
                <b>{t.fromUser}</b> → <b>{t.toUser}</b>
              </div>
              <div className="tradeDate">{new Date(t.createdAt).toLocaleString("fr-FR")}</div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
