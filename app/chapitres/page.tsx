"use client";

import { useEffect, useMemo, useState } from "react";
import { CHAPTERS_NAMES_FR } from "@/lib/chapters-fr";
import AppHeader from "app/components/AppHeader";

/* ================= TYPES ================= */

type Card = {
  id: string;
  setCode?: string | null;
  setName: string;
};

type ColRow = {
  cardId: string;
  variant: "normal" | "foil";
  quantity: number;
};

type ChapterStats = {
  code: string;
  name: string;
  total: number;
  aOwned: number;
  gOwned: number;
  duoOwned: number;
  missing: number;
  aDoubles: number;
  gDoubles: number;
  pct: number;
};

/* ================= CONST ================= */

const CHAPTER_BACKGROUNDS: Record<string, string> = {
  "1": "/chapters/1.jpg",
  "2": "/chapters/2.jpg",
  "3": "/chapters/3.jpg",
  "4": "/chapters/4.jpg",
  "5": "/chapters/5.jpg",
  "6": "/chapters/6.jpg",
  "7": "/chapters/7.jpg",
  "8": "/chapters/8.jpg",
  "9": "/chapters/9.jpg",
  "10": "/chapters/10.jpg",
  "11": "/chapters/11.jpg",
  "12": "/chapters/12.jpg",
  "13": "/chapters/13.jpg",
};

