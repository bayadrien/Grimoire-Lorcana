"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { tInk, tRarity } from "@/lib/lorcana-fr";
import { CHAPTERS_NAMES_FR } from "@/lib/chapters-fr";

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
  const rawCode = params?.code;
  const chapterCode = Number(rawCode);

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
    fetch(`/api/collection?userId=${userId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: ColRow[]) => {
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
    const s = q.trim().toLowerCase();

    return cards
      .filter((c) => Number(c.setCode) === chapterCode)
      .filter((c) => (s ? c.name.toLowerCase().includes(s) : true))
      .filter((c) =>
        onlyMissing
          ? (collection[c.id]?.normal ?? 0) +
              (collection[c.id]?.foil ?? 0) ===
            0
          : true
      );
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

      <section className="grid" style={{ marginTop: 12 }}>
        {chapterCards.map((c) => {
          const variant = variantByCard[c.id] ?? "normal";
          const qtys = collection[c.id] ?? { normal: 0, foil: 0 };
          const current = qtys[variant];
          const total = qtys.normal + qtys.foil;

          return (
            <article key={c.id} className="card">
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
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
