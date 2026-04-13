"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "app/components/AppHeader";

export default function OpeningResultContent() {
  const params = useSearchParams();
  const id = params.get("id");

  const [opening, setOpening] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const toEuro = (usd?: number) =>
    usd ? usd * 0.92 : 0;

  useEffect(() => {
    if (!id) return;

    fetch(`/api/booster/${id}`)
      .then((r) => r.json())
      .then(setOpening);

    fetch(`/api/booster/history`)
      .then((r) => r.json())
      .then(setHistory);
  }, [id]);

  if (!opening) return <div style={{ padding: 20 }}>Chargement...</div>;

  // 🧠 enrichissement cartes
  const cards = opening.cards.map((c: any) => {
    const price = c.foil ? toEuro(c.card.usd_foil) : toEuro(c.card.usd);

    return {
      ...c,
      value: price,
      isNew: !c.alreadyOwned,
      isUseful: c.alreadyOwned && !c.otherOwned,
    };
  });

  const newCards = cards.filter((c: any) => c.isNew);
  const duplicates = cards.filter((c: any) => !c.isNew);

  const useful = cards.filter((c: any) => c.isUseful);
  const useless = cards.filter((c: any) => c.alreadyOwned && c.otherOwned);

  const totalValue = cards.reduce((sum: number, c: any) => sum + c.value, 0);

  return (
    <main className="shell">
      <AppHeader title="Résultat" icon="🎉" />

      {/* HEADER BOOSTER */}
<div className="headerBox">

  {/* GAUCHE = identité booster */}
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
     <img src={opening.boosterImage} style={{ width: 80, borderRadius: 12 }} />

    <div>
      <div style={{ fontWeight: 600 }}>
        Booster #{opening.id.slice(0, 6)}
      </div>

      <div>
        Chapitre {opening.chapter}
      </div>

      <div style={{ fontSize: 12, opacity: 0.6 }}>
        👤 {opening.userId}
      </div>

      <div style={{ fontSize: 12, opacity: 0.6 }}>
        📅 {new Date(opening.createdAt).toLocaleDateString()}
      </div>
    </div>
  </div>

  {/* CENTRE = valeur */}
  <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 12 }}>Valeur</div>
    <div style={{ fontWeight: "bold", fontSize: 18 }}>
      💰 {totalValue.toFixed(2)}€
    </div>
  </div>

  {/* DROITE = stats */}
  <div style={{ display: "flex", gap: 12 }}>
    <div>🆕 {newCards.length}</div>
    <div>🎁 {useful.length}</div>
    <div>🔁 {useless.length}</div>
  </div>

