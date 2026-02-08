"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CHAPTERS_NAMES_FR } from "@/lib/chapters-fr";
import { tInk } from "@/lib/lorcana-fr";
import AppHeader from "app/components/AppHeader";

/* ============================================================
   TYPES
============================================================ */

type Card = {
  id: string;
  setCode?: string | null;
  setName: string;
  ink?: string | null;
};

type ColRow = {
  cardId: string;
  quantity: number;
};

type ChapterStat = {
  code: string;
  name: string;
  total: number;
  aOwned: number;
  gOwned: number;
  duoOwned: number;
};

/* ============================================================
   UTILS
============================================================ */

const pct = (a: number, b: number) =>
  b === 0 ? 0 : Math.round((a / b) * 100);

const badgeForPct = (p: number) => {
  if (p === 100) return "💎 Complet";
  if (p >= 75) return "🥇 Or";
  if (p >= 50) return "🥈 Argent";
  if (p >= 25) return "🥉 Bronze";
  return "🔰 Début";
};

/* ============================================================
   PAGE
============================================================ */

export default function StatsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [aCol, setACol] = useState<Record<string, number>>({});
  const [gCol, setGCol] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

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

      aData.forEach((r) => (aMap[r.cardId] = (aMap[r.cardId] ?? 0) + r.quantity));
      gData.forEach((r) => (gMap[r.cardId] = (gMap[r.cardId] ?? 0) + r.quantity));

      setCards(cardsData);
      setACol(aMap);
      setGCol(gMap);
      setLoading(false);
    }

    load();
  }, []);

  /* ================= GLOBAL ================= */

  const global = useMemo(() => {
    let a = 0,
      g = 0,
      duo = 0;

    cards.forEach((c) => {
      const ah = (aCol[c.id] ?? 0) > 0;
      const gh = (gCol[c.id] ?? 0) > 0;
      if (ah) a++;
      if (gh) g++;
      if (ah || gh) duo++;
    });

    return {
      total: cards.length,
      a,
      g,
      duo,
      pct: pct(duo, cards.length),
    };
  }, [cards, aCol, gCol]);

  /* ================= CHAPTERS ================= */

  const chapters = useMemo(() => {
    const map = new Map<string, ChapterStat>();

    cards.forEach((c) => {
      if (!c.setCode || !/^\d+$/.test(c.setCode)) return;

      if (!map.has(c.setCode)) {
        map.set(c.setCode, {
          code: c.setCode,
          name: CHAPTERS_NAMES_FR[c.setCode] ?? `Chapitre ${c.setCode}`,
          total: 0,
          aOwned: 0,
          gOwned: 0,
          duoOwned: 0,
        });
      }

      const row = map.get(c.setCode)!;
      row.total++;

      const ah = (aCol[c.id] ?? 0) > 0;
      const gh = (gCol[c.id] ?? 0) > 0;

      if (ah) row.aOwned++;
      if (gh) row.gOwned++;
      if (ah || gh) row.duoOwned++;
    });

    return [...map.values()].sort((a, b) => Number(a.code) - Number(b.code));
  }, [cards, aCol, gCol]);

  /* ================= INKS ================= */

  const inks = useMemo(() => {
    const map: Record<string, { a: number; g: number }> = {};

    cards.forEach((c) => {
      if (!c.ink) return;
      if (!map[c.ink]) map[c.ink] = { a: 0, g: 0 };
      if ((aCol[c.id] ?? 0) > 0) map[c.ink].a++;
      if ((gCol[c.id] ?? 0) > 0) map[c.ink].g++;
    });

    return map;
  }, [cards, aCol, gCol]);

  /* ================= RENDER ================= */

  return (
    <main className="shell">
      <AppHeader
        title="Statistiques"
        subtitle="Adrien VS Angèle"
        icon="📜"
      />
      {/* ================= GLOBAL ================= */}

      <section className="global">
        <div className="globalCard duo">
          <div className="label">Progression DUO</div>
          <div className="value">{global.pct}%</div>
          <div className="sub">
            {global.duo} / {global.total}
          </div>
        </div>

        <div className="globalCard adrien">
          <div className="label">Adrien</div>
          <div className="value">{global.a}</div>
        </div>

        <div className="globalCard angele">
          <div className="label">Angèle</div>
          <div className="value">{global.g}</div>
        </div>
      </section>

      {/* ================= MAP ================= */}

      <section className="map">
        <h2>🗺️ Carte de progression Lorcana</h2>

        <svg viewBox="0 0 1200 260" className="lorcanaMap">
          {/* Ligne principale */}
          <line
            x1="80"
            y1="130"
            x2="1120"
            y2="130"
            stroke="#cfd8e3"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {chapters.map((c, i) => {
            const dPct = pct(c.duoOwned, c.total);
            const x = 100 + i * 95;

            return (
              <motion.g
                key={c.code}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                {/* Cercle chapitre */}
                <circle
                  cx={x}
                  cy={130}
                  r={28}
                  fill={`hsl(${120 * (dPct / 100)}, 70%, 55%)`}
                  stroke="#ffffff"
                  strokeWidth="4"
                />

                {/* Numéro */}
                <text
                  x={x}
                  y={136}
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="900"
                  fill="#1f2937"
                >
                  {c.code}
                </text>

                {/* Pourcentage */}
                <text
                  x={x}
                  y={175}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="700"
                  fill="#4b5563"
                >
                  {dPct}%
                </text>

                {/* Nom */}
                <text
                  x={x}
                  y={200}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6b7280"
                >
                  {c.name}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </section>


      {/* ================= CHAPTERS ================= */}

      <section className="chapters">
        <h2>📚 Chapitres</h2>

        {chapters.map((c, i) => {
          const aPct = pct(c.aOwned, c.total);
          const gPct = pct(c.gOwned, c.total);
          const dPct = pct(c.duoOwned, c.total);

          const champion =
            aPct === gPct ? "🤝" : aPct > gPct ? "Adrien 👑" : "Angèle 👑";

          return (
            <motion.div
              key={c.code}
              className="chapterRow"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="chapterHead">
                <div>
                  <div className="chapterTitle">
                    Chapitre {c.code} – {c.name}
                  </div>
                  <div className="badge">{badgeForPct(dPct)}</div>
                </div>
                <div className="champion">{champion}</div>
              </div>

              <div className="chapterBars">

                <div className="barRow">
                  <span className="barLabel adrien">Adrien</span>
                  <div className="barTrack">
                    <div
                      className="barFill adrien"
                      style={{ width: `${pct(c.aOwned, c.total)}%` }}
                    />
                  </div>
                  <span className="barValue">
                    {pct(c.aOwned, c.total)}%
                  </span>
                </div>

                <div className="barRow">
                  <span className="barLabel angele">Angèle</span>
                  <div className="barTrack">
                    <div
                      className="barFill angele"
                      style={{ width: `${pct(c.gOwned, c.total)}%` }}
                    />
                  </div>
                  <span className="barValue">
                    {pct(c.gOwned, c.total)}%
                  </span>
                </div>

                <div className="barRow">
                  <span className="barLabel duo">Duo</span>
                  <div className="barTrack">
                    <div
                      className="barFill duo"
                      style={{ width: `${pct(c.duoOwned, c.total)}%` }}
                    />
                  </div>
                  <span className="barValue">
                    {pct(c.duoOwned, c.total)}%
                  </span>
                </div>

              </div>

            </motion.div>
          );
        })}
      </section>

      {/* ================= INKS ================= */}

      <section className="inks">
        <h2>🎨 Encres</h2>

        {Object.entries(inks).map(([k, v]) => {
          const total = v.a + v.g;
          return (
            <div key={k} className="inkRow">
              <span>{tInk(k)}</span>
              <span>
                Adrien {v.a} / Angèle {v.g} • {total}
              </span>
            </div>
          );
        })}
      </section>

      {/* ================= STYLES ================= */}

      <style jsx>{`
        .global {
          display: grid;zz
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin: 20px 0;
        }

        .globalCard {
          border-radius: 18px;
          padding: 18px;
          background: linear-gradient(135deg, #fff, #f4f7fb);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }

        .globalCard.duo {
          background: linear-gradient(135deg, #d4fc79, #96e6a1);
        }

        .globalCard.adrien {
          background: linear-gradient(135deg, #cfd9df, #e2ebf0);
        }

        .globalCard.angele {
          background: linear-gradient(135deg, #fbc8d4, #fcdde5);
        }

        .label {
          font-weight: 700;
          opacity: 0.7;
        }

        .value {
          font-size: 36px;
          font-weight: 900;
        }

        .map {
          margin: 48px 0 64px;
          padding: 36px 40px 42px;
          border-radius: 32px;

          background:
            radial-gradient(
              circle at top,
              #ffffff 0%,
              #f3f6fb 45%,
              #e9eef7 100%
            );

          box-shadow:
            0 25px 60px rgba(0,0,0,0.12),
            inset 0 1px 0 rgba(255,255,255,0.95);

          border: 1px solid rgba(255,255,255,0.6);
        }

        <div className="sectionSeparator">
          <span />
        </div>

        .sectionSeparator {
          margin: 20px 0 50px;
          display: flex;
          justify-content: center;
        }

        .sectionSeparator span {
          width: 140px;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            rgba(0,0,0,0),
            rgba(0,0,0,0.18),
            rgba(0,0,0,0)
          );
        }

        .chapters {
          margin-top: 48px;
          display: flex;
          flex-direction: column;
          gap: 34px; /* 🔑 ESPACEMENT ENTRE CHAPITRES */
        }

        .chapterRow {
          background:
            linear-gradient(180deg, #ffffff, #f5f7fb);

          border-radius: 26px;
          padding: 26px 28px 30px;

          box-shadow:
            0 18px 45px rgba(0,0,0,0.10),
            inset 0 1px 0 rgba(255,255,255,0.95);

          border: 1px solid rgba(0,0,0,0.06);

          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .chapterRow:hover {
          transform: translateY(-4px);
          box-shadow:
            0 25px 60px rgba(0,0,0,0.16);
        }

        .chapterHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chapterTitle {
          font-weight: 800;
        }

        .badge {
          margin-top: 4px;
          font-size: 13px;
          opacity: 0.8;
        }

        .bars {
          margin-top: 12px;
          display: grid;
          gap: 6px;
        }

        .bar {
          position: relative;
          height: 8px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.1);
        }

        .bar span {
          position: absolute;
          height: 100%;
          border-radius: 999px;
        }

        .bar.adrien span {
          background: linear-gradient(90deg, #74ebd5, #9face6);
        }

        .bar.duo span {
          background: linear-gradient(90deg, #43e97b, #38f9d7);
        }

        .bar.angele span {
          background: linear-gradient(90deg, #fa709a, #fee140);
        }

        .bar label {
          position: absolute;
          right: 0;
          top: -18px;
          font-size: 12px;
          opacity: 0.7;
        }

        .inks {
          margin-top: 40px;
        }

        .inkRow {
          display: flex;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 12px;
          background: #f6f8fb;
          margin-bottom: 6px;
        }

        .lorcanaMap {
          margin-top: 24px;
          width: 100%;
          overflow: visible;
        }

        .map {
          margin: 40px 0;
          padding: 26px 24px 32px;
          border-radius: 26px;
          background: linear-gradient(135deg, #f8fafc, #eef2f7);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.9),
            0 10px 30px rgba(0,0,0,0.08);
        }

        .chapterBars {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 18px;
        }

        .barRow {
          display: grid;
          grid-template-columns: 70px 1fr 48px;
          align-items: center;
          gap: 12px;
        }

        .barLabel {
          font-size: 13px;
          font-weight: 700;
          opacity: 0.9;
        }

        .barLabel.adrien { color: #4f7cff; }
        .barLabel.angele { color: #b57cff; }
        .barLabel.duo    { color: #2ecc71; }

        .barTrack {
          height: 10px;
          background: rgba(0,0,0,0.08);
          border-radius: 999px;
          overflow: hidden;
        }

        .barFill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.5s ease;
        }

        .barFill.adrien {
          background: linear-gradient(90deg, #4f7cff, #6fa0ff);
        }

        .barFill.angele {
          background: linear-gradient(90deg, #b57cff, #d3a6ff);
        }

        .barFill.duo {
          background: linear-gradient(90deg, #2ecc71, #6ee7a8);
        }

        .barValue {
          font-size: 12px;
          font-weight: 700;
          text-align: right;
          opacity: 0.85;
        }

      `}</style>
    </main>
  );
}
