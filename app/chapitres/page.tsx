"use client";

import { useEffect, useMemo, useState } from "react";
import { CHAPTERS_NAMES_FR } from "@/lib/chapters-fr";

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
  owned: number;
  pct: number;
};

/* ================= UTILS ================= */

function percent(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

/* ================= PAGE ================= */

export default function ChapitresPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [collection, setCollection] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  /* ================= LOAD ================= */

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [cardsRes, colRes] = await Promise.all([
        fetch("/api/cards", { cache: "no-store" }),
        fetch("/api/collection?userId=adrien", { cache: "no-store" }),
      ]);

      const cardsData = await cardsRes.json();
      const colData: ColRow[] = await colRes.json();

      const colMap: Record<string, number> = {};
      colData.forEach((r) => {
        colMap[r.cardId] = (colMap[r.cardId] ?? 0) + r.quantity;
      });

      setCards(Array.isArray(cardsData) ? cardsData : []);
      setCollection(colMap);
      setLoading(false);
    }

    load();
  }, []);

  /* ================= STATS ================= */

  const chapters: ChapterStats[] = useMemo(() => {
    const map: Record<string, ChapterStats> = {};

    cards.forEach((c) => {
      if (!c.setCode) return;
      if (!/^\d+$/.test(c.setCode)) return;

      if (!map[c.setCode]) {
        map[c.setCode] = {
          code: c.setCode,
          name:
            CHAPTERS_NAMES_FR[c.setCode] ??
            c.setName ??
            `Chapitre ${c.setCode}`,
          total: 0,
          owned: 0,
          pct: 0,
        };
      }

      map[c.setCode].total += 1;
      if ((collection[c.id] ?? 0) > 0) {
        map[c.setCode].owned += 1;
      }
    });

    return Object.values(map)
      .map((c) => ({
        ...c,
        pct: percent(c.owned, c.total),
      }))
      .sort((a, b) => Number(a.code) - Number(b.code));
  }, [cards, collection]);

  /* ================= RENDER ================= */

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="sigil">📚</div>
          <div>
            <h1>Grimoire des chapitres</h1>
            <p>
              {loading
                ? "⏳ Chargement…"
                : `${chapters.length} chapitres`}
            </p>
          </div>
        </div>
      </header>

      <section className="chaptersGrid">
        {chapters.map((ch) => (
          <a
            key={ch.code}
            href={`/chapitres/${ch.code}`}
            className={`chapterCard pct-${Math.floor(ch.pct / 10)}`}
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
              <span>
                Possédées : <b>{ch.owned}</b>
              </span>
              <span>
                Total : <b>{ch.total}</b>
              </span>
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
          display: block;
          padding: 18px;
          border-radius: 22px;
          background: linear-gradient(
            160deg,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.02)
          );
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(8px);
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
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
