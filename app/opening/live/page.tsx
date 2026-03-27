"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "app/components/AppHeader";

type Card = {
  id: string;
  name: string;
  imageUrl: string;
  isNew?: boolean;
  quantity?: number;
  forOtherUser?: boolean;
  foil?: boolean;
};

export default function OpeningLive() {
  const params = useSearchParams();

  const chapter = params.get("chapter") || "";
  const boosterImage = decodeURIComponent(params.get("booster") || "");

  const [cards, setCards] = useState<Card[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Card[]>([]);

  const [collection, setCollection] = useState<Record<string, number>>({});
  const [otherCollection, setOtherCollection] = useState<Record<string, number>>({});

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
  if (cards.length === 0) return;

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

console.log("CARDS AVANT SAVE :", cards);

  async function addToCollection() {
  const userId = localStorage.getItem("activeUser") || "adrien";

  for (const c of cards) {
    const current = collection[c.id] || 0;

    await fetch("/api/collection/setQty", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        cardId: c.id,
        variant: "normal",
        quantity: current + 1,
      }),
    });
  }

  alert("✅ Booster ajouté au grimoire !");
}
  // ================== RENDER ==================
  const lastCard = cards[cards.length - 1];
  const isFoilCard = cards.length === 11 || cards.length === 12;

  return (
    <main className="shell">
      <AppHeader title="Ouverture" icon="✨" />

      <section className="box">

        {boosterImage && <img src={boosterImage} className="booster" />}

        {/* HISTORIQUE */}
        <div className="history">
          {cards.map((c, i) => (
            <img key={i} src={c.imageUrl} />
          ))}
        </div>

        {/* CARTE ACTUELLE */}
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

            {/* BADGES */}
            <div className="badges">
              {lastCard.isNew && (
                <span className="badge new">
                  🆕 Nouvelle carte
                </span>
              )}

              {lastCard.quantity! > 0 && (
                <span className="badge dup">
                  🔁 Déjà {lastCard.quantity}
                </span>
              )}

              {lastCard.forOtherUser && (
                <span className="badge gift">
                  🎁 Manque à l'autre
                </span>
              )}
            </div>
          </>
        )}

        {/* PROGRESSION */}
        <div className="progress">🎴 {cards.length} / 12</div>

        {/* INPUT */}
        <input
          className="pill input"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nom ou numéro"
        />

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

        <button className="btn" onClick={handleAdd}>
          Valider
        </button>

        <button className="undoBtn" onClick={removeLastCard}>
          ↩️ Annuler dernière carte
        </button>

{cards.length >= 12 && (
  <>
    <button className="btn" onClick={addToCollection}>
      📥 Ajouter au grimoire
    </button>

    <a
      className="finish"
      onClick={async () => {
        const userId = localStorage.getItem("activeUser") || "adrien";

console.log("CARDS AVANT SAVE :", cards);

        const res = await fetch("/api/booster/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
      Voir le résultat
    </a>
  </>
)}

        {cards.length === 0 && (
          <div className="empty">
            Commence à entrer une carte 🎴
          </div>
        )}
      </section>

      {/* STYLE */}
      <style jsx>{`
        .box {
          max-width: 420px;
          margin: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .booster {
          width: 70px;
          margin: auto;
        }

        .history {
          display: flex;
          gap: 6px;
          overflow-x: auto;
        }

        .history img {
          width: 55px;
          border-radius: 6px;
        }

        .current img {
          width: 50%;
          border-radius: 10px;
        }

        .foilCard img {
          box-shadow: 0 0 20px rgba(255,255,255,0.8);
          animation: shine 2s infinite linear;
        }

        @keyframes shine {
          0% { filter: brightness(1); }
          50% { filter: brightness(1.4); }
          100% { filter: brightness(1); }
        }

        .badges {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .badge {
          font-size: 13px;
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 500;
        }
          
        /* Nouvelle */
        .badge.new {
          background: #d1fae5;
          color: #065f46;
        }

        /* Doublon */
        .badge.dup {
          background: #fef3c7;
          color: #92400e;
        }

        /* Angèle */
        .badge.gift {
          background: #ede9fe;
          color: #5b21b6;
        }

        .badges span {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 999px;
        }

        .new {
          background: #d1fae5;
        }

        .dup {
          background: #eee;
        }

        .gift {
          background: #f3e8ff;
        }

        .progress {
          text-align: center;
          font-weight: bold;
        }

        .input {
          width: 100%;
        }

        .btn {
          padding: 10px;
          border-radius: 10px;
          background: #c9a86a;
          color: white;
        }

        .foilBtn {
          padding: 10px;
          border-radius: 999px;
          background: linear-gradient(90deg, #fff, #f3e8ff);
          cursor: pointer;
          font-weight: bold;
        }

        .finish {
          text-align: center;
          padding: 12px;
          background: #333;
          color: white;
          border-radius: 10px;
        }

        .suggestions {
          background: white;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
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

        .undoBtn {
          padding: 10px;
          border-radius: 10px;
          background: #eee;
          cursor: pointer;
          font-size: 14px;
        }

        .empty {
          text-align: center;
          opacity: 0.6;
        }
      `}</style>
    </main>
  );
}