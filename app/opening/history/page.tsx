"use client";

import AppHeader from "app/components/AppHeader";
import { useEffect, useState } from "react";

export default function OpeningHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);

  const [userFilter, setUserFilter] = useState("all");
  const [chapterFilter, setChapterFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const toEuro = (usd?: number) => (usd ? usd * 0.92 : 0);

  useEffect(() => {
    fetch("/api/booster/history")
      .then((r) => r.json())
      .then(setHistory);
  }, []);

  return (
    <main className="shell">
      <AppHeader title="Historique des ouvertures" icon="📜" />

      {/* 🎛️ FILTRES */}
      <div className="filters">

        <select onChange={(e) => setUserFilter(e.target.value)}>
          <option value="all">👤 Tous</option>
          <option value="adrien">Adrien</option>
          <option value="angele">Angèle</option>
        </select>

        <select onChange={(e) => setChapterFilter(e.target.value)}>
          <option value="all">📚 Tous chapitres</option>
          <option value="1">🪄 Chapitre 1</option>
          <option value="2">🟣 Chapitre 2</option>
          <option value="3">⛰️ Chapitre 3</option>
          <option value="4">🌊 Chapitre 4</option>
          <option value="5">✨ Chapitre 5</option>
          <option value="6">⛵ Chapitre 6</option>
          <option value="7">🏝️ Chapitre 7</option>
          <option value="8">🏜️ Chapitre 8</option>
          <option value="9">☀️ Chapitre 9</option>
          <option value="10">🌋 Chapitre 10</option>
          <option value="11">❄️ Chapitre 11</option>
        </select>

        <select onChange={(e) => setSortBy(e.target.value)}>
          <option value="date">🕒 Plus récent</option>
          <option value="value">💰 Valeur</option>
        </select>

      </div>

      {/* 📦 GRID */}
      <div className="grid">
        {[...history]

          // 👤 filtre joueur
          .filter((b) => {
            if (userFilter === "all") return true;
            return b.userId === userFilter;
          })

          // 📚 filtre chapitre
          .filter((b) => {
            if (chapterFilter === "all") return true;
            return String(b.chapter) === chapterFilter;
          })

          // 🔽 tri
          .sort((a, b) => {

            const getValue = (booster: any) =>
              (booster.cards || []).reduce((sum: number, c: any) => {
                const v = c.foil
                  ? toEuro(c.card?.usd_foil)
                  : toEuro(c.card?.usd);
                return sum + v;
              }, 0);

            if (sortBy === "value") {
              return getValue(b) - getValue(a);
            }

            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })

          .map((b) => {

            const name = b.userId === "adrien" ? "Adrien" : "Angèle";

            // 💰 valeur booster
            const value = (b.cards || []).reduce((sum: number, c: any) => {
              const v = c.foil
                ? toEuro(c.card?.usd_foil)
                : toEuro(c.card?.usd);
              return sum + v;
            }, 0);

            // 🏆 TOP 3 CARTES (les plus chères)
            const bestCards = [...(b.cards || [])]
              .map((c: any) => ({
                ...c,
                val: c.foil
                  ? toEuro(c.card?.usd_foil)
                  : toEuro(c.card?.usd),
              }))
              .sort((a, b) => b.val - a.val)
              .slice(0, 3);

return (
  <div
    key={b.id}
    className="boosterCard"
    onClick={() => window.location.href = `/opening/result?id=${b.id}`}
  >

    {/* IMAGE BOOSTER */}
    <img src={b.boosterImage} />

    <div className="info">

      <div>
        <div className="title">
          🎴 Booster #{b.id.slice(0, 6)}
        </div>

        <div className="user">
          👤 {name} • Chapitre {b.chapter}
        </div>
      </div>

      <div className="date">
        {new Date(b.createdAt).toLocaleDateString()}
      </div>

      <div className={`value ${value > 5 ? "good" : ""}`}>
        💰 {value.toFixed(2)}€
      </div>

      {/* 💎 TOP CARTES */}
      <div className="miniCards">
        {bestCards.map((c: any) => (
          <img key={c.id} src={c.card?.imageUrl} />
        ))}
      </div>

    </div>

    {/* 👇 POPUP (A METTRE ICI, EN DERNIER) */}
    <div className="hoverPopup">
      {b.cards?.map((c: any) => (
        <img key={c.id} src={c.card?.imageUrl} />
      ))}
    </div>

  </div>
);
          })}
      </div>

      <style jsx>{`

        .filters {
          display: flex;
          gap: 10px;
          margin: 20px 0;
        }

        .filters select {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #ddd;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }

        .boosterCard {
          background: white;
          border-radius: 14px;
          padding: 12px;
          display: flex;
          gap: 12px;
          align-items: center;
          transition: 0.25s;
          cursor: pointer;
          position: relative;
          overflow: visible;
          z-index: 1;
        }

        .hoverPopup {
          position: absolute;
          top: 110%;
          left: 50%;
          transform: translateX(-50%) scale(0.95);

          width: 260px;
          padding: 10px;
          border-radius: 12px;

          background: rgba(20,20,20,0.95);
          backdrop-filter: blur(10px);

          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;

          opacity: 0;
          pointer-events: none;

          transition: 0.2s ease;
          z-index: 999; /* 🔥 important */
        }

          /* ✨ apparition */
          .boosterCard:hover .hoverPopup {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }

          /* cartes */
          .hoverPopup img {
            width: 100%;
            border-radius: 6px;
          }

        .boosterCard:hover {
          z-index: 100;
          transform: translateY(-4px) scale(1.02);
        }

        /* 🔥 AU HOVER */
        .boosterCard:hover .hoverCards {
          opacity: 1;
        }

        .boosterCard:hover .hoverCards img {
          opacity: 1;
          transform: scale(1);
        }

        /* délai progressif */
        .hoverCards img:nth-child(1) { transition-delay: 0.02s; }
        .hoverCards img:nth-child(2) { transition-delay: 0.04s; }
        .hoverCards img:nth-child(3) { transition-delay: 0.06s; }
        .hoverCards img:nth-child(4) { transition-delay: 0.08s; }
        .hoverCards img:nth-child(5) { transition-delay: 0.10s; }
        .hoverCards img:nth-child(6) { transition-delay: 0.12s; }

        .boosterCard img {
          width: 70px;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
        }

          .hoverCards img {
            width: 100%;
            border-radius: 6px;

            transform: scale(0.9);
            opacity: 0;
            transition: 0.2s ease;
          }

        .info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .title {
          font-weight: 600;
        }

        .user {
          font-size: 13px;
          opacity: 0.7;
        }

        .date {
          font-size: 12px;
          opacity: 0.6;
        }

        .value {
          font-weight: bold;
        }

        .good {
          color: #22c55e;
        }

        .miniCards {
          display: flex;
          margin-top: 6px;
        }

        .miniCards img {
          width: 30px;
          border-radius: 4px;
          margin-right: -8px;
          border: 2px solid white;
        }

      `}</style>
    </main>
  );
}