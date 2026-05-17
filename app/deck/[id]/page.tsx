"use client";

import AppHeader from "@/app/components/AppHeader";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Card = {
  id: string;
  name?: string;
  name_fr?: string;
 imageUrl?: string;
  ink?: string;
  type?: string;
  cost?: number;
  collection_number?: string;
  collections?: {
    quantity: number;
  }[];
};

type DeckCard = {
  id: string;
  quantity: number;
  card: Card;
};

type Deck = {
  id: string;
  name: string;
  description?: string;
  inks: string[];
  cards: DeckCard[];
};

const inkColors: Record<string, string> = {
  Amber: "#f59e0b",
  Amethyst: "#a855f7",
  Emerald: "#10b981",
  Ruby: "#ef4444",
  Sapphire: "#3b82f6",
  Steel: "#6b7280",
};

const chapterImages = [
  "/chapters/ch1.jpg",
  "/chapters/ch2.jpg",
  "/chapters/ch3.jpg",
  "/chapters/ch4.jpg",
  "/chapters/ch5.jpg",
  "/chapters/ch6.jpg",
  "/chapters/ch7.jpg",
  "/chapters/ch8.jpg",
  "/chapters/ch9.jpg",
  "/chapters/ch10.jpg",
  "/chapters/ch11.jpg",
  "/chapters/ch12.jpg",
];

