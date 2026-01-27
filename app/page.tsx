"use client";
import { useEffect, useMemo, useState } from "react";
import { tInk, tRarity } from "@/lib/lorcana-fr";

type Card = {
  id: string;
  name: string;
  setName: string;
  setCode?: string | null; // "1".."10"
  ink?: string | null;     // Amber, Ruby...
  rarity?: string | null;
  cost?: number | null;
  imageUrl?: string | null;
};

type ColRow = { cardId: string; quantity: number };

const INKS = ["Amber", "Amethyst", "Emerald", "Ruby", "Sapphire", "Steel"] as const;

function cx(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

export default function Home() {
  const [userId, setUserId] = useState<"adrien" | "angele">("adrien");
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [col, setCol] = useState<Record<string, number>>({});

  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);

  const [chapter, setChapter] = useState<"all" | string>("all"); // "all" ou "1".."10"
  const [inks, setInks] = useState<Set<string>>(new Set()); // multi-select

  useEffect(() => {
    const u = (localStorage.getItem("activeUser") as any) || "adrien";
    setUserId(u);
  }, []);

  useEffect(() => {
  let cancelled = false;

  async function loadCards() {
    try {
      setLoadingCards(true);
      setCardsError(null);

      const r = await fetch("/api/cards", { cache: "no-store" });
      if (!r.ok) throw new Error(`API /api/cards: ${r.status}`);

      const data = await r.json();
      if (!cancelled) setCards(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (!cancelled) setCardsError(String(e?.message || e));
    } finally {
      if (!cancelled) setLoadingCards(false);
    }
  }

  loadCards();
  return () => {
    cancelled = true;
  };
}, []);


  useEffect(() => {
    fetch(`/api/collection?userId=${userId}`)
      .then((r) => r.json())
      .then((rows: ColRow[]) => {
        const map: Record<string, number> = {};
        rows.forEach((x) => (map[x.cardId] = x.quantity));
        setCol(map);
      });
  }, [userId]);

  async function setQty(cardId: string, quantity: number) {
  const next = Math.max(0, quantity);

  // On garde une copie pour rollback si l'API plante
  const prev = col[cardId] || 0;

  // Optimiste
  setCol((p) => ({ ...p, [cardId]: next }));

  try {
    const res = await fetch("/api/collection/setQty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, cardId, quantity: next }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${text}`);
    }
  } catch (e) {
    // Rollback + message clair
    setCol((p) => ({ ...p, [cardId]: prev }));
    alert("❌ Sauvegarde impossible. Regarde les logs Vercel (Function setQty).");
  }
}


  function toggleInk(ink: string) {
    setInks((prev) => {
      const n = new Set(prev);
      if (n.has(ink)) n.delete(ink);
      else n.add(ink);
      return n;
    });
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return cards.filter((c) => {
      // recherche
      if (s && !c.name.toLowerCase().includes(s)) return false;

      // manquantes
      const qty = col[c.id] || 0;
      if (onlyMissing && qty !== 0) return false;

      // chapitre
      if (chapter !== "all" && String(c.setCode ?? "") !== String(chapter)) return false;

      // encre
      if (inks.size > 0) {
        const ink = c.ink ?? "";
        if (!inks.has(ink)) return false;
      }

      return true;
    });
  }, [cards, q, onlyMissing, chapter, inks, col]);

  const chapters = useMemo(() => {
    // On liste uniquement les chapitres présents (1..10)
    const s = new Set<string>();
    for (const c of cards) {
      const code = c.setCode ? String(c.setCode) : "";
      if (/^\d+$/.test(code) && Number(code) >= 1 && Number(code) <= 10) s.add(code);
    }
    return Array.from(s).sort((a, b) => Number(a) - Number(b));
  }, [cards]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="sigil">📜</div>
          <div>
            <h1>Grimoire Lorcana</h1>
            <p>
              {loadingCards
                ? "⏳ Chargement des cartes…"
                : cardsError
                ? "❌ Erreur de chargement"
                : `${filtered.length} cartes affichées`}
            </p>

          </div>
        </div>

        <div className="controls">
          <input
            className="pill"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔎 Rechercher une carte…"
          />

          <label className="pill" style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
            }}
          >
            <option value="adrien">Adrien</option>
            <option value="angele">Angèle</option>
          </select>

          <a className="link" href="/stats">📊 Stats</a>
          <a className="link" href="/gift">🎁 Doubles</a>
          <a className="link" href="/chapitres">📚 Chapitres</a>
          <a className="link" href="/echange">🤝 Échange</a>


        </div>
      </header>
      
      {cardsError && (
  <div className="topbar" style={{ marginTop: 12, justifyContent: "space-between" }}>
    <p>❌ Impossible de charger les cartes: {cardsError}</p>
    <button className="btn" onClick={() => location.reload()}>Réessayer</button>
  </div>
)}

      {/* Filtres premium */}
      <div className="topbar" style={{ marginTop: 12, justifyContent: "space-between" }}>
        <div className="filters">
          <b style={{ opacity: 0.85 }}>Chapitre</b>
          <div className="chips">
            <span className={cx("chip small", chapter === "all" && "active")} onClick={() => setChapter("all")}>
              Tous
            </span>
            {chapters.map((ch) => (
              <span
                key={ch}
                className={cx("chip small", chapter === ch && "active")}
                onClick={() => setChapter(ch)}
              >
                {ch}
              </span>
            ))}
          </div>
        </div>

        <div className="filters">
          <b style={{ opacity: 0.85 }}>Encre</b>
          <div className="chips">
            {INKS.map((ink) => (
              <span
                key={ink}
                className={cx("chip small", `ink-${ink}`, inks.has(ink) && "active")}
                onClick={() => toggleInk(ink)}
              >
                {ink}
              </span>
            ))}
            {inks.size > 0 && (
              <button className="btn" onClick={() => setInks(new Set())}>
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Galerie */}
      <section className="grid">
        {filtered.map((c) => {
          const qty = col[c.id] || 0;
          const cornerClass = qty > 1 ? "double" : qty === 1 ? "ok" : "missing";
          const cornerText = qty > 1 ? "🎁 Double" : qty === 1 ? "✅ OK" : "⬜ 0";

          return (
            <article key={c.id} className="card">
              <div className="cardMedia">
                <img
  src={
    c.imageUrl ||
    "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='600'%20height='900'%3E%3Crect%20width='100%25'%20height='100%25'%20fill='%23f7edd9'/%3E%3Ctext%20x='50%25'%20y='50%25'%20dominant-baseline='middle'%20text-anchor='middle'%20fill='%236b5e50'%20font-size='28'%20font-family='Arial'%3EImage%20indisponible%3C/text%3E%3C/svg%3E"
  }
  alt={c.name}
  loading="lazy"
  onError={(e) => {
    const img = e.currentTarget;

    // Évite boucle infinie
    if (img.dataset.fallback === "1") {
      img.src =
        "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='600'%20height='900'%3E%3Crect%20width='100%25'%20height='100%25'%20fill='%23f7edd9'/%3E%3Ctext%20x='50%25'%20y='50%25'%20dominant-baseline='middle'%20text-anchor='middle'%20fill='%236b5e50'%20font-size='28'%20font-family='Arial'%3EImage%20indisponible%3C/text%3E%3C/svg%3E";
      return;
    }

    // Retry 1 fois (cache-bust)
    img.dataset.fallback = "1";
    const original = img.src;
    img.src = original.includes("?")
      ? original + "&retry=1"
      : original + "?retry=1";
  }}
/>


                <div className="qtyPill">
                  <button onClick={() => setQty(c.id, qty - 1)} aria-label="Diminuer">−</button>
                  <div className="num">{qty}</div>
                  <button onClick={() => setQty(c.id, qty + 1)} aria-label="Augmenter">+</button>
                </div>

                <div className={`corner ${cornerClass}`}>{cornerText}</div>

                <div className="overlay">
                  <div className="ovTitle">{c.name}</div>
                  <div className="ovMeta">
                    {c.setName}{c.setCode ? ` • Chapitre ${c.setCode}` : ""}<br />
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