function percent(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

/* ================= PAGE ================= */

export default function ChapitresPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [aCol, setACol] = useState<Record<string, number>>({});
  const [gCol, setGCol] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  /* ================= LOAD ================= */

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [cardsR, aR, gR] = await Promise.all([
        fetch("/api/cards", { cache: "no-store" }),
        fetch("/api/collection?userId=adrien", { cache: "no-store" }),
        fetch("/api/collection?userId=angele", { cache: "no-store" }),
      ]);

      const cardsData: Card[] = await cardsR.json();
      const aData: ColRow[] = await aR.json();
      const gData: ColRow[] = await gR.json();

      const aMap: Record<string, number> = {};
      const gMap: Record<string, number> = {};

      aData.forEach((r: ColRow) => {
        aMap[r.cardId] = (aMap[r.cardId] ?? 0) + r.quantity;
      });

      gData.forEach((r: ColRow) => {
        gMap[r.cardId] = (gMap[r.cardId] ?? 0) + r.quantity;
      });

      setCards(cardsData);
      setACol(aMap);
      setGCol(gMap);
      setLoading(false);
    }

    load();
  }, []);

  /* ================= STATS ================= */

  const chapters: ChapterStats[] = useMemo(() => {
    const map = new Map<string, ChapterStats>();

    cards.forEach((c: Card) => {
      if (!c.setCode || !/^\d+$/.test(c.setCode)) return;

      if (!map.has(c.setCode)) {
        map.set(c.setCode, {
          code: c.setCode,
          name:
            CHAPTERS_NAMES_FR[c.setCode] ??
            c.setName ??
            `Chapitre ${c.setCode}`,
          total: 0,
          aOwned: 0,
          gOwned: 0,
          duoOwned: 0,
          missing: 0,
          aDoubles: 0,
          gDoubles: 0,
          pct: 0,
        });
      }

      const row = map.get(c.setCode)!;
      row.total += 1;

      const aQty = aCol[c.id] ?? 0;
      const gQty = gCol[c.id] ?? 0;
      const aHas = aQty > 0;
      const gHas = gQty > 0;

      if (aHas) row.aOwned += 1;
      if (gHas) row.gOwned += 1;
      if (aHas || gHas) row.duoOwned += 1;
      if (aQty > 1) row.aDoubles += 1;
      if (gQty > 1) row.gDoubles += 1;
    });

    return Array.from(map.values())
      .map((r) => ({
        ...r,
        missing: r.total - r.duoOwned,
        pct: percent(r.duoOwned, r.total),
      }))
      .sort((a, b) => Number(a.code) - Number(b.code));
  }, [cards, aCol, gCol]);

  const global = useMemo(() => chapters.reduce(
    (total, chapter) => ({
      cards: total.cards + chapter.total,
      owned: total.owned + chapter.duoOwned,
      missing: total.missing + chapter.missing,
      doubles: total.doubles + chapter.aDoubles + chapter.gDoubles,
    }),
    { cards: 0, owned: 0, missing: 0, doubles: 0 }
  ), [chapters]);

  /* ================= RENDER ================= */

  return (
    <main className="shell">
            <AppHeader
              title="Grimoire Lorcana"
              subtitle={`${chapters.length} chapitres • ${global.owned} / ${global.cards} cartes réunies`}
              icon="📜"
            />

      {!loading && (
        <section className="globalStats" aria-label="Progression globale">
          <div><strong>{global.owned}</strong><span>réunies</span></div>
          <div><strong>{global.missing}</strong><span>manquantes</span></div>
          <div><strong>{global.doubles}</strong><span>doublons</span></div>
        </section>
      )}

      {loading && <p className="loading">Chargement de la progression…</p>}

      <section className="chaptersGrid">
        {chapters.map((ch) => (
          <a
            key={ch.code}
            href={`/chapitres/${ch.code}`}
            className={`chapterCard pct-${Math.min(10, Math.floor(ch.pct / 10))}`}
            style={{
              backgroundImage: `url(${CHAPTER_BACKGROUNDS[ch.code]})`,
            }}
          >
            <div className="chapterTop">
              <div>
                <div className="chapterCode">CHAPITRE {ch.code}</div>
                <div className="chapterName">{ch.name}</div>
              </div>

              <div className="chapterPct">{ch.pct}%</div>
            </div>

            <div className="chapterBottom">
            <div className="chapterProgressBar">
              <div
                className="chapterProgressFill"
                style={{ width: `${ch.pct}%` }}
              />
            </div>

            <div className="chapterMetrics">
              <div>
                <strong>{ch.duoOwned} <small>/ {ch.total}</small></strong>
                <span>cartes réunies</span>
              </div>
              <div>
                <strong>{ch.missing}</strong>
                <span>manquantes</span>
              </div>
              {(ch.aDoubles + ch.gDoubles) > 0 && (
                <div className="chapterDoubles">🎁 {ch.aDoubles + ch.gDoubles}</div>
              )}
            </div>
            </div>
          </a>
        ))}
      </section>

      {/* ================= STYLES ================= */}
      <style jsx>{`
        .chaptersGrid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .globalStats {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin: 16px 0 4px;
        }

        .globalStats div {
          width: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          border-radius: 16px;
          background: white;
          box-shadow: 0 6px 20px rgba(0,0,0,.08);
        }

        .globalStats strong { font-size: 22px; color: #243b64; }
        .globalStats span { font-size: 12px; opacity: .65; }
        .loading { text-align: center; opacity: .7; }

        .chapterCard {
          position: relative;
          overflow: hidden;
          min-height: 208px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-radius: 22px;
          background-size: cover;
          background-position: center;
          border: 1px solid rgba(255,255,255,.25);
          box-shadow: 0 14px 40px rgba(0,0,0,.6);
          text-decoration: none;
          color: white;
        }

        /* voile sombre pour la lisibilité */
        .chapterCard::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(11, 19, 37, .30),
            rgba(11, 19, 37, .88)
          );
          z-index: 0;
        }

        /* contenu au-dessus du voile */
        .chapterCard > * {
          position: relative;
          z-index: 1;
        }


        .chapterCard:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.6);
        }

        .chapterTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .chapterCode {
          font-weight: 900;
          font-size: 12px;
          letter-spacing: .08em;
          opacity: .8;
        }

        .chapterName {
          max-width: 210px;
          margin-top: 4px;
          font-weight: 800;
          font-size: 20px;
          line-height: 1.12;
        }

        .chapterPct {
          font-weight: 900;
          font-size: 17px;
          padding: 10px 9px;
          min-width: 52px;
          text-align: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.38);
          backdrop-filter: blur(8px);
        }

        .chapterProgressBar {
          height: 7px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          overflow: hidden;
        }

        .chapterProgressFill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.4s ease;
          background: linear-gradient(90deg, #2ecc71, #27ae60);
        }

        .chapterBottom { display: flex; flex-direction: column; gap: 12px; }

        .chapterMetrics {
          display: flex;
          align-items: flex-end;
          gap: 18px;
        }

        .chapterMetrics > div:not(.chapterDoubles) {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .chapterMetrics strong { font-size: 19px; line-height: 1; }
        .chapterMetrics small { font-size: 13px; opacity: .75; }
        .chapterMetrics span { font-size: 11px; opacity: .78; }
        .chapterDoubles {
          margin-left: auto;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 12px;
          background: rgba(255, 195, 74, .2);
          border: 1px solid rgba(255, 220, 138, .38);
        }

        /* Couleurs par progression */
        .pct-0 .chapterProgressFill,
        .pct-1 .chapterProgressFill,
        .pct-2 .chapterProgressFill {
          background: linear-gradient(90deg, #ff6b6b, #c0392b);
        }

        .pct-3 .chapterProgressFill,
        .pct-4 .chapterProgressFill,
        .pct-5 .chapterProgressFill,
        .pct-6 .chapterProgressFill {
          background: linear-gradient(90deg, #f6b93b, #e67e22);
        }

        .pct-7 .chapterProgressFill,
        .pct-8 .chapterProgressFill,
        .pct-9 .chapterProgressFill,
        .pct-10 .chapterProgressFill {
          background: linear-gradient(90deg, #2ecc71, #27ae60);
        }

        @media (max-width: 520px) {
          .chaptersGrid { grid-template-columns: 1fr; }
          .globalStats { gap: 6px; }
          .globalStats div { width: auto; flex: 1; }
        }
      `}</style>
    </main>
  );
}
