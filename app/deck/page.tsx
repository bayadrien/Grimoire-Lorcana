"use client";

import AppHeader from "../components/AppHeader";
import { useEffect, useState } from "react";
import Link from "next/link";

type Deck = {
  id: string;
  name: string;
  description?: string;
  inks: string[];
  createdAt: string;
};

type User = "adrien" | "angele";

const inkColors: Record<string, string> = {
  Amber: "#f59e0b",
  Amethyst: "#a855f7",
  Emerald: "#10b981",
  Ruby: "#ef4444",
  Sapphire: "#3b82f6",
  Steel: "#6b7280",
};

const inkIcons: Record<string, string> = {
  Amber: "🟡",
  Amethyst: "🟣",
  Emerald: "🟢",
  Ruby: "🔴",
  Sapphire: "🔵",
  Steel: "⚪",
};

export default function DeckPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeUser, setActiveUser] =
    useState<User>("adrien");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inks, setInks] = useState<string[]>([]);

  useEffect(() => {
    const user =
      (localStorage.getItem("activeUser") as User) ||
      "adrien";

    setActiveUser(user);

    fetchDecks(user);
  }, []);

  async function fetchDecks(user: string) {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/deck?user=${user}`
      );

      const data = await res.json();

      setDecks(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function toggleInk(ink: string) {
    if (inks.includes(ink)) {
      setInks(inks.filter((i) => i !== ink));
      return;
    }

    if (inks.length >= 2) return;

    setInks([...inks, ink]);
  }

  async function createDeck() {
    if (!name.trim()) return;

    try {
      const res = await fetch("/api/deck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          inks,
          userId: activeUser,
        }),
      });

      if (!res.ok) {
        alert("Erreur création deck");
        return;
      }

      setName("");
      setDescription("");
      setInks([]);

      fetchDecks(activeUser);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-gradient-to-b from-[#f8f4eb] via-[#f4efe3] to-[#ebe2d0] pt-28 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* HERO */}
          <div className="relative overflow-hidden rounded-[40px] p-10 mb-10 bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_10px_50px_rgba(0,0,0,0.08)]">
            {/* GLOWS */}
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-yellow-300/20 blur-3xl" />

            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-orange-300/10 blur-3xl" />

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                {/* LEFT */}
                <div>
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-yellow-300 via-amber-300 to-orange-400 flex items-center justify-center text-4xl shadow-[0_10px_30px_rgba(251,191,36,0.4)]">
                      ⚔️
                    </div>

                    <div>
                      <h1 className="text-5xl md:text-6xl font-black tracking-tight text-neutral-900">
                        Decks Lorcana
                      </h1>

                      <p className="text-lg text-neutral-500 mt-2">
                        Construis tes decks et découvre
                        instantanément les cartes manquantes
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white shadow-lg border border-white/60">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />

                    <div>
                      <p className="text-xs uppercase tracking-wider text-neutral-400 font-bold">
                        Collection active
                      </p>

                      <p className="font-black text-lg capitalize text-neutral-800">
                        {activeUser}
                      </p>
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="grid grid-cols-3 gap-4 min-w-[280px]">
                  <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 text-center shadow-lg border border-white/60">
                    <p className="text-4xl font-black text-neutral-900">
                      {decks.length}
                    </p>

                    <p className="text-sm text-neutral-500 mt-1">
                      Decks
                    </p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 text-center shadow-lg border border-white/60">
                    <p className="text-4xl font-black text-neutral-900">
                      0
                    </p>

                    <p className="text-sm text-neutral-500 mt-1">
                      Jouables
                    </p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 text-center shadow-lg border border-white/60">
                    <p className="text-4xl font-black text-neutral-900">
                      0%
                    </p>

                    <p className="text-sm text-neutral-500 mt-1">
                      Complété
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CREATE */}
          <div className="relative overflow-hidden rounded-[40px] bg-white/70 backdrop-blur-xl border border-white/60 p-8 shadow-[0_10px_50px_rgba(0,0,0,0.08)] mb-10">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-yellow-300/20 blur-3xl" />

            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-orange-200/20 blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center text-3xl shadow-lg">
                  ✨
                </div>

                <div>
                  <h2 className="text-4xl font-black text-neutral-900">
                    Créer un deck
                  </h2>

                  <p className="text-neutral-500 mt-1">
                    Sélectionne jusqu’à 2 encres
                  </p>
                </div>
              </div>

              {/* INPUTS */}
              <div className="grid lg:grid-cols-2 gap-5">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Nom du deck"
                  className="h-16 rounded-3xl px-6 bg-white/80 border border-white/60 shadow-md outline-none focus:ring-4 focus:ring-yellow-200 transition-all text-lg"
                />

                <input
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Description"
                  className="h-16 rounded-3xl px-6 bg-white/80 border border-white/60 shadow-md outline-none focus:ring-4 focus:ring-yellow-200 transition-all text-lg"
                />
              </div>

              {/* INKS */}
              <div className="flex flex-wrap gap-4 mt-8">
                {Object.entries(inkColors).map(
                  ([ink, color]) => {
                    const active =
                      inks.includes(ink);

                    return (
                      <button
                        key={ink}
                        onClick={() =>
                          toggleInk(ink)
                        }
                        className={`
                          px-6 py-3 rounded-full font-black transition-all border-2 shadow-md
                          ${
                            active
                              ? "text-white scale-105 shadow-xl"
                              : "bg-white/80 text-neutral-700 hover:scale-105"
                          }
                        `}
                        style={{
                          backgroundColor: active
                            ? color
                            : "rgba(255,255,255,0.75)",
                          borderColor: color,
                        }}
                      >
                        {inkIcons[ink]} {ink}
                      </button>
                    );
                  }
                )}
              </div>

              {/* BUTTON */}
              <button
                onClick={createDeck}
                className="mt-10 h-16 px-10 rounded-3xl bg-gradient-to-br from-yellow-300 via-amber-300 to-orange-400 text-black font-black text-xl shadow-[0_10px_30px_rgba(251,191,36,0.45)] hover:scale-[1.02] transition-all"
              >
                ✨ Créer le deck
              </button>
            </div>
          </div>

          {/* DECKS */}
          {loading ? (
            <div className="rounded-[40px] bg-white/70 backdrop-blur-xl border border-white/60 p-16 text-center shadow-[0_10px_50px_rgba(0,0,0,0.08)]">
              <div className="text-7xl animate-pulse mb-6">
                📚
              </div>

              <h2 className="text-3xl font-black text-neutral-900">
                Chargement des decks...
              </h2>
            </div>
          ) : decks.length === 0 ? (
            <div className="rounded-[40px] bg-white/70 backdrop-blur-xl border border-white/60 p-16 text-center shadow-[0_10px_50px_rgba(0,0,0,0.08)]">
              <div className="text-8xl mb-6">
                🪄
              </div>

              <h2 className="text-5xl font-black text-neutral-900">
                Aucun deck créé
              </h2>

              <p className="text-xl text-neutral-500 mt-4">
                Crée ton premier deck Lorcana ✨
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-4xl font-black text-neutral-900">
                    Tes decks
                  </h2>

                  <p className="text-neutral-500 mt-1">
                    {decks.length} deck
                    {decks.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-7">
                {decks.map((deck) => {
                  const gradient =
                    deck.inks.length === 2
                      ? `linear-gradient(135deg,
                          ${inkColors[deck.inks[0]]},
                          ${inkColors[deck.inks[1]]}
                        )`
                      : inkColors[deck.inks[0]] ||
                        "#444";

                  return (
                    <div
                      key={deck.id}
                      className="group relative overflow-hidden rounded-[40px] min-h-[320px] p-8 shadow-[0_15px_50px_rgba(0,0,0,0.18)] hover:scale-[1.02] transition-all duration-300"
                      style={{
                        background: gradient,
                      }}
                    >
                      {/* OVERLAY */}
                      <div className="absolute inset-0 bg-black/20" />

                      {/* GLOWS */}
                      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />

                      <div className="absolute bottom-0 left-0 w-52 h-52 rounded-full bg-black/10 blur-3xl" />

                      <div className="relative z-10 h-full flex flex-col">
                        {/* INKS */}
                        <div className="flex gap-2 mb-6">
                          {deck.inks.map((ink) => (
                            <div
                              key={ink}
                              className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-sm font-black text-white border border-white/10"
                            >
                              {inkIcons[ink]} {ink}
                            </div>
                          ))}
                        </div>

                        {/* TITLE */}
                        <div className="flex-1">
                          <h2 className="text-5xl leading-tight font-black text-white">
                            {deck.name}
                          </h2>

                          {deck.description && (
                            <p className="mt-5 text-white/80 leading-relaxed text-lg">
                              {deck.description}
                            </p>
                          )}
                        </div>

                        {/* FOOTER */}
                        <div className="flex items-end justify-between mt-10">
                          <div>
                            <p className="text-white/70 text-sm uppercase tracking-wider font-bold">
                              Progression
                            </p>

                            <p className="text-5xl font-black text-white">
                              0%
                            </p>

                            <p className="text-white/70 mt-1">
                              Deck vide
                            </p>
                          </div>
                          <Link
                            href={`/deck/${deck.id}`}
                            className="h-14 px-7 rounded-2xl bg-white text-black font-black shadow-xl hover:scale-105 transition-all flex items-center"
                          >
                            Ouvrir
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}