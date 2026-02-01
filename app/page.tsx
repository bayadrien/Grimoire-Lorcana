"use client";
import { useEffect, useMemo, useState } from "react";
import { tInk, tRarity } from "@/lib/lorcana-fr";

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

const INKS = ["Amber", "Amethyst", "Emerald", "Ruby", "Sapphire", "Steel"] as const;

function cx(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}



const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='900'%3E%3Crect width='100%25' height='100%25' fill='%23f7edd9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236b5e50' font-size='28' font-family='Arial'%3EImage indisponible%3C/text%3E%3C/svg%3E";

export default function Home() {
  const [variantByCard, setVariantByCard] = useState<Record<string, "normal" | "foil">>({});
  const [userId, setUserId] = useState<"adrien" | "angele">("adrien");
  const [cards, setCards] = useState<Card[]>([]);
  const [col, setCol] = useState<Record<string, ColQty>>({});

  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [chapter, setChapter] = useState<"all" | string>("all");
  const [inks, setInks] = useState<Set<string>>(new Set());

  /* ------------------ LOAD USER ------------------ */
  useEffect(() => {
    const u = (localStorage.getItem("activeUser") as any) || "adrien";
    setUserId(u);
  }, []);

  /* ------------------ LOAD CARDS ------------------ */
  useEffect(() => {
    fetch("/api/cards", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCards(Array.isArray(data) ? data : []));
  }, []);

  /* ------------------ LOAD COLLECTION ------------------ */
  useEffect(() => {
    fetch(`/api/collection?userId=${userId}`)
      .then((r) => r.json())
      .then((rows: any[]) => {
        const map: Record<string, ColQty> = {};
        rows.forEach((r) => {
          map[r.cardId] = {
            normal: r.normal ?? 0,
            foil: r.foil ?? 0,
          };
        });
        setCol(map);
      });
  }, [userId]);

  /* ------------------ SET QTY ------------------ */
  async function setQty(cardId: string, variant: "normal" | "foil", qty: number) {
    const next = Math.max(0, qty);
    const prev = col[cardId] || { normal: 0, foil: 0 };

    setCol((p) => ({
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
      setCol((p) => ({ ...p, [cardId]: prev }));
      alert("❌ Erreur de sauvegarde");
    }
  }

  /* ------------------ FILTERS ------------------ */
  function toggleInk(ink: string) {
    setInks((p) => {
      const n = new Set(p);
      n.has(ink) ? n.delete(ink) : n.add(ink);
      return n;
    });
  }

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return cards.filter((c) => {
      if (s && !c.name.toLowerCase().includes(s)) return false;

      const qty = col[c.id];
      if (onlyMissing && (qty?.normal || 0) + (qty?.foil || 0) > 0) return false;

      if (chapter !== "all" && String(c.setCode ?? "") !== chapter) return false;
      if (inks.size && !inks.has(c.ink ?? "")) return false;

      return true;
    });
  }, [cards, q, onlyMissing, chapter, inks, col]);

  const chapters = useMemo(() => {
    const s = new Set<string>();
    cards.forEach((c) => {
      if (c.setCode && /^\d+$/.test(c.setCode)) s.add(c.setCode);
    });
    return [...s].sort((a, b) => Number(a) - Number(b));
  }, [cards]);

  /* ------------------ RENDER ------------------ */
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
          <input className="pill" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Rechercher…" />

          <label className="pill">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
            Manquantes
          </label>

          <select
            value={userId}
            onChange={(e) => {
              const v = e.target.value as any;
              setUserId(v);
              localStorage.setItem("activeUser", v);
            }}
          >
            <option value="adrien">Adrien</option>
            <option value="angele">Angèle</option>
          </select>
        </div>
      </header>

      {/* Filtres */}
      <div className="topbar" style={{ marginTop: 12 }}>
        <div className="chips">
          <span className={cx("chip", chapter === "all" && "active")} onClick={() => setChapter("all")}>
            Tous
          </span>
          {chapters.map((c) => (
            <span key={c} className={cx("chip", chapter === c && "active")} onClick={() => setChapter(c)}>
              {c}
            </span>
          ))}
        </div>

        <div className="chips">
          {INKS.map((i) => (
            <span key={i} className={cx("chip", inks.has(i) && "active")} onClick={() => toggleInk(i)}>
              {i}
            </span>
          ))}
        </div>
      </div>

      {/* CARTES */}
      <section className="grid">
        {filtered.map((c) => {
          const variant = variantByCard[c.id] ?? "normal";
          const qty = col[`${c.id}:${variant}`] || 0;
          const total = qty.normal + qty.foil;

          return (
            <article key={c.id} className="card">
              <div className="cardMedia">
                <img src={c.imageUrl || PLACEHOLDER} alt={c.name} loading="lazy" />

                <div className="variantSwitch">
                  <button
                    onClick={() =>
                      setVariantByCard((p) => ({ ...p, [c.id]: "normal" }))
                    }
                    style={{ fontWeight: variant === "normal" ? "bold" : "normal" }}
                  >
                    Normal
                  </button>

                  <button
                    onClick={() =>
                      setVariantByCard((p) => ({ ...p, [c.id]: "foil" }))
                    }
                    style={{ fontWeight: variant === "foil" ? "bold" : "normal" }}
                  >
                    ✨ Brillante
                  </button>
                </div>
 
                <div className="qtyPill two">
                  <div className="line">
                    <span>N</span>
                    <button onClick={() => setQty(c.id, "normal", qty.normal - 1)}>−</button>
                    <div className="num">{qty.normal}</div>
                    <button onClick={() => setQty(c.id, "normal", qty.normal + 1)}>+</button>
                  </div>

                  <div className="line">
                    <span>✨</span>
                    <button onClick={() => setQty(c.id, "foil", qty.foil - 1)}>−</button>
                    <div className="num">{qty.foil}</div>
                    <button onClick={() => setQty(c.id, "foil", qty.foil + 1)}>+</button>
                  </div>
                </div>

                <div className={cx("corner", total === 0 && "missing", total === 1 && "ok", total > 1 && "double")}>
                  {total === 0 ? "⬜ 0" : total === 1 ? "✅ OK" : "🎁 Double"}
                </div>

                <div className="overlay">
                  <div className="ovTitle">{c.name}</div>
                  <div className="ovMeta">
                    {c.setName} • Chapitre {c.setCode}
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
