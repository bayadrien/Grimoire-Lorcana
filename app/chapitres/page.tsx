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
          pct: 0,
        });
      }

      const row = map.get(c.setCode)!;
      row.total += 1;

      const aHas = (aCol[c.id] ?? 0) > 0;
      const gHas = (gCol[c.id] ?? 0) > 0;

      if (aHas) row.aOwned += 1;
      if (gHas) row.gOwned += 1;
      if (aHas || gHas) row.duoOwned += 1;
    });

    return Array.from(map.values())
      .map((r) => ({
        ...r,
        pct: percent(r.duoOwned, r.total),
      }))
      .sort((a, b) => Number(a.code) - Number(b.code));
  }, [cards, aCol, gCol]);

  /* ================= RENDER ================= */

  return (
    <main className="shell">
            <AppHeader
              title="Grimoire Lorcana"
              subtitle={`10 chapitres`}
              icon="📜"
            />

      <section className="chaptersGrid">
        {chapters.map((ch) => (
          <a
            key={ch.code}
            href={`/chapitres/${ch.code}`}
            className="chapterCard"
            style={{
              backgroundImage: `url(${CHAPTER_BACKGROUNDS[ch.code]})`,
            }}
          >
            <div className="chapterHeader">
              <div>
                <div className="chapterCode">Chapitre {ch.code}</div>
                <div className="chapterName">{ch.name}</div>
              </div>

              <div className="chapterPct">{ch.pct}%</div>
            </div>

            <div className="progressBar">
              <div
                className="progressFill"
                style={{ width: `${ch.pct}%` }}
              />
            </div>

            <div className="chapterFooter">
              <span>Adrien : {ch.aOwned}</span>
              <span>Angèle : {ch.gOwned}</span>
              <span>Total : {ch.total}</span>
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

        .chapterCard {
          position: relative;
          overflow: hidden;
          padding: 18px;
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
            to bottom,
            rgba(0,0,0,.35),
            rgba(0,0,0,.8)
          );
          z-index: 0;
        }

        /* contenu au-dessus du voile */
        .chapterCard > * {
          position: relative;
          z-index: 1;
        }


        .chapterCard:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.6);
        }

        .chapterHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .chapterCode {
          font-weight: 900;
          font-size: 18px;
        }

        .chapterName {
          opacity: 0.85;
          margin-top: 4px;
        }

        .chapterPct {
          font-weight: 900;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.25);
        }

        .progressBar {
          margin-top: 14px;
          height: 12px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          overflow: hidden;
        }

        .progressFill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.4s ease;
          background: linear-gradient(90deg, #2ecc71, #27ae60);
        }

        .chapterFooter {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          opacity: 0.9;
        }

        /* Couleurs par progression */
        .pct-0 .progressFill,
        .pct-1 .progressFill,
        .pct-2 .progressFill {
          background: linear-gradient(90deg, #ff6b6b, #c0392b);
        }

        .pct-3 .progressFill,
        .pct-4 .progressFill,
        .pct-5 .progressFill,
        .pct-6 .progressFill {
          background: linear-gradient(90deg, #f6b93b, #e67e22);
        }

        .pct-7 .progressFill,
        .pct-8 .progressFill,
        .pct-9 .progressFill,
        .pct-10 .progressFill {
          background: linear-gradient(90deg, #2ecc71, #27ae60);
        }
      `}</style>
    </main>
  );
}
