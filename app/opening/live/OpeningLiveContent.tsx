"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "app/components/AppHeader";

type Card = {
  id: string;
  name: string;
  name_fr?: string;
  collection_number?: string;
  usd?: number;
  usd_foil?: number;
  imageUrl: string;
  isNew?: boolean;
  quantity?: number;
  forOtherUser?: boolean;
  foil?: boolean;
};

export default function OpeningLiveContent() {
  const params = useSearchParams();

  const chapter = params.get("chapter") || "";
  const boosterImage = decodeURIComponent(params.get("booster") || "");

  const [cards, setCards] = useState<Card[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);

  const [collection, setCollection] = useState<Record<string, number>>({});
  const [otherCollection, setOtherCollection] = useState<Record<string, number>>({});

  // 💱 conversion €
  const toEuro = (usd?: number) =>
    usd ? (usd * 0.92).toFixed(2) + "€" : "-";

  // 🔥 Total Somme
const totalValue = cards.reduce((sum, c) => {
  const price = c.foil ? c.usd_foil : c.usd;
  return sum + (price || 0);
}, 0);

const progress = (cards.length / 12) * 100;

  // ================== LOAD COLLECTION ==================
  useEffect(() => {
    async function load() {
      const me = localStorage.getItem("activeUser") || "adrien";
      const other = me === "adrien" ? "angele" : "adrien";

      const [mine, otherC] = await Promise.all([
        fetch(`/api/collection?userId=${me}`).then((r) => r.json()),
        fetch(`/api/collection?userId=${other}`).then((r) => r.json()),
      ]);

      const map: any = {};
      mine.forEach((c: any) => {
        map[c.cardId] = c.quantity;
      });

      const otherMap: any = {};
      otherC.forEach((c: any) => {
        otherMap[c.cardId] = c.quantity;
      });

      setCollection(map);
      setOtherCollection(otherMap);
    }

    load();
  }, []);

  // ================== SUGGESTIONS ==================
  async function handleChange(value: string) {
    setInput(value);

    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }

    const res = await fetch(
      `/api/cards?q=${encodeURIComponent(value)}&chapter=${chapter}`
    );

    const data = await res.json();
    setSuggestions(Array.isArray(data) ? data : []);
  }

  // ================== ADD CARD ==================
  function enrichCard(card: any): Card {
    const isNew = !collection[card.id];
    const quantity = collection[card.id] || 0;
    const forOtherUser = !otherCollection[card.id];

    return {
      ...card,
      isNew,
      quantity,
      forOtherUser,
    };
  }

  async function handleAdd() {
    if (!input) return;

    const res = await fetch(
      `/api/cards?q=${encodeURIComponent(input)}&chapter=${chapter}`
    );

    const data = await res.json();

    if (!data || data.length === 0) {
      alert("Carte introuvable");
      return;
    }

    if (data.length > 1) {
      alert("Plusieurs cartes trouvées");
      return;
    }

    const enriched = enrichCard(data[0]);

    setCards((prev) => [...prev, enriched]);
    setInput("");
    setSuggestions([]);
  }

  function removeLastCard() {
    setCards((prev) => prev.slice(0, -1));
  }

  function toggleFoil() {
    setCards((prev) => {
      const copy = [...prev];
      const index = copy.length - 1;

      if (index < 0) return prev;

      copy[index] = {
        ...copy[index],
        foil: !copy[index].foil,
      };

      return copy;
    });
  }

  const lastCard = cards[cards.length - 1];
  const isFoilCard = cards.length === 11 || cards.length === 12;

  return (
    <main className="shell">
      <AppHeader title="Ouverture" icon="✨" />

      <section className="layout">

        {/* LEFT */}
        <div className="left">
          {lastCard && (
            <>
              <div className={lastCard?.foil ? "foilCard current" : "current"}>
                <img src={lastCard.imageUrl} />
              </div>

              {isFoilCard && (
                <button className="foilBtn" onClick={toggleFoil}>
                  ✨ {lastCard?.foil ? "Foil activée" : "Mettre en foil"}
                </button>
              )}
            </>
          )}
        </div>

        {/* RIGHT */}
        <div className="right">

  {/* BOOSTER + VALUE */}
  <div className="boosterBox">
    {boosterImage && <img src={boosterImage} />}
    <div className="value">💰 {toEuro(totalValue)}</div>
  </div>

  {/* PROGRESS */}
  <div className="progressBar">
    <div
      className="progressFill"
      style={{ width: `${progress}%` }}
    />
  </div>

  <div className="progressText">
    🎴 {cards.length} / 12
  </div>

  {/* SEARCH */}
  <div className="searchBox">
    <input
      className="pill input"
      value={input}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && handleAdd()}
      placeholder="Nom ou numéro"
    />

    <button className="btn" onClick={handleAdd}>
      Valider
    </button>

    <button className="undoBtn" onClick={removeLastCard}>
      ↩️ Annuler
    </button>
  </div>

  {/* SUGGESTIONS */}
  {suggestions.length > 0 && (
    <div className="suggestions">
      {suggestions.map((c, i) => (
        <div
          key={i}
          className="suggestionItem"
          onClick={() => {
            const enriched = enrichCard(c);
            setCards((prev) => [...prev, enriched]);
            setInput("");
            setSuggestions([]);
          }}
        >
          <img src={c.imageUrl} />
          <span>{c.name}</span>
        </div>
      ))}
    </div>
  )}

  {/* CARD INFO */}
  {lastCard && (
    <div className="cardInfo">

      <div className="title">
        {lastCard.name_fr || lastCard.name}
      </div>

      <div className="number">
        #{lastCard.collection_number || "-"}
      </div>

      <div className="prices">
        <div>💰 {toEuro(lastCard.usd)}</div>
        <div>✨ {toEuro(lastCard.usd_foil)}</div>
      </div>

      <div className="badges">
        {lastCard.isNew && <span className="badge new">🆕 Nouvelle</span>}
        {lastCard.quantity! > 0 && (
          <span className="badge dup">🔁 x{lastCard.quantity}</span>
        )}
        {lastCard.forOtherUser && (
          <span className="badge gift">🎁 Utile</span>
        )}
      </div>

    </div>
  )}

  {/* FINISH BUTTON */}
  {cards.length === 12 && (
    <button
      className="finish"
      onClick={async () => {
        if (loading) return;
        setLoading(true);

        const userId = localStorage.getItem("activeUser") || "adrien";

        await fetch("/api/collection/addBooster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, cards }),
        });

        const res = await fetch("/api/booster/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            chapter,
            boosterImage,
            cards,
          }),
        });

        const data = await res.json();

        window.location.href = `/opening/result?id=${data.id}`;
      }}
    >
      🎉 Terminer le booster
    </button>
  )}

