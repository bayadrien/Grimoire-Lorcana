"use client";

import { useEffect, useMemo, useState } from "react";
import { tInk } from "@/lib/lorcana-fr";

type Card = {
  id: string;
  name: string;
  setName: string;
  setCode?: string | null; // "1".."10"
  ink?: string | null;
  imageUrl?: string | null;
};

type ColRow = { cardId: string; quantity: number };

function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

export default function ChapitresAlbum() {
  const [cards, setCards] = useState<Card[]>([]);
  const [aCol, setACol] = useState<Record<string, number>>({});
  const [gCol, setGCol] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const [cardsR, aR, gR] = await Promise.all([
          fetch("/api/cards", { cache: "no-store" }),
          fetch("/api/collection?userId=adrien", { cache: "no-store" }),
          fetch("/api/collection?userId=angele", { cache: "no-store" }),
        ]);

        if (!cardsR.ok) throw new Error(`Cards HTTP ${cardsR.status}`);
        if (!aR.ok) throw new Error(`Adrien HTTP ${aR.status}`);
        if (!gR.ok) throw new Error(`Angèle HTTP ${gR.status}`);

        const cardsJ = await cardsR.json();
        const aJ: ColRow[] = await aR.json();
        const gJ: ColRow[] = await gR.json();

        const aMap: Record<string, number> = {};
        const gMap: Record<string, number> = {};
        aJ.forEach((x) => (aMap[x.cardId] = x.quantity));
        gJ.forEach((x) => (gMap[x.cardId] = x.quantity));

        if (!cancel) {
          setCards(Array.isArray(cardsJ) ? cardsJ : Array.isArray(cardsJ?.cards) ? cardsJ.cards : []);
          setACol(aMap);
          setGCol(gMap);
        }
      } catch (e: any) {
        if (!cancel) setErr(String(e?.message || e));
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    load();
    return () => {
      cancel = true;
    };
  }, []);

  const chapters = useMemo(() => {
    const map = new Map<string, { code: string; setName: string; total: number; aOwned: number; gOwned: number; duoOwned: number }>();

    for (const c of cards) {
      const code = String(c.setCode ?? "");
      if (!/^\d+$/.test(code)) continue;
      const n = Number(code);
      if (n < 1 || n > 10) continue;

      if (!map.has(code)) {
        map.set(code, {
          code,
          setName: c.setName || `Chapitre ${code}`,
          total: 0,
          aOwned: 0,
          gOwned: 0,
          duoOwned: 0,
        });
      }

      const row = map.get(code)!;
      row.total += 1;

      const aHas = (aCol[c.id] ?? 0) > 0;
      const gHas = (gCol[c.id] ?? 0) > 0;

      if (aHas) row.aOwned += 1;
      if (gHas) row.gOwned += 1;
      if (aHas || gHas) row.duoOwned += 1;
    }

    return Array.from(map.values()).sort((x, y) => Number(x.code) - Number(y.code));
  }, [cards, aCol, gCol]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="sigil">📚</div>
          <div>
            <h1>Chapitres (mode album)</h1>
            <p>{loading ? "⏳ Chargement…" : `${chapters.length} chapitres`}</p>
          </div>
        </div>

        <div className="controls">
          <a className="link" href="/">🎴 Cartes</a>
          <a className="link" href="/echange">🤝 Échange</a>
          <a className="link" href="/stats">📊 Stats</a>
          <a className="link" href="/gift">🎁 Doubles</a>
        </div>
      </header>

      {err && (
        <div className="topbar" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <p>❌ Erreur: {err}</p>
          <button className="btn" onClick={() => location.reload()}>Réessayer</button>
        </div>
      )}

      <section className="grid" style={{ marginTop: 12 }}>
        {chapters.map((ch) => (
          <a key={ch.code} className="albumCard" href={`/chapitres/${ch.code}`}>
            <div className="albumTop">
              <div>
                <div className="albumTitle">Chapitre {ch.code}</div>
                <div className="albumSub">{ch.setName}</div>
              </div>
              <div className="albumPct">{pct(ch.duoOwned, ch.total)}%</div>
            </div>

            <div className="bars">
              <div className="barRow">
                <span>Adrien</span>
                <div className="bar"><div className="fill" style={{ width: `${pct(ch.aOwned, ch.total)}%` }} /></div>
                <b>{pct(ch.aOwned, ch.total)}%</b>
              </div>

              <div className="barRow">
                <span>Angèle</span>
                <div className="bar"><div className="fill" style={{ width: `${pct(ch.gOwned, ch.total)}%` }} /></div>
                <b>{pct(ch.gOwned, ch.total)}%</b>
              </div>

              <div className="barRow">
                <span>Cumul</span>
                <div className="bar"><div className="fill" style={{ width: `${pct(ch.duoOwned, ch.total)}%` }} /></div>
                <b>{pct(ch.duoOwned, ch.total)}%</b>
              </div>
            </div>

            <div className="albumFooter">
              <span>Total: <b>{ch.total}</b></span>
              <span>Manquantes duo: <b>{ch.total - ch.duoOwned}</b></span>
            </div>
          </a>
        ))}
      </section>

      <style jsx>{`
        .grid{
          display:grid;
          grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
          gap: 12px;
        }
        .albumCard{
          display:block;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.10);
          text-decoration:none;
          color: inherit;
          transition: transform .12s ease;
        }
        .albumCard:hover{ transform: translateY(-2px); }

        .albumTop{
          display:flex;
          align-items:flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .albumTitle{ font-weight: 900; font-size: 18px; }
        .albumSub{ opacity:.8; margin-top: 4px; }
        .albumPct{
          font-weight: 900;
          font-size: 18px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.18);
        }

        .bars{ margin-top: 12px; display:flex; flex-direction:column; gap: 8px; }
        .barRow{
          display:grid;
          grid-template-columns: 70px 1fr 46px;
          align-items:center;
          gap: 10px;
          font-size: 13px;
          opacity: .95;
        }
        .bar{
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,.10);
          overflow:hidden;
          border: 1px solid rgba(255,255,255,.08);
        }
        .fill{
          height: 100%;
          background: rgba(255,255,255,.55);
        }

        .albumFooter{
          margin-top: 12px;
          display:flex;
          justify-content: space-between;
          opacity:.85;
          font-size: 13px;
        }
      `}</style>
    </main>
  );
}
