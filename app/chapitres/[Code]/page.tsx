"use client";

import { useEffect, useMemo, useState } from "react";
import { tInk, tRarity } from "@/lib/lorcana-fr";

type Card = {
  id: string;
  name: string;
  setName: string;
  setCode?: string | null;
  ink?: string | null;
  rarity?: string | null;
  cost?: number | null;
  imageUrl?: string | null;
};

type ColRow = { cardId: string; quantity: number };

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='600'%20height='900'%3E%3Crect%20width='100%25'%20height='100%25'%20fill='%23f7edd9'/%3E%3Ctext%20x='50%25'%20y='50%25'%20dominant-baseline='middle'%20text-anchor='middle'%20fill='%236b5e50'%20font-size='28'%20font-family='Arial'%3EImage%20indisponible%3C/text%3E%3C/svg%3E";

export default function ChapitreDetail({ params }: { params: { code: string } }) {
  const code = params.code;

  const [userId, setUserId] = useState<"adrien" | "angele">("adrien");
  const [cards, setCards] = useState<Card[]>([]);
  const [col, setCol] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);

  useEffect(() => {
    const u = (localStorage.getItem("activeUser") as any) || "adrien";
    setUserId(u);
  }, []);

  useEffect(() => {
    fetch("/api/cards", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCards(Array.isArray(data) ? data : Array.isArray(data?.cards) ? data.cards : []));
  }, []);

  useEffect(() => {
    fetch(`/api/collection?userId=${userId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: ColRow[]) => {
        const map: Record<string, number> = {};
        rows.forEach((x) => (map[x.cardId] = x.quantity));
        setCol(map);
      });
  }, [userId]);

  async function setQty(cardId: string, quantity: number) {
    const next = Math.max(0, quantity);
    const prev = col[cardId] || 0;
    setCol((p) => ({ ...p, [cardId]: next }));

    try {
      const res = await fetch("/api/collection/setQty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, cardId, quantity: next }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
    } catch {
      setCol((p) => ({ ...p, [cardId]: prev }));
      alert("❌ Sauvegarde impossible (API).");
    }
  }

  const chapterCards = useMemo(() => {
    const s = q.trim().toLowerCase();
    return cards
      .filter((c) => String(c.setCode ?? "") === String(code))
      .filter((c) => (s ? c.name.toLowerCase().includes(s) : true))
      .filter((c) => (onlyMissing ? (col[c.id] || 0) === 0 : true));
  }, [cards, code, q, onlyMissing, col]);

  const setName = useMemo(() => {
    const any = cards.find((c) => String(c.setCode ?? "") === String(code));
    return any?.setName || `Chapitre ${code}`;
  }, [cards, code]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="sigil">📘</div>
          <div>
            <h1>Chapitre {code}</h1>
            <p>{setName} • {chapterCards.length} cartes</p>
          </div>
        </div>

        <div className="controls">
          <a className="link" href="/chapitres">⬅️ Album</a>
          <a className="link" href="/">🎴 Cartes</a>

          <select
            value={userId}
            onChange={(e) => {
              const v = e.target.value as "adrien" | "angele";
              setUserId(v);
              localStorage.setItem("activeUser", v);
            }}
          >
            <option value="adrien">Adrien</option>
            <option value="angele">Angèle</option>
          </select>
        </div>
      </header>

      <div className="topbar" style={{ marginTop: 12, justifyContent: "space-between" }}>
        <input
          className="pill"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔎 Rechercher…"
        />

        <label className="pill" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          Manquantes
        </label>
      </div>

      <section className="grid" style={{ marginTop: 12 }}>
        {chapterCards.map((c) => {
          const qty = col[c.id] || 0;
          const cornerClass = qty > 1 ? "double" : qty === 1 ? "ok" : "missing";
          const cornerText = qty > 1 ? "🎁 Double" : qty === 1 ? "✅ OK" : "⬜ 0";

          return (
            <article key={c.id} className="card">
              <div className="cardMedia">
                <img src={c.imageUrl || PLACEHOLDER} alt={c.name} loading="lazy" />

                <div className="qtyPill">
                  <button onClick={() => setQty(c.id, qty - 1)} aria-label="Diminuer">−</button>
                  <div className="num">{qty}</div>
                  <button onClick={() => setQty(c.id, qty + 1)} aria-label="Augmenter">+</button>
                </div>

                <div className={`corner ${cornerClass}`}>{cornerText}</div>

                <div className="overlay">
                  <div className="ovTitle">{c.name}</div>
                  <div className="ovMeta">
                    {c.setName}{c.setCode ? ` • Chapitre ${c.setCode}` : ""}<br />
                    {tInk(c.ink)} • {tRarity(c.rarity)} • Coût {c.cost ?? "—"}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <style jsx>{`
        .grid{
          display:grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 12px;
        }
      `}</style>
    </main>
  );
}