</div>

        {/* HISTORY */}
        <div className="historyFull">
          {cards.map((c, i) => (
            <img key={i} src={c.imageUrl} />
          ))}
        </div>

      </section>

      <style jsx>{`
        .layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          max-width: 900px;
          margin: auto;
        }

        .left {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .right {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .current img {
          width: 100%;
          max-width: 320px;
          border-radius: 12px;
        }

.searchBox {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

        .cardInfo {
          background: white;
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .title {
          font-weight: bold;
          font-size: 16px;
        }

        .number {
          font-size: 13px;
          opacity: 0.6;
        }

        .prices {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
        }

        .historyFull {
          grid-column: span 2;
          display: flex;
          gap: 6px;
          overflow-x: auto;
          margin-top: 10px;
        }

        .historyFull img {
          width: 60px;
          border-radius: 6px;
        }

        .btn {
          padding: 10px;
          border-radius: 10px;
          background: #c9a86a;
          color: white;
        }

        .undoBtn {
          padding: 10px;
          border-radius: 10px;
          background: #eee;
        }

        .foilBtn {
          margin-top: 10px;
          padding: 10px;
          border-radius: 999px;
          background: linear-gradient(90deg, #fff, #f3e8ff);
          font-weight: bold;
        }

.suggestions {
  position: absolute;
  width: 100%;
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  z-index: 10;
  margin-top: 5px;
}

        .suggestionItem {
          display: flex;
          gap: 8px;
          padding: 8px;
          cursor: pointer;
        }

        .suggestionItem img {
          width: 30px;
        }

        .suggestionItem:hover {
          background: #f7edd9;
        }

        .badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .badge {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 999px;
        }

        .badge.new {
          background: #d1fae5;
          color: #065f46;
        }

        .badge.dup {
          background: #fef3c7;
          color: #92400e;
        }

        .badge.gift {
          background: #ede9fe;
          color: #5b21b6;
        }

        .boosterBox {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.boosterBox img {
  width: 70px;
  border-radius: 6px;
  }

.value {
  font-weight: bold;
  font-size: 18px;
}

.progressBar {
  height: 8px;
  background: #e5e5e5;
  border-radius: 999px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: #c9a86a;
  transition: 0.4s;
}

.progressText {
  text-align: center;
  font-size: 13px;
  font-weight: 500;
}

.finish {
  padding: 12px;
  background: #333;
  color: white;
  border-radius: 10px;
  cursor: pointer;
  text-align: center;
}
  s
      `}</style>
    </main>
  );
}