</div>

      <div className="layout">

        {/* LEFT */}
        <div className="left">

          <h2>✨ Cartes</h2>

          <div className="cardsGrid">
            {cards.map((c: any, i: number) => (
              <Card key={i} c={c} />
            ))}
          </div>

        </div>

        {/* RIGHT */}
        <div className="right">

          {/* HISTORIQUE */}
          <div className="panel">
            <h3>📜 Historique</h3>

            <div className="list">
              {history.map((b, i) => {
                console.log(b.cards);
                const value = (b.cards || []).reduce((sum: number, c: any) => {
                  const v = c.foil
                    ? toEuro(c.card?.usd_foil ?? c.usd_foil)
                    : toEuro(c.card?.usd ?? c.usd);
                  return sum + v;
                }, 0);

                const name = b.userId === "adrien" ? "Adrien" : "Angèle";

                return (
                <div key={i} className="item">
                  <img src={b.boosterImage} />

                  <div className="info">
                    <div>
                      <strong>{name}</strong>
                    </div>

                    <div>
                      {new Date(b.createdAt).toLocaleDateString()}
                    </div>

                    <div>
                      💰 {value.toFixed(2)}€
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
                .map((b) => {
                  const value = (b.cards || []).reduce((sum: number, c: any) => {
                    const v = c.foil
                      ? toEuro(c.card?.usd_foil ?? c.usd_foil)
                      : toEuro(c.card?.usd ?? c.usd);
                    return sum + v;
                  }, 0);

                  return { ...b, computedValue: value };
                })
                .sort((a, b) => b.computedValue - a.computedValue)
                .slice(0, 5)
                .map((b, i) => {
                  console.log(b.cards);
                  const name = b.userId === "adrien" ? "Adrien" : "Angèle";

                  return (
                    <div key={i} className="item">
                      <div className="rank">#{i + 1}</div>

                      <img src={b.boosterImage} />

                      <div className="info">
                        <div><strong>{name}</strong></div>

                        <div>
                          💰 {b.computedValue.toFixed(2)}€
                        </div>
                      </div>

                    </div>
                  );
                })}
            </div>
          </div>

        </div>
      </div>

<style jsx global>{`

.card {
  width: 140px;
  aspect-ratio: 0.7;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.5s ease, box-shadow 0.5s ease;
  background: #000;
}

.card img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.cardValue {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0,0,0,0.7);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
}

.headerBox {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #ffffff, #f8fafc);
  padding: 16px;
  border-radius: 16px;
  margin-bottom: 20px;
  box-shadow: 0 8px 25px rgba(0,0,0,0.05);
}

.leftHeader img {
  width: 60px;
  border-radius: 8px;
}

.title {
  font-size: 16px;
  font-weight: 600;
}

.value {
  color: #16a34a;
  font-size: 18px;
}

.statsHeader {
  display: flex;
  gap: 15px;
  font-weight: bold;
}

.layout {
  display: grid;
  grid-template-columns: 3fr 1.2fr;
  gap: 20px;
}



.cardsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 140px);
  gap: 20px;
}


/* HOVER */
.card:hover {
  transform: scale(1.05);
  z-index: 2;
}

/* 🟢 NOUVELLE */
.card.new {
  box-shadow: 0 0 15px #22c55e, 0 0 30px rgba(34,197,94,0.3);
}

/* 🔵 UTILE */
.card.useful {
  box-shadow: 0 0 15px #3b82f6, 0 0 25px rgba(59,130,246,0.3);
}

/* ⚫ INUTILE */
.card.useless {
  opacity: 0.4;
  filter: grayscale(60%);
}

.panel {
  background: white;
  padding: 12px;
  border-radius: 14px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.item {
  display: flex;
  gap: 10px;
  background: white;
  padding: 10px;
  border-radius: 12px;
  align-items: center;
  transition: 0.2s;
  cursor: pointer;
}

.item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
}

.item img {
  width: 50px;
  border-radius: 6px;
}

.rank {
  font-weight: bold;
}

/* ✨ FOIL */
.card.foil::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    transparent 20%,
    rgba(255,255,255,0.6),
    rgba(0,255,255,0.4),
    rgba(255,0,255,0.4),
    transparent 80%
  );
  opacity: 0.7;
  mix-blend-mode: overlay;
  animation: holo 2s linear infinite;
}

@keyframes holo {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.card.foil {
  box-shadow:
    0 0 10px rgba(255,255,255,0.6),
    0 0 20px rgba(0,255,255,0.4),
    0 0 30px rgba(255,0,255,0.3);
}
    
.good {
  color: #22c55e;
  font-weight: bold;
}
`}</style>
    </main>
  );
}

function Card({ c }: any) {
 const img =
  c.card?.images?.full ||
  c.card?.images?.large ||
  c.card?.imageUrl ||
  c.imageUrl;

  console.log(c.card);

  // 🔥 sécurité anti image cassée
  if (!img) return null;

return (
  <div
    className={`card 
      ${c.isNew ? "new" : ""}
      ${c.isUseful ? "useful" : ""}
      ${c.alreadyOwned && c.otherOwned ? "useless" : ""}
      ${c.foil === true ? "foil" : ""}
    `}
  >
    <img src={img} />

    {/* 💰 VALEUR CARTE */}
    <div className="cardValue">
      💰 {c.value.toFixed(2)}€
    </div>

  </div>
);
}