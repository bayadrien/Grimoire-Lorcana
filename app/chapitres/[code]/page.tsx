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
  name_fr: string;
  setName: string;
  setCode?: string | null;
  ink?: string | null;
  rarity?: string | null;
  cost?: number | null;
  imageUrl?: string | null;
  collection_number?: string | null;
};

type ColRow = {
  cardId: string;
  variant: "normal" | "foil";
  quantity: number;
  isEnglish?: boolean;
};

type ColQty = {
  normal: number;
  foil: number;
  isEnglish?: boolean;
};

type CollectionView = "all" | "missing" | "owned" | "doubles";

/* ================= CONST ================= */

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='900'%3E%3Crect width='100%25' height='100%25' fill='%23f7edd9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236b5e50' font-size='28' font-family='Arial'%3EImage indisponible%3C/text%3E%3C/svg%3E";

function collectionNumber(value?: string | null) {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

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
  const [collectionView, setCollectionView] = useState<CollectionView>("all");
  const [visibleCount, setVisibleCount] = useState(48);

  /* ================= USER ================= */

  useEffect(() => {
    const u = (localStorage.getItem("activeUser") as any) || "adrien";
    setUserId(u);
  }, []);

  /* ================= CARDS ================= */

  useEffect(() => {
    fetch("/api/cards", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        console.log("CARD =", data[0]); // 👈 juste ça en plus
        setCards(Array.isArray(data) ? data : []);
      });
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
        if (!mineMap[r.cardId]) {
          mineMap[r.cardId] = {
            normal: 0,
            foil: 0,
            isEnglish: false,
          };
        }

        mineMap[r.cardId][r.variant] = r.quantity;

        // 🇬🇧 si au moins une version est anglaise
        if (r.isEnglish) {
          mineMap[r.cardId].isEnglish = true;
        }
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
    const search = (q || query || "").trim().toLowerCase();

    const filtered = cards
      .filter((c) => Number(c.setCode) === chapterCode)
      .filter((c) => {
        if (!search) return true;

        const nameMatch = c.name.toLowerCase().includes(search);

        const numberMatch =
          c.collection_number?.toLowerCase().includes(search);

        const costMatch =
          c.cost !== null && String(c.cost).includes(search);

        const inkMatch =
          c.ink?.toLowerCase().includes(search);

        const rarityMatch =
          c.rarity?.toLowerCase().includes(search);

        return (
          nameMatch ||
          numberMatch ||
          costMatch ||
          inkMatch ||
          rarityMatch
        );
      })
      .filter((c) => {
        const quantity = (collection[c.id]?.normal ?? 0) + (collection[c.id]?.foil ?? 0);
        if (collectionView === "missing") return quantity === 0;
        if (collectionView === "owned") return quantity > 0;
        if (collectionView === "doubles") return quantity > 1;
        return true;
      });

    // L'album conserve toujours l'ordre officiel, même quand on filtre les cartes.
    return filtered.sort((a, b) => {
      const numberDifference = collectionNumber(a.collection_number) - collectionNumber(b.collection_number);
      return numberDifference || (a.name_fr || a.name || "").localeCompare(b.name_fr || b.name || "", "fr");
    });
  }, [cards, chapterCode, q, query, collectionView, collection]);

  useEffect(() => {
    setVisibleCount(48);
  }, [chapterCode, q, query, collectionView]);

  const visibleCards = chapterCards.slice(0, visibleCount);

  const chapterProgress = useMemo(() => {
    const allCards = cards.filter((card) => Number(card.setCode) === chapterCode);
    const owned = allCards.filter((card) => {
      const qty = collection[card.id];
      return (qty?.normal ?? 0) + (qty?.foil ?? 0) > 0;
    }).length;
    const doubles = allCards.filter((card) => {
      const qty = collection[card.id];
      return (qty?.normal ?? 0) + (qty?.foil ?? 0) > 1;
    }).length;
    const total = allCards.length;

    return {
      total,
      owned,
      missing: total - owned,
      doubles,
      percent: total ? Math.round((owned / total) * 100) : 0,
    };
  }, [cards, chapterCode, collection]);





  /* ================= RENDER ================= */

  return (
    <main className="shell">
      <header className="chapterHero">
        <div className="brand">
          <div className="sigil">📘</div>
          <div>
            <h1>Chapitre {chapterCode}</h1>
            <p>
              {chapterName}
            </p>
          </div>
        </div>

        <div className="controls">
          <a className="link" href="/chapitres">⬅️ Album</a>
          <a className="link" href="/">🎴 Cartes</a>
        </div>
      </header>

      <section className="chapterProgressPanel">
        <div className="chapterProgressHeadline">
          <div>
            <span>Progression de ta collection</span>
            <strong>{chapterProgress.owned} <small>/ {chapterProgress.total}</small></strong>
          </div>
          <b>{chapterProgress.percent}%</b>
        </div>
        <div className="chapterProgressTrack">
          <div style={{ width: `${chapterProgress.percent}%` }} />
        </div>
        <div className="chapterQuickStats">
          <span>✅ {chapterProgress.owned} possédées</span>
          <button onClick={() => setCollectionView("missing")}>⬜ {chapterProgress.missing} manquantes</button>
          <span>🎁 {chapterProgress.doubles} doublons</span>
        </div>
      </section>

      <div className="chapterFilters">
        <input
          className="pill"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔎 Rechercher…"
        />
        <div className="viewFilters" aria-label="Filtrer la collection">
          {([
            ["all", "Toutes"],
            ["missing", "Manquantes"],
            ["owned", "Possédées"],
            ["doubles", "Doublons"],
          ] as [CollectionView, string][]).map(([view, label]) => (
            <button
              key={view}
              className={collectionView === view ? "active" : ""}
              onClick={() => setCollectionView(view)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {query && (
        <div className="activeFilter">
          🎯 Résultats filtrés par <b>{query}</b>
          <button onClick={() => setQ("")}>✕</button>
        </div>
      )}

      <div className="gallerySummary">
        <strong>{chapterCards.length}</strong> carte{chapterCards.length > 1 ? "s" : ""}
        {visibleCards.length < chapterCards.length && <> · {visibleCards.length} affichées</>}
      </div>

      <section className="chapterGrid">
        {visibleCards.map((c) => {
          const qtys = collection[c.id] ?? { normal: 0, foil: 0 };
          const total = qtys.normal + qtys.foil;

          const variant = variantByCard[c.id] ?? "normal";
          const current = qtys[variant];
          const otherQty = otherCollection[c.id] ?? { normal: 0, foil: 0 };
          const otherTotal = otherQty.normal + otherQty.foil;
          const otherHas = otherTotal > 0;

          return (
            <div key={c.id}>
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
                  <span className="albumNumber" title={`Numéro de collection ${c.collection_number || "inconnu"}`}>
                    #{c.collection_number?.split("/")[0] || "—"}
                  </span>
                  <a
                    className="cardDetailLink"
                    href={`/cartes/${c.id}`}
                    aria-label={`Ouvrir la fiche de ${c.name}`}
                    title={`Fiche de ${c.name}`}
                  />

                  <div className="qtyPill unified">
                    <button onClick={() => setQty(c.id, variant, current - 1)}>
                      −
                    </button>

                    <div className="num">{current}</div>

                    <button
                      onClick={() => {
                        console.log("CLICK CARD =", c.id, c.name);
                        setQty(c.id, variant, current + 1);
                      }}
                    >
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

                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      zIndex: 5,
                    }}
                  >
                    {qtys.isEnglish && (
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,.88)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backdropFilter: "blur(6px)",
                          boxShadow: "0 2px 8px rgba(0,0,0,.18)",
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        🌍
                      </div>
                    )}

                    <div
                      className={`corner ${
                        total === 0
                          ? "missing"
                          : total === 1
                          ? "ok"
                          : "double"
                      }`}
                      style={{
                        position: "relative",
                        top: 0,
                        right: 0,
                        margin: 0,
                      }}
                    >
                      {total === 0
                        ? "⬜ 0"
                        : total === 1
                        ? "✅ OK"
                        : "🎁 Double"}
                    </div>
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

      {visibleCards.length < chapterCards.length && (
        <div className="loadMore">
          <button onClick={() => setVisibleCount((count) => count + 48)}>
            Afficher 48 cartes de plus
          </button>
        </div>
      )}

      <style jsx>{`
        .chapterHero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 18px;
          border-radius: 22px;
          background: rgba(255,250,240,.82);
          border: 1px solid rgba(43,36,28,.12);
          box-shadow: 0 10px 30px rgba(43,36,28,.10);
        }

        .chapterProgressPanel {
          margin-top: 14px;
          padding: 18px 20px;
          border-radius: 22px;
          background:
            radial-gradient(circle at 85% 20%, rgba(255,209,102,.2), transparent 28%),
            linear-gradient(135deg, #20375f, #416aa4);
          color: white;
          box-shadow: 0 14px 30px rgba(36,59,100,.22), inset 0 1px 0 rgba(255,255,255,.16);
        }

        .chapterProgressHeadline { display: flex; align-items: end; justify-content: space-between; }
        .chapterProgressHeadline span { display: block; font-size: 12px; opacity: .78; }
        .chapterProgressHeadline strong { display: block; margin-top: 3px; font-size: 28px; line-height: 1; }
        .chapterProgressHeadline small { font-size: 15px; opacity: .72; }
        .chapterProgressHeadline b { font-size: 24px; }
        .chapterProgressTrack { height: 8px; margin-top: 15px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.22); }
        .chapterProgressTrack div { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #ffd166, #ffb703); transition: width .35s ease; }
        .chapterQuickStats { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 13px; font-size: 12px; }
        .chapterQuickStats span, .chapterQuickStats button { padding: 6px 9px; border-radius: 999px; background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.18); color: white; }
        .chapterQuickStats button { cursor: pointer; }

        .chapterFilters {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 14px;
          padding: 11px 12px;
          border-radius: 18px;
          background: rgba(255,255,255,.58);
          border: 1px solid rgba(43,36,28,.10);
        }

        .viewFilters { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
        .viewFilters button, .loadMore button {
          border: 1px solid rgba(43,36,28,.12);
          background: rgba(255,255,255,.76);
          color: #554837;
          padding: 8px 11px;
          border-radius: 999px;
          font-weight: 750;
          font-size: 12px;
          cursor: pointer;
        }
        .viewFilters button.active { background: #243b64; color: #fff; border-color: #243b64; }

        .gallerySummary { margin-top: 15px; font-size: 13px; color: #766a5a; }
        .gallerySummary strong { color: #243b64; font-size: 16px; }

        .chapterGrid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 8px;
          margin-top: 10px;
          padding: 5px;
          overflow: visible;
        }

        .chapterGrid :global(.card) { border-radius: 16px; }
        .chapterGrid :global(.cardMedia) { aspect-ratio: 2 / 3; }
        .chapterGrid :global(.qtyPill.unified) { top: 8px; left: 8px; transform: scale(.88); transform-origin: top left; }
        .chapterGrid :global(.corner) { transform: scale(.88); transform-origin: top right; }
        .chapterGrid :global(.otherBadge) { transform: scale(.85); transform-origin: bottom right; }
        .chapterGrid :global(.card:hover) {
          transform: translateY(-10px) scale(1.16);
          z-index: 20;
          box-shadow: 0 22px 45px rgba(22,31,48,.34);
        }
        .cardDetailLink { position: absolute; inset: 0; z-index: 3; }
        .albumNumber { position: absolute; z-index: 5; left: 8px; bottom: 8px; padding: 5px 7px; border: 1px solid rgba(255,255,255,.35); border-radius: 8px; background: rgba(26,20,42,.83); box-shadow: 0 4px 11px rgba(0,0,0,.22); color: #fff9df; font-size: 10px; font-weight: 900; letter-spacing: .02em; pointer-events: none; }

        .loadMore { display: flex; justify-content: center; margin: 22px 0 8px; }
        .loadMore button { padding: 11px 18px; background: #243b64; color: white; border-color: #243b64; }

        @media (max-width: 1050px) { .chapterGrid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
        @media (max-width: 780px) {
          .chapterHero { align-items: flex-start; flex-direction: column; }
          .controls { width: 100%; justify-content: flex-start; }
          .chapterGrid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
        }
        @media (max-width: 520px) {
          .chapterProgressPanel { padding: 14px; }
          .chapterGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .chapterFilters :global(input.pill) { min-width: 0; width: 100%; }
          .chapterGrid :global(.card:hover) { transform: translateY(-3px) scale(1.03); }
        }
      `}</style>
    </main>
  );
}