export default function DeckDetailPage() {
  const params = useParams();

  const [activeUser, setActiveUser] =
    useState("adrien");

  const [deck, setDeck] =
    useState<Deck | null>(null);

  const [query, setQuery] =
    useState("");

  const [selectedChapters, setSelectedChapters] =
    useState<string[]>([]);

  const [selectedInks, setSelectedInks] =
    useState<string[]>([]);

  const [results, setResults] =
    useState<Card[]>([]);

  const [searchLoading, setSearchLoading] =
    useState(false);

  const [editing, setEditing] =
    useState(false);

  const [editName, setEditName] =
    useState("");

  const [
    editDescription,
    setEditDescription,
  ] = useState("");

  async function fetchDeck(user?: string) {
    const currentUser =
      user || activeUser;

    const res = await fetch(
      `/api/deck/${params.id}?user=${currentUser}`
    );

    const data = await res.json();

    setDeck(data);

    setEditName(data.name);

    setEditDescription(
      data.description || ""
    );
  }

  useEffect(() => {
    const user =
      localStorage.getItem("activeUser") ||
      "adrien";

    setActiveUser(user);

    fetchDeck(user);
  }, []);

  useEffect(() => {
    if (query.length >= 2) {
      searchCards(query);
    }
  }, [selectedChapters, selectedInks]);

  async function searchCards(value: string) {
    setQuery(value);

    if (value.length < 2) {
      setResults([]);
      return;
    }

    try {
      setSearchLoading(true);

      const params =
        new URLSearchParams();

      params.set("q", value);

      selectedChapters.forEach(
        (chapter) => {
          params.append(
            "chapter",
            chapter
          );
        }
      );

      selectedInks.forEach((ink) => {
        params.append("ink", ink);
      });

      const res = await fetch(
        `/api/cards?${params.toString()}`
      );

      const data = await res.json();

      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setSearchLoading(false);
    }
  }

  function toggleChapter(chapter: string) {
    setSelectedChapters((prev) =>
      prev.includes(chapter)
        ? prev.filter((c) => c !== chapter)
        : [...prev, chapter]
    );
  }

  function toggleInk(ink: string) {
    setSelectedInks((prev) =>
      prev.includes(ink)
        ? prev.filter((i) => i !== ink)
        : [...prev, ink]
    );
  }

  async function updateCard(
    deckCardId: string,
    action:
      | "increment"
      | "decrement"
  ) {
    await fetch(
      "/api/deck/update-card",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          deckCardId,
          action,
        }),
      }
    );

    fetchDeck();
  }

  async function addCard(
    cardId: string
  ) {
    if (!deck) return;

    try {
      await fetch(
        "/api/deck/add-card",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            deckId: deck.id,
            cardId,
          }),
        }
      );

      fetchDeck();
    } catch (error) {
      console.error(error);
    }
  }

  async function saveDeck() {
  if (!deck) return;

  try {
    await fetch(
      "/api/deck/update",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          id: deck.id,
          name: editName,
          description:
            editDescription,
        }),
      }
    );

    setEditing(false);

    fetchDeck();
  } catch (error) {
    console.error(error);
  }
}

  const totalCards = useMemo(() => {
    if (!deck) return 0;

    return deck.cards.reduce(
      (acc, c) =>
        acc + c.quantity,
      0
    );
  }, [deck]);

  const progress = Math.min(
    Math.round(
      (totalCards / 60) * 100
    ),
    100
  );

  const missingCards = useMemo(() => {
    if (!deck) return 0;

    return deck.cards.reduce(
      (acc, dc) => {
        const owned =
          dc.card.collections?.[0]
            ?.quantity || 0;

        const missing = Math.max(
          dc.quantity - owned,
          0
        );

        return acc + missing;
      },
      0
    );
  }, [deck]);

  const manaCurve = useMemo(() => {
    if (!deck) return {};

    const curve: Record<
      number,
      number
    > = {};

    deck.cards.forEach((dc) => {
      const cost =
        dc.card.cost || 0;

      if (!curve[cost]) {
        curve[cost] = 0;
      }

      curve[cost] += dc.quantity;
    });

    return curve;
  }, [deck]);

  const averageCost = useMemo(() => {
    
    if (!deck ||
      totalCards === 0
    )
      return 0;

    let total = 0;

    deck.cards.forEach((dc) => {
      total +=
        (dc.card.cost || 0) *
        dc.quantity;
    });

    return (
      total / totalCards
    ).toFixed(1);
  }, [deck, totalCards]);

  const deckValidation =
  useMemo(() => {
    if (!deck) return [];

    const errors: string[] =
      [];

    if (totalCards < 60) {
      errors.push(
        `Deck incomplet (${totalCards}/60)`
      );
    }

    if (deck.inks.length > 2) {
      errors.push(
        "Trop d’encres"
      );
    }

    const invalidInkCards =
      deck.cards.filter(
        (dc) =>
          dc.card.ink &&
          !deck.inks.includes(
            dc.card.ink
          )
      );

    if (
      invalidInkCards.length >
      0
    ) {
      errors.push(
        `${invalidInkCards.length} carte(s) hors couleur`
      );
    }

    const tooManyCopies =
      deck.cards.filter(
        (dc) =>
          dc.quantity > 4
      );

    if (
      tooManyCopies.length >
      0
    ) {
      errors.push(
        `${tooManyCopies.length} carte(s) en trop`
      );
    }

    return errors;
  }, [deck, totalCards]);

    const deckStats =
  useMemo(() => {
    if (!deck)
      return {
        characters: 0,
        actions: 0,
        items: 0,
        songs: 0,
      };

    return {
      characters:
        deck.cards.filter(
          (c) =>
            c.card.type?.includes(
              "Character"
            )
        ).length,

      actions:
        deck.cards.filter(
          (c) =>
            c.card.type?.includes(
              "Action"
            )
        ).length,

      items:
        deck.cards.filter(
          (c) =>
            c.card.type?.includes(
              "Item"
            )
        ).length,

      songs:
        deck.cards.filter(
          (c) =>
            c.card.type?.includes(
              "Song"
            )
        ).length,
    };
  }, [deck]);

  if (!deck) {
    return (
      <>
        <AppHeader />

        <main className="min-h-screen flex items-center justify-center">
          Chargement...
        </main>
      </>
    );
  }
  
  const gradient =
    deck.inks.length === 2
      ? `linear-gradient(135deg,
      ${inkColors[deck.inks[0]]},
      ${inkColors[deck.inks[1]]}
    )`
      : inkColors[
          deck.inks[0]
        ] || "#444";

  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-gradient-to-b from-[#f8f4eb] via-[#f3ecde] to-[#ece2cf] pt-24 pb-8 px-3">
        <div className="max-w-7xl mx-auto">
          {/* HERO */}
          <div
            className="relative overflow-hidden rounded-[32px] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.12)] mb-4"
            style={{
              background: gradient,
            }}
          >
            <div className="absolute inset-0 bg-black/20" />

            <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
              <div>
                <div className="flex gap-2 mb-4">
                  {deck.inks.map((ink) => (
                    <div
                      key={ink}
                      className="px-4 h-8 rounded-full bg-white/20 backdrop-blur-xl text-white font-black text-sm flex items-center"
                    >
                      {ink}
                    </div>
                  ))}
                </div>

                {editing ? (
                  <div className="flex flex-col gap-3">
                    <input
                      value={editName}
                      onChange={(e) =>
                        setEditName(
                          e.target.value
                        )
                      }
                      className="h-12 rounded-2xl px-4 text-black font-black text-2xl"
                    />

                    <input
                      value={editDescription}
                      onChange={(e) =>
                        setEditDescription(
                          e.target.value
                        )
                      }
                      className="h-12 rounded-2xl px-4 text-black"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={saveDeck}
                        className="h-11 px-5 rounded-2xl bg-white text-black font-black"
                      >
                        Sauvegarder
                      </button>

                      <button
                        onClick={() =>
                          setEditing(false)
                        }
                        className="h-11 px-5 rounded-2xl bg-black/20 text-white font-black"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl md:text-4xl font-black text-white">
                      {deck.name}
                    </h1>

                    {deck.description && (
                      <p className="text-white/80 mt-2">
                        {
                          deck.description
                        }
                      </p>
                    )}

                    <button
                      onClick={() =>
                        setEditing(true)
                      }
                      className="mt-4 px-4 h-10 rounded-2xl bg-white/20 backdrop-blur-xl text-white font-black"
                    >
                      ✏️ Modifier
                    </button>
                  </>
                )}
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="bg-white/15 backdrop-blur-xl rounded-[22px] p-4 min-w-[120px] border border-white/10">
                  <p className="text-white/60 text-xs uppercase font-black">
                    Cartes
                  </p>

                  <p className="text-2xl font-black text-white mt-1">
                    {totalCards}
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-xl rounded-[22px] p-4 min-w-[120px] border border-white/10">
                  <p className="text-white/60 text-xs uppercase font-black">
                    Progression
                  </p>

                  <p className="text-2xl font-black text-white mt-1">
                    {progress}%
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-xl rounded-[22px] p-4 min-w-[130px] border border-white/10">
                  <p className="text-white/60 text-xs uppercase font-black">
                    Statut
                  </p>

                  <p className="text-lg font-black text-white mt-1">
                    {missingCards === 0
                      ? "✅ Jouable"
                      : `❌ ${missingCards} manquantes`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        {/* DASHBOARD */}
        <div className="grid xl:grid-cols-[280px_1.4fr_280px] gap-4 mb-4">
          
          {/* VALIDATION */}
          <div className="rounded-[24px] bg-white/70 backdrop-blur-xl border border-white/60 p-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-300 to-green-500 flex items-center justify-center text-lg">
                🧠
              </div>

              <div>
                <h2 className="text-lg font-black">
                  Vérification
                </h2>

                <p className="text-xs text-neutral-500">
                  Validation Lorcana
                </p>
              </div>
            </div>

            {deckValidation.length === 0 ? (
              <div className="rounded-2xl bg-emerald-100 text-emerald-700 font-black px-3 py-3 text-sm">
                ✅ Deck légal
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {deckValidation.map((error) => (
                  <div
                    key={error}
                    className="rounded-2xl bg-red-100 text-red-700 font-black px-3 py-3 text-sm"
                  >
                    ❌ {error}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COURBE */}
          <div className="rounded-[24px] bg-white/70 backdrop-blur-xl border border-white/60 p-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-300 to-indigo-400 flex items-center justify-center text-lg">
                  📈
                </div>

                <div>
                  <h2 className="text-lg font-black">
                    Courbe d’encre
                  </h2>

                  <p className="text-xs text-neutral-500">
                    Répartition des coûts
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-neutral-900 text-white px-3 py-2">
                <p className="text-[9px] uppercase text-white/60 font-black">
                  Moyenne
                </p>

                <p className="text-xl font-black">
                  {averageCost}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2">
              {Object.entries(manaCurve).map(
                ([cost, quantity]) => (
                  <div
                    key={cost}
                    className="rounded-[18px] bg-gradient-to-br from-neutral-900 to-neutral-800 p-3 text-center"
                  >
                    <p className="text-white/50 text-[9px] uppercase font-black">
                      {cost}
                    </p>

                    <p className="text-xl font-black text-white">
                      {quantity}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* STATS */}
          <div className="rounded-[24px] bg-white/70 backdrop-blur-xl border border-white/60 p-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-300 to-purple-500 flex items-center justify-center text-lg">
                🧬
              </div>

              <div>
                <h2 className="text-lg font-black">
                  Statistiques
                </h2>

                <p className="text-xs text-neutral-500">
                  Composition
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white p-3 shadow">
                <p className="text-[10px] text-neutral-500">
                  Personnages
                </p>

                <p className="text-2xl font-black">
                  {deckStats.characters}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-3 shadow">
                <p className="text-[10px] text-neutral-500">
                  Actions
                </p>

                <p className="text-2xl font-black">
                  {deckStats.actions}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-3 shadow">
                <p className="text-[10px] text-neutral-500">
                  Objets
                </p>

                <p className="text-2xl font-black">
                  {deckStats.items}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-3 shadow">
                <p className="text-[10px] text-neutral-500">
                  Chansons
                </p>

                <p className="text-2xl font-black">
                  {deckStats.songs}
                </p>
              </div>
            </div>
          </div>
        </div>

          {/* SEARCH */}
          <div className="rounded-[24px] bg-white/70 backdrop-blur-xl border border-white/60 p-4 shadow-xl mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center text-xl">
                🔎
              </div>

              <div>
                <h2 className="text-2xl font-black">
                  Ajouter des cartes
                </h2>

                <p className="text-sm text-neutral-500">
                  Recherche avancée
                </p>
              </div>
            </div>

            {/* CHAPTERS */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-black">
                  Chapitres
                </p>

                {selectedChapters.length >
                  0 && (
                  <button
                    onClick={() =>
                      setSelectedChapters(
                        []
                      )
                    }
                    className="text-[10px] font-black text-red-500"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {chapterImages.map(
                  (img, index) => {
                    const chapter =
                      String(
                        index + 1
                      );

                    const active =
                      selectedChapters.includes(
                        chapter
                      );

                    return (
                      <button
                        key={index}
                        onClick={() =>
                          toggleChapter(
                            chapter
                          )
                        }
                        className={`
                          relative min-w-[52px] h-[68px] rounded-2xl overflow-hidden border-2 transition-all
                          ${
                            active
                              ? "border-yellow-400 scale-105 shadow-lg"
                              : "border-transparent opacity-70"
                          }
                        `}
                      >
                        <img
                          src={img}
                          className="w-full h-full object-cover"
                        />

                        <div
                          className={`
                            absolute inset-0 flex items-end justify-center pb-1
                            ${
                              active
                                ? "bg-black/10"
                                : "bg-black/40"
                            }
                          `}
                        >
                          <p className="text-white text-[10px] font-black">
                            {
                              chapter
                            }
                          </p>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* INKS */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-black">
                  Encres
                </p>

                {selectedInks.length >
                  0 && (
                  <button
                    onClick={() =>
                      setSelectedInks(
                        []
                      )
                    }
                    className="text-[10px] font-black text-red-500"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  inkColors
                ).map(
                  ([ink, color]) => {
                    const active =
                      selectedInks.includes(
                        ink
                      );

                    return (
                      <button
                        key={ink}
                        onClick={() =>
                          toggleInk(
                            ink
                          )
                        }
                        className={`
                          px-3 h-8 rounded-full font-black text-xs border-2 transition-all
                          ${
                            active
                              ? "scale-105 shadow-lg text-white"
                              : "bg-white"
                          }
                        `}
                        style={{
                          backgroundColor:
                            active
                              ? color
                              : "white",

                          borderColor:
                            color,

                          color:
                            active
                              ? "white"
                              : color,
                        }}
                      >
                        {ink}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* INPUT */}
            <input
              value={query}
              onChange={(e) =>
                searchCards(
                  e.target.value
                )
              }
              placeholder="Elsa, Mickey, Bambi..."
              className="w-full h-12 rounded-2xl border border-neutral-200 bg-white px-4 text-sm shadow-md outline-none focus:ring-4 focus:ring-yellow-200"
            />

            {/* RESULTS */}
            {results.length > 0 && (
              <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-10 gap-3 mt-5">
                {results.map(
                  (card) => (
                    <button
                      key={card.id}
                      onClick={() =>
                        addCard(
                          card.id
                        )
                      }
                      className="group bg-white rounded-[14px] overflow-hidden shadow-lg hover:scale-[1.02] transition-all text-left"
                    >
                      {card.imageUrl && (
                        <img
                          src={
                            card.imageUrl
                          }
                          alt={
                            card.name_fr
                          }
                          className="w-full"
                        />
                      )}

                      <div className="p-1.5">
                        <p className="font-black text-xs leading-tight line-clamp-2">
                          {card.name_fr ||
                            card.name}
                        </p>

                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-[10px] text-neutral-500">
                            {
                              card.ink
                            }
                          </p>

                          <div className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-black">
                            +
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* CARDS */}
          <div className="mb-4">
            <h2 className="text-2xl font-black">
              Cartes du deck
            </h2>

            <p className="text-sm text-neutral-500">
              {
                deck.cards.length
              }{" "}
              cartes
            </p>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-10 gap-3">
            {deck.cards.map(
              (deckCard) => (
                <div
                  key={deckCard.id}
                  className="group bg-white rounded-[14px] overflow-hidden shadow-lg"
                >
                  {deckCard.card
                    .imageUrl && (
                    <img
                      src={
                        deckCard.card
                          .imageUrl
                      }
                      alt={
                        deckCard.card
                          .name_fr
                      }
                      className="w-full"
                    />
                  )}

                  <div className="p-1.5">
                    <p className="font-black text-xs leading-tight line-clamp-2">
                      {
                        deckCard.card
                          .name_fr
                      }
                    </p>

                    <div className="flex items-center justify-between mt-2 gap-1">
                      <p className="text-[10px] text-neutral-500">
                        {
                          deckCard.card
                            .ink
                        }
                      </p>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateCard(
                              deckCard.id,
                              "decrement"
                            )
                          }
                          className="w-5 h-5 rounded-full bg-neutral-200 text-xs font-black"
                        >
                          -
                        </button>

                        <div className="px-2 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-black">
                          x
                          {
                            deckCard.quantity
                          }
                        </div>

                        <button
                          onClick={() =>
                            updateCard(
                              deckCard.id,
                              "increment"
                            )
                          }
                          className="w-5 h-5 rounded-full bg-neutral-900 text-white text-xs font-black"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const owned =
                        deckCard.card
                          .collections?.[0]
                          ?.quantity ||
                        0;

                      const missing =
                        deckCard.quantity -
                        owned;

                      return missing >
                        0 ? (
                        <div className="mt-2 rounded-xl bg-red-100 text-red-700 text-[10px] font-black px-2 py-1 text-center">
                          ❌ Manque{" "}
                          {
                            missing
                          }
                        </div>
                      ) : (
                        <div className="mt-2 rounded-xl bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 text-center">
                          ✅ OK
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </main>
    </>
  );
}