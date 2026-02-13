"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { tInk, tRarity } from "@/lib/lorcana-fr";
import { CHAPTERS_NAMES_FR } from "@/lib/chapters-fr";
import { useSearch } from "app/components/SearchContext";
import AppHeader from "app/components/AppHeader";

/* ================= TYPES ================= */

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

type ColRow = {
  cardId: string;
  variant: "normal" | "foil";
  quantity: number;
};

type ColQty = {
  normal: number;
  foil: number;
};

/* ================= CONST ================= */

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='900'%3E%3Crect width='100%25' height='100%25' fill='%23f7edd9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236b5e50' font-size='28' font-family='Arial'%3EImage indisponible%3C/text%3E%3C/svg%3E";

/* ================= PAGE ================= */

export default function ChapitreDetail() {
  const params = useParams();
  const rawCode = Array.isArray(params?.code)
    ? params?.code[0]
    : params?.code;
  const chapterCode = Number(rawCode);
  const { query } = useSearch();

  if (!chapterCode || Number.isNaN(chapterCode)) {
    return (
      <main className="shell">
        <p style={{ padding: 20 }}>Chapitre introuvable</p>
      </main>
    );
  }

  const chapterName =
    CHAPTERS_NAMES_FR[String(chapterCode)] ?? `Chapitre ${chapterCode}`;

  const [userId, setUserId] = useState<"adrien" | "angele">("adrien");
  const [cards, setCards] = useState<Card[]>([]);
  const [collection, setCollection] = useState<Record<string, ColQty>>({});
  const [otherCollection, setOtherCollection] = useState<Record<string, ColQty>>({});
  const [variantByCard, setVariantByCard] = useState<
    Record<string, "normal" | "foil">
  >({});
  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);

  /* ================= USER ================= */

  useEffect(() => {
    const u = (localStorage.getItem("activeUser") as any) || "adrien";
    setUserId(u);
  }, []);

  /* ================= CARDS ================= */

  useEffect(() => {
    fetch("/api/cards", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCards(Array.isArray(data) ? data : []));
  }, []);

  /* ================= COLLECTION ================= */

  useEffect(() => {
    async function loadCollections() {
      const otherUser = userId === "adrien" ? "angele" : "adrien";

      const [mineR, otherR] = await Promise.all([
        fetch(`/api/collection?userId=${userId}`, { cache: "no-store" }),
        fetch(`/api/collection?userId=${otherUser}`, { cache: "no-store" }),
      ]);

      const mineRows: ColRow[] = await mineR.json();
      const otherRows: ColRow[] = await otherR.json();

      const mineMap: Record<string, ColQty> = {};
      const otherMap: Record<string, ColQty> = {};

      mineRows.forEach((r) => {
        if (!mineMap[r.cardId]) mineMap[r.cardId] = { normal: 0, foil: 0 };
        mineMap[r.cardId][r.variant] = r.quantity;
      });

      otherRows.forEach((r) => {
        if (!otherMap[r.cardId]) otherMap[r.cardId] = { normal: 0, foil: 0 };
        otherMap[r.cardId][r.variant] = r.quantity;
      });

      setCollection(mineMap);
      setOtherCollection(otherMap);
    }

    loadCollections();
  }, [userId]);


  /* ================= SET QTY ================= */

  async function setQty(
    cardId: string,
    variant: "normal" | "foil",
    value: number
  ) {
    const next = Math.max(0, value);
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
      alert("❌ Sauvegarde impossible");
    }
  }

  /* ================= FILTER ================= */

  const chapterCards = useMemo(() => {
    const s = query.trim().toLowerCase();

    const filtered = cards
      .filter((c) => Number(c.setCode) === chapterCode)
      .filter((c) => (s ? c.name.toLowerCase().includes(s) : true))
      .filter((c) =>
        onlyMissing
          ? (collection[c.id]?.normal ?? 0) + (collection[c.id]?.foil ?? 0) === 0
          : true
      );

    // 🔥 Tri intelligent : possédées en haut
    return filtered.sort((a, b) => {
      const aOwned =
        (collection[a.id]?.normal ?? 0) + (collection[a.id]?.foil ?? 0) > 0;
      const bOwned =
        (collection[b.id]?.normal ?? 0) + (collection[b.id]?.foil ?? 0) > 0;

      if (aOwned === bOwned) return 0;
      return aOwned ? -1 : 1;
    });
  }, [cards, chapterCode, q, onlyMissing, collection]);


  /* ================= RENDER ================= */

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="sigil">📘</div>
          <div>
            <h1>Chapitre {chapterCode}</h1>
            <p>
              {chapterName} • {chapterCards.length} cartes
            </p>
          </div>
        </div>

        <div className="controls">
          <a className="link" href="/chapitres">⬅️ Album</a>
          <a className="link" href="/">🎴 Cartes</a>
        </div>
      </header>

      <div className="topbar" style={{ marginTop: 12 }}>
        <input
          className="pill"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔎 Rechercher…"
        />

        <label className="pill">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked)}
          />
          Manquantes
        </label>
      </div>

      {query && (
        <div className="activeFilter">
          🎯 Résultats filtrés par <b>{query}</b>
          <button onClick={() => setQ("")}>✕</button>
        </div>
      )}

      <section className="grid" style={{ marginTop: 12 }}>
        {chapterCards.map((c, index) => {
          const qtys = collection[c.id] ?? { normal: 0, foil: 0 };
          const total = qtys.normal + qtys.foil;

          const previous =
            index > 0
              ? (() => {
                  const prev = collection[chapterCards[index - 1].id] ?? {
                    normal: 0,
                    foil: 0,
                  };
                  return prev.normal + prev.foil;
                })()
              : null;

          const showSeparator =
            previous !== null && previous > 0 && total === 0;

          const variant = variantByCard[c.id] ?? "normal";
          const current = qtys[variant];
          const otherQty = otherCollection[c.id] ?? { normal: 0, foil: 0 };
          const otherTotal = otherQty.normal + otherQty.foil;
          const otherHas = otherTotal > 0;

          return (
            <div key={c.id}>
              {showSeparator && (
                <div className="chapterSeparator">
                  ⚪ Cartes manquantes
                </div>
              )}

              <article
                className={[
                  "card",
                  total === 0 && "missing",
                  total === 1 && "owned",
                  total > 1 && "double",
                  variant === "foil" && "foil",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="cardMedia">
                  
                  <img src={c.imageUrl || PLACEHOLDER} alt={c.name} />

                  <div className="qtyPill unified">
                    <button onClick={() => setQty(c.id, variant, current - 1)}>
                      −
                    </button>

                    <div className="num">{current}</div>

                    <button onClick={() => setQty(c.id, variant, current + 1)}>
                      +
                    </button>

                    <button
                      className={
                        "variantBtn " + (variant === "foil" ? "active" : "")
                      }
                      onClick={() =>
                        setVariantByCard((p) => ({
                          ...p,
                          [c.id]: variant === "normal" ? "foil" : "normal",
                        }))
                      }
                    >
                      ✨
                    </button>
                  </div>

                  <div className="corner">
                    {total === 0 ? "⬜ 0" : total === 1 ? "✅ OK" : "🎁 Double"}
                  </div>

                  <div className="overlay">
                    <div className="ovTitle">{c.name}</div>
                    <div className="ovMeta">
                      {tInk(c.ink)} • {tRarity(c.rarity)} • Coût{" "}
                      {c.cost ?? "—"}
                    </div>
                  </div>

                  <div className="otherBadge">
                    {otherHas ? "👀" : "🚫"}
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </section>
    </main>
  );
}
