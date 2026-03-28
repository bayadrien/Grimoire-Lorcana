"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "app/components/AppHeader";

export default function OpeningResultContent() {
  const params = useSearchParams();
  const id = params.get("id");

  const [opening, setOpening] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/booster/${id}`)
      .then((r) => r.json())
      .then(setOpening);

    fetch(`/api/booster/history`)
      .then((r) => r.json())
      .then((data) => {
        setHistory(Array.isArray(data) ? data : []);
      });
  }, [id]);

  if (!opening) return <div style={{ padding: 20 }}>Chargement...</div>;

  const newCards = opening.cards.filter((c: any) => !c.alreadyOwned);
  const duplicates = opening.cards.filter((c: any) => c.alreadyOwned);

  return (
    <main className="shell">
      <AppHeader title="Résultat" icon="🎉" />

      <div className="layout">

        {/* LEFT */}
        <div className="left">

          <h2>✨ Nouvelles cartes</h2>
          <div className="cardsRow">
            {newCards.map((c: any, i: number) => (
              <Card key={i} c={c} />
            ))}
          </div>

          <h2>🔁 Doublons</h2>
          <div className="cardsRow">
            {duplicates.map((c: any, i: number) => (
              <Card key={i} c={c} />
            ))}
          </div>

          <div className="stats">
            🆕 {newCards.length} | 🔁 {duplicates.length} | 💰{" "}
            {opening.totalValue.toFixed(2)}€
          </div>
        </div>

        {/* RIGHT */}
        <div className="right">

          <div className="panels">

            {/* HISTORIQUE */}
            <div className="panel">
              <h3>📜 Historique</h3>

              <div className="list">
                {history.map((b, i) => {
                  const name = b.userId === "adrien" ? "Adrien" : "Angèle";

                  return (
                    <div key={i} className="item">
                      <img src={b.boosterImage} />

                      <div className="info">
                        <div className="top">
                          <span className="user">{name}</span>
                          <span>
                            {new Date(b.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className={`value ${b.totalValue > 5 ? "good" : ""}`}>
                          💰 {b.totalValue.toFixed(2)}€
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CLASSEMENT */}
            <div className="panel">
              <h3>🏆 Classement</h3>

              <div className="list">
                {[...history]
                  .sort((a, b) => b.totalValue - a.totalValue)
                  .slice(0, 5)
                  .map((b, i) => {
                    const name = b.userId === "adrien" ? "Adrien" : "Angèle";

                    return (
                      <div key={i} className="item">
                        <span className="rank">#{i + 1}</span>

                        <img src={b.boosterImage} />

                        <div className="info">
                          <div className="user">{name}</div>

                          <div className={`value ${b.totalValue > 5 ? "good" : ""}`}>
                            💰 {b.totalValue.toFixed(2)}€
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>

        </div>
      </div>

<style jsx>{`
/* ===== LAYOUT ===== */
.layout {
  display: grid;
  grid-template-columns: 3fr 1.2fr;
  gap: 20px;
  margin-top: 20px;
  align-items: start;
}

/* ===== LEFT (CARTES) ===== */
.left {
  background: rgba(255,255,255,0.6);
  padding: 15px;
  border-radius: 16px;
}

/* ===== GRID CARTES ===== */
.cardsRow {
  display: grid;
  grid-template-columns: repeat(6, 85px);
  gap: 10px;
}

/* ===== CARTE ===== */
.card {
  width: 90px;        /* largeur fixe propre */
  border-radius: 10px;
  overflow: hidden;
  background: #000;
}

.card img {
  width: 100%;
  height: 100%;
  object-fit: contain;   /* 🔥 LA CLÉ */
}

/* HOVER */
.card:hover {
  transform: scale(1.08);
  z-index: 2;
}

/* FOIL */
.card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent, rgba(255,255,255,0.4), transparent);
  opacity: 0;
}

.card:hover::after {
  opacity: 1;
}

/* ===== STATS ===== */
.stats {
  margin-top: 15px;
  font-weight: bold;
  text-align: center;
}

/* ===== RIGHT SIDE ===== */
.right {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ===== PANELS ===== */
.panels {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.panel {
  background: white;
  padding: 12px;
  border-radius: 14px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.05);
}

/* ===== LIST ===== */
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
}

/* ===== ITEM ===== */
.item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f9f9f9;
  padding: 8px;
  border-radius: 10px;
  transition: 0.2s;
}

.item:hover {
  background: #f0f0f0;
}

/* IMAGE */
.item img {
  width: 42px;
  border-radius: 6px;
}

/* INFO */
.info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.top {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.7;
}

.user {
  font-weight: bold;
  font-size: 13px;
}

/* VALUE */
.value {
  font-size: 13px;
}

.good {
  color: #22c55e;
  font-weight: bold;
}

/* RANK */
.rank {
  font-weight: bold;
  width: 25px;
  text-align: center;
}

/* ===== TITRES ===== */
h2 {
  margin-bottom: 8px;
}

h3 {
  margin-bottom: 10px;
}
`}</style>
    </main>
  );
}

function Card({ c }: any) {
  return (
    <div className={`card ${c.foil ? "foil" : ""}`}>
      <img src={c.card.imageUrl} 
      style={{
            width: "100%",
            height: "auto",
            display: "block"
          }}
          />

      {c.foil && <div className="foilEffect" />}
    </div>
  );
}