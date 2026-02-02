"use client";

import { useEffect, useMemo, useState } from "react";
import { tInk, tRarity } from "@/lib/lorcana-fr";
import { CHAPTERS } from "@/lib/chapters";

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

  function toggleInk(ink: string) {
    setInks((p) => {
      const n = new Set(p);
      n.has(ink) ? n.delete(ink) : n.add(ink);
      return n;
    });
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return cards.filter((c) => {
      if (s && !c.name.toLowerCase().includes(s)) return false;

      const qty = collection[c.id] ?? { normal: 0, foil: 0 };
      if (onlyMissing && qty.normal + qty.foil > 0) return false;

      if (chapter !== "all" && String(c.setCode ?? "") !== chapter) return false;
      if (inks.size && !inks.has(c.ink ?? "")) return false;

      return true;
    });
  }, [cards, q, onlyMissing, chapter, inks, collection]);

  const chapters = useMemo(() => {
    const s = new Set<string>();
    cards.forEach((c) => {
      if (c.setCode && /^\d+$/.test(c.setCode)) s.add(c.setCode);
    });
    return [...s].sort((a, b) => Number(a) - Number(b));
  }, [cards]);

  /* ========== RENDER ========== */

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="sigil">📜</div>
          <div>
            <h1>Grimoire Lorcana</h1>
            <p>{filtered.length} cartes</p>
          </div>
        </div>

        <div className="controls">
          {/* Desktop only */}
          <input
            className="pill hide-mobile"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔎 Rechercher…"
          />

          <label className="pill hide-mobile">
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(e) => setOnlyMissing(e.target.checked)}
            />
            Manquantes
          </label>

          <select
            className="hide-mobile"
            value={userId}
            onChange={(e) => {
              const v = e.target.value as "adrien" | "angele";
              setUserId(v);
              localStorage.setItem("activeUser", v);
            }}
          >
            <option value="adrien">Adrien</option>
            <option value="angele">Angèle</option>
          </select>

          {/* Desktop nav */}
          <nav className="nav-desktop hide-mobile">
            <a href="/chapitres">📚 Chapitres</a>
            <a href="/echange">🤝 Échange</a>
            <a href="/stats">📊 Stats</a>
            <a href="/gift">🎁 Doubles</a>
          </nav>

          {/* Mobile burger */}
          <button
            className="burger show-mobile"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobileOverlay" onClick={() => setMenuOpen(false)}>
          <div className="mobileMenu" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setMenuOpen(false)}>
              ✕
            </button>

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

            <select
              value={userId}
              onChange={(e) => {
                const v = e.target.value as "adrien" | "angele";
                setUserId(v);
                localStorage.setItem("activeUser", v);
                setMenuOpen(false);
              }}
            >
              <option value="adrien">Adrien</option>
              <option value="angele">Angèle</option>
            </select>

            <hr />

            <a href="/chapitres">📚 Chapitres</a>
            <a href="/echange">🤝 Échange</a>
            <a href="/stats">📊 Stats</a>
            <a href="/gift">🎁 Doubles</a>
          </div>
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
            <article key={c.id} className="card">
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
                    {c.setName} • {CHAPTERS[c.setCode ?? ""] ?? `Chapitre ${c.setCode}`}
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
