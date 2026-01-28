"use client";
import { useEffect, useMemo, useState } from "react";

type Card = { id: string; name: string; setName: string; setCode?: string | null; ink?: string | null };
type ColRow = { cardId: string; quantity: number };

export default function Gift() {
  const [me, setMe] = useState<"adrien" | "angele">("adrien");
  const other = me === "adrien" ? "angele" : "adrien";

  const [cards, setCards] = useState<Record<string, Card>>({});
  const [myCol, setMyCol] = useState<Record<string, number>>({});
  const [otCol, setOtCol] = useState<Record<string, number>>({});

  useEffect(() => {
    const u = (localStorage.getItem("activeUser") as any) || "adrien";
    setMe(u);
  }, []);

  useEffect(() => {
    fetch("/api/cards").then((r) => r.json()).then((arr: Card[]) => {
      const map: Record<string, Card> = {};
      arr.forEach((c) => (map[c.id] = c));
      setCards(map);
    });
  }, []);

  useEffect(() => {
    fetch(`/api/collection?userId=${me}`).then((r) => r.json()).then((rows: ColRow[]) => {
      const map: Record<string, number> = {};
      rows.forEach((x) => (map[x.cardId] = x.quantity));
      setMyCol(map);
    });
    fetch(`/api/collection?userId=${other}`).then((r) => r.json()).then((rows: ColRow[]) => {
      const map: Record<string, number> = {};
      rows.forEach((x) => (map[x.cardId] = x.quantity));
      setOtCol(map);
    });
  }, [me, other]);

  const giftables = useMemo(() => {
    return Object.keys(myCol)
      .filter((id) => (myCol[id] || 0) > 1 && (otCol[id] || 0) === 0)
      .map((id) => cards[id])
      .filter(Boolean);
  }, [myCol, otCol, cards]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="sigil">🎁</div>
          <div>
            <h1>Doubles à donner</h1>
            <p>{giftables.length} cartes que {me} peut donner à {other}</p>
          </div>
        </div>

        <div className="controls">
          <select
            value={me}
            onChange={(e) => {
              const v = e.target.value as "adrien" | "angele";
              setMe(v);
              localStorage.setItem("activeUser", v);
            }}
          >
            <option value="adrien">Adrien</option>
            <option value="angele">Angèle</option>
          </select>

          <a className="link" href="/">📚 Catalogue</a>
          <a className="link" href="/stats">📊 Stats</a>

        </div>
      </header>

      {giftables.length === 0 ? (
        <div className="note">Rien à donner pour l’instant 😄</div>
      ) : (
        <section className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          {giftables.map((c) => (
            <article key={c.id} className="card">
              <div className="inner">
                <div className="title">
                  <div className="name">{c.name}</div>
                  <div className="badge">{c.ink ?? "—"}</div>
                </div>
                <div className="meta">
                  {c.setName}{c.setCode ? ` • Chapitre ${c.setCode}` : ""}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
