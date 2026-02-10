"use client";

import { useEffect, useMemo, useState } from "react";
import { tInk, tRarity } from "@/lib/lorcana-fr";
import { CHAPTERS_NAMES_FR } from "@/lib/chapters-fr";
import { useSearch } from "app/components/SearchContext";
import AppHeader from "app/components/AppHeader";

/* ================== TYPES ================== */

type Card = {
  id: string;
  name: string;
  setName: string;
  setCode?: string | null;
  ink?: string | null;
  rarity?: string | null;
  cost?: number | null;
  imageUrl?: string | null;
};

type ColQty = {
  normal: number;
  foil: number;
};

/* ================== CONSTANTES ================== */

const INKS = ["Amber", "Amethyst", "Emerald", "Ruby", "Sapphire", "Steel"] as const;

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='900'%3E%3Crect width='100%25' height='100%25' fill='%23f7edd9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236b5e50' font-size='28' font-family='Arial'%3EImage indisponible%3C/text%3E%3C/svg%3E";

function cx(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

/* ================== PAGE ================== */

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userId, setUserId] = useState<"adrien" | "angele">("adrien");
  const [cards, setCards] = useState<Card[]>([]);
  const [collection, setCollection] = useState<Record<string, ColQty>>({});
  const [variantByCard, setVariantByCard] = useState<Record<string, "normal" | "foil">>({});
  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [chapter, setChapter] = useState<"all" | string>("all");
  const [inks, setInks] = useState<Set<string>>(new Set());
  
  const { query, activeInk, activeChapter } = useSearch();



  /* ========== USER ========== */
  useEffect(() => {
    const u = (localStorage.getItem("activeUser") as any) || "adrien";
    setUserId(u);
  }, []);

  /* ========== CARDS ========== */
  useEffect(() => {
    fetch("/api/cards", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCards(Array.isArray(data) ? data : []));
  }, []);

  /* ========== COLLECTION ========== */
  useEffect(() => {
    fetch(`/api/collection?userId=${userId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: { cardId: string; variant: "normal" | "foil"; quantity: number }[]) => {
        const map: Record<string, ColQty> = {};

        rows.forEach((r) => {
          if (!map[r.cardId]) {
            map[r.cardId] = { normal: 0, foil: 0 };
          }

          map[r.cardId][r.variant] = r.quantity;
        });

        setCollection(map);
      });

  }, [userId]);

  /* ========== SET QTY ========== */
  async function setQty(
    cardId: string,
    variant: "normal" | "foil",
    quantity: number
  ) {
    const next = Math.max(0, quantity);
    const prev = collection[cardId] ?? { normal: 0, foil: 0 };

    setCollection((p) => ({
      ...p,
      [cardId]: { ...prev, [variant]: next },
    }));

    try {
      const res = await fetch("/api/collection/setQty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, cardId, variant, quantity: next }),
      });

      if (!res.ok) throw new Error();
    } catch {
      setCollection((p) => ({ ...p, [cardId]: prev }));
      alert("❌ Erreur de sauvegarde");
    }
  }

/* ========== FILTRES ========== */

const filtered = useMemo(() => {
  const q = query.trim().toLowerCase();

  return cards.filter((c) => {
    /* 🎯 FILTRE CHAPITRE (global, détecté ou cliqué) */
    if (activeChapter && Number(c.setCode) !== activeChapter) {
      return false;
    }

    /* 🎨 FILTRE ENCRE */
    if (activeInk && c.ink !== activeInk) {
      return false;
    }

    /* 🔍 FILTRE TEXTE (nom de carte) */
    if (q && !c.name.toLowerCase().includes(q)) {
      return false;
    }

    return true;
  });
}, [cards, query, activeInk, activeChapter]);



  /* ========== RENDER ========== */

  return (
    <main className="shell">
      <AppHeader
        title="Grimoire Lorcana"
        subtitle={`${filtered.length} cartes`}
        icon="📜"
      />
      {query && (
        <div className="activeFilter">
          🎯 Résultats filtrés par <b>{query}</b>
          <button onClick={() => setQ("")}>✕</button>
        </div>
      )}

      {/* CARTES */}
      <section className="grid">
        {filtered.map((c) => {
          const activeVariant: "normal" | "foil" =
            variantByCard[c.id] ?? "normal";

          const qtys: { normal: number; foil: number } =
            collection[c.id] ?? { normal: 0, foil: 0 };

          const currentQty = Number(qtys[activeVariant]);

          const total = qtys.normal + qtys.foil;

          return (
            <article
              key={c.id}
              className={[
                "card",
                total === 0 && "missing",
                total === 1 && "owned",
                total > 1 && "double",
                activeVariant === "foil" && "foil",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="cardMedia">
                <img src={c.imageUrl || PLACEHOLDER} alt={c.name} loading="lazy" />

                {/* COMPTEUR MOBILE AVEC VARIANTE */}
                <div
                  className={cx(
                    "qtyPill mobile",
                    activeVariant === "foil" && "foil-active"
                  )}
                >
                  <button onClick={() => setQty(c.id, activeVariant, currentQty - 1)}>−</button>

                  <div className="num">{currentQty}</div>

                  <button onClick={() => setQty(c.id, activeVariant, currentQty + 1)}>+</button>

                  <button
                    className={cx("variantToggle", activeVariant === "foil" && "active")}
                    onClick={() =>
                      setVariantByCard((p) => ({
                        ...p,
                        [c.id]: activeVariant === "normal" ? "foil" : "normal",
                      }))
                    }
                  >
                    ✨
                  </button>
                </div>

                <div
                  className={cx(
                    "corner",
                    total === 0 && "missing",
                    total === 1 && "ok",
                    total > 1 && "double"
                  )}
                >
                  {total === 0 ? "⬜ 0" : total === 1 ? "✅ OK" : "🎁 Double"}
                </div>

                <div className="overlay">
                  <div className="ovTitle">{c.name}</div>
                  <div className="ovMeta">
                    {c.setName} • {CHAPTERS_NAMES_FR[c.setCode ?? ""] ?? `Chapitre ${c.setCode}`}
                    <br />
                    {tInk(c.ink)} • {tRarity(c.rarity)} • Coût {c.cost ?? "—"}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
