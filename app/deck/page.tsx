"use client";

import { useEffect, useState, useMemo } from "react";
import AppHeader from "app/components/AppHeader";

export default function DeckPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [deck, setDeck] = useState<any[]>([]);

  // 🔄 LOAD COLLECTION
    useEffect(() => {
    fetch("/api/collection?userId=adrien")
        .then((r) => r.json())
        .then((data) => {
        console.log("COLLECTION:", data); // 👈 IMPORTANT
        setCards(data.data || data || []);
        });
    }, []);

  // 🔐 SAFE CARD FORMAT
  function normalize(c: any) {
    const card = c.card || c;

    return {
      id: card.id,
      imageUrl:
        card.imageUrl ||
        card?.images?.full ||
        card?.images?.large ||
        null,
      ink: card.ink || null,
      cost: card.cost ?? null,
      name: card.name || "Unknown",
    };
  }

  // ➕ ADD
  function addToDeck(raw: any) {
    const card = normalize(raw);
    if (!card || !card.id) return;

    const count = deck.filter((c) => c.id === card.id).length;

    if (count >= 4) return alert("❌ Max 4 copies");
    if (deck.length >= 60) return alert("❌ Deck plein");

    setDeck([...deck, card]);
  }

  // ➖ REMOVE
  function removeFromDeck(index: number) {
    setDeck(deck.filter((_, i) => i !== index));
  }

  // 🧠 ANALYSE
  const analysis = useMemo(() => {
    const counts: Record<string, number> = {};
    const inks = new Set<string>();
    let costTotal = 0;

    deck.forEach((c) => {
      counts[c.id] = (counts[c.id] || 0) + 1;
      if (c.ink) inks.add(c.ink);
      if (c.cost) costTotal += c.cost;
    });

    return {
      total: deck.length,
      inks: Array.from(inks),
      tooManyCopies: Object.values(counts).some((n) => n > 4),
      tooManyInks: inks.size > 2,
      avgCost: deck.length ? (costTotal / deck.length).toFixed(1) : "0",
    };
  }, [deck]);

  // 📊 COURBE
  const curve = useMemo(() => {
    const c: Record<number, number> = {};

    deck.forEach((card) => {
      const cost = card.cost ?? 0;
      c[cost] = (c[cost] || 0) + 1;
    });

    return c;
  }, [deck]);

  return (
    <main className="shell">
      <AppHeader title="Deck Builder" icon="🃏" />

      {/* 🧠 ANALYSE */}
      <div className="analysis">
        <div>🃏 {analysis.total}/60</div>
        <div>🎨 {analysis.inks.join(", ") || "Aucune"}</div>
        <div>⚖️ {analysis.avgCost}</div>

        {analysis.total < 60 && <div className="warn">⚠️ incomplet</div>}
        {analysis.tooManyInks && <div className="error">❌ 2 encres max</div>}
        {analysis.tooManyCopies && <div className="error">❌ 4 copies max</div>}
      </div>

      {/* 📊 COURBE */}
      <div className="curve">
        {Object.entries(curve).map(([cost, count]) => (
          <div key={cost} className="bar">
            <span>{cost}</span>
            <div className="barFill" style={{ height: count * 10 }} />
          </div>
        ))}
      </div>

      <div className="layout">

        {/* 📚 COLLECTION */}
        <div className="collection">
          <h2>Collection</h2>

<div className="grid">
  {cards.map((c: any, i: number) => {
    const card = c?.card ?? c;

    if (!card) return null;

    const img =
      card?.imageUrl ||
      card?.card_new?.imageUrl || // 🔥 IMPORTANT
      card?.images?.full ||
      card?.images?.large;

    return (
      <div key={card.id + "-" + i} className="cardItem">
        <img
          src={img || "/placeholder-card.png"}
          onClick={() => addToDeck(card)}
        />

        {c?.quantity && (
          <div className="qty">x{c.quantity}</div>
        )}
      </div>
    );
  })}
</div>

        </div>

        {/* 🃏 DECK */}
        <div className="deck">
          <h2>Deck</h2>

          <div className="deckGrid">
            {deck.map((c, i) => (
              <img
                key={c.id + i}
                src={c.imageUrl}
                onClick={() => removeFromDeck(i)}
              />
            ))}
          </div>
        </div>

      </div>

<style jsx>{`

.analysis {
  display: flex;
  gap: 15px;
  margin: 15px 0;
  padding: 10px;
  background: white;
  border-radius: 12px;
}

.warn { color: orange; }
.error { color: red; }

.curve {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  height: 100px;
  margin-bottom: 20px;
}

.bar {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.barFill {
  width: 16px;
  background: #6366f1;
  border-radius: 4px;
}

.cardItem {
  position: relative;
}

.cardItem img {
  width: 100%;
  border-radius: 10px;
  cursor: pointer;
  transition: 0.2s;
}

.cardItem img:hover {
  transform: scale(1.05);
}

.qty {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0,0,0,0.7);
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 6px;
}

.layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 120px);
  gap: 12px;
}

.deckGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

img {
  width: 100%;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.2s;
}

img:hover {
  transform: scale(1.05);
}

`}</style>
    </main>
  );
}