"use client";
import { useEffect, useMemo, useState } from "react";
import { tInk, tRarity } from "@/lib/lorcana-fr";

type Card = {
  id: string;
  name: string;
  setName: string;
  setCode?: string | null; // "1".."10"
  ink?: string | null;
  rarity?: string | null;
  cost?: number | null;
  imageUrl?: string | null;
};

type ColRow = { cardId: string; quantity: number };

export default function ChapitresPage() {
  const [userId, setUserId] = useState<"adrien" | "angele">("adrien");
  const [cards, setCards] = useState<Card[]>([]);
  const [col, setCol] = useState<Record<string, number>>({});

  useEffect(() => {
    const u = (localStorage.getItem("activeUser") as any) || "adrien";
    setUserId(u);
  }, []);

  useEffect(() => {
    fetch("/api/cards").then((r) => r.json()).then(setCards);
  }, []);

  useEffect(() => {
    fetch(`/api/collection?userId=${userId}`)
      .then((r) => r.json())
      .then((rows: ColRow[]) => {
        const map: Record<string, number> = {};
        rows.forEach((x) => (map[x.cardId] = x.quantity));
        setCol(map);
      });
  }, [userId]);

  async function setQty(cardId: string, quantity: number) {
    const next = Math.max(0, quantity);
    setCol((prev) => ({ ...prev, [cardId]: next }));
    await fetch("/api/collection/setQty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, cardId, quantity: next }),
    });
  }

  const chapters = useMemo(() => {
    const s = new Set<string>();
    for (const c of cards) {
      const code = c.setCode ? String(c.setCode) : "";
      if (/^\d+$/.test(code) && Number(code) >= 1 && Number(code) <= 10) s.add(code);
    }
    return Array.from(s).sort((a, b) => Number(a) - Number(b));
  }, [cards]);

  const byChapter = useMemo(() => {
    const map: Record<string, Card[]> = {};
    for (const ch of chapters) map[ch] = [];
    for (const c of cards) {
      const ch = c.setCode ? String(c.setCode) : "";
      if (map[ch]) map[ch].push(c);
    }
    // petit tri par nom
    for (const ch of chapters) map[ch].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return map;
  }, [cards, chapters]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="sigil">📚</div>
          <div>
            <h1>Chapitres</h1>
            <p>Cartes rangées du chapitre 1 au 10</p>
          </div>
        </div>

        <div className="controls">
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

          <a className="link" href="/">🎴 Catalogue</a>
          <a className="link" href="/stats">📊 Stats</a>
          <a className="link" href="/gift">🎁 Doubles</a>
        </div>
      </header>

      {chapters.map((ch) => (
        <section key={ch} style={{ marginTop: 14 }}>
          <div className="topbar" style={{ justifyContent: "space-between" }}>
            <div className="brand" style={{ gap: 10 }}>
              <div className="sigil">#{ch}</div>
              <div>
                <h1 style={{ fontSize: 16, margin: 0 }}>Chapitre {ch}</h1>
                <p style={{ margin: "2px 0 0" }}>{byChapter[ch]?.length ?? 0} cartes</p>
              </div>
            </div>
          </div>

          <div className="grid" style={{ marginTop: 10 }}>
            {(byChapter[ch] || []).map((c) => {
              const qty = col[c.id] || 0;
              const cornerText = qty > 1 ? "🎁 Double" : qty === 1 ? "✅ OK" : "⬜ 0";
              const cornerClass = qty > 1 ? "double" : qty === 1 ? "ok" : "missing";

              return (
                <article key={c.id} className="card">
                  <div className="cardMedia">
                    <img
                      src={
                        c.imageUrl ||
                        "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='600'%20height='900'%3E%3Crect%20width='100%25'%20height='100%25'%20fill='%23f7edd9'/%3E%3Ctext%20x='50%25'%20y='50%25'%20dominant-baseline='middle'%20text-anchor='middle'%20fill='%236b5e50'%20font-size='28'%20font-family='Arial'%3EImage%20indisponible%3C/text%3E%3C/svg%3E"
                      }
                      alt={c.name}
                      loading="lazy"
                    />

                    <div className="qtyPill">
                      <button onClick={() => setQty(c.id, qty - 1)} aria-label="Retirer 1">−</button>
                      <div className="num">{qty}</div>
                      <button onClick={() => setQty(c.id, qty + 1)} aria-label="Ajouter 1">+</button>
                    </div>

                    <div className={`corner ${cornerClass}`}>{cornerText}</div>

                    <div className="overlay">
                      <div className="ovTitle">{c.name}</div>
                      <div className="ovMeta">
                        {c.setName} • Chapitre {ch}
                        <br />
                        {c.ink ?? "—"} • {c.rarity ?? "—"} • Coût {c.cost ?? "—"}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
