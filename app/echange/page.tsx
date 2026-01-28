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

type Row = { card: Card; give: number; aQty: number; gQty: number };

type Payload = {
  filters: { chapters: string[]; inks: string[] };
  adrienToAngele: Row[];
  angeleToAdrien: Row[];
  summary: {
    adrienToAngeleCount: number;
    angeleToAdrienCount: number;
    adrienToAngeleCopies: number;
    angeleToAdrienCopies: number;
  };
};

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='600'%20height='900'%3E%3Crect%20width='100%25'%20height='100%25'%20fill='%23f7edd9'/%3E%3Ctext%20x='50%25'%20y='50%25'%20dominant-baseline='middle'%20text-anchor='middle'%20fill='%236b5e50'%20font-size='28'%20font-family='Arial'%3EImage%20indisponible%3C/text%3E%3C/svg%3E";

export default function EchangePage() {
  const [q, setQ] = useState("");
  const [chapter, setChapter] = useState<string>("all");
  const [ink, setInk] = useState<string>("all");

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("chapter", chapter);
      params.set("ink", ink);

      const r = await fetch("/api/echange?" + params.toString(), { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);

      const j = (await r.json()) as Payload;
      setData(j);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, chapter, ink]);

  async function markGiven(fromUser: "adrien" | "angele", toUser: "adrien" | "angele", cardId: string, quantity = 1) {
    const key = fromUser + "->" + toUser + ":" + cardId;
    if (busy) return;

    setBusy(key);
    try {
      const res = await fetch("/api/trades/give", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUser, toUser, cardId, quantity }),
      });

      const j = await res.json().catch(() => null);

      if (!res.ok) {
        alert("❌ Transfert impossible : " + (j?.error || res.status));
        return;
      }

      await load();
    } finally {
      setBusy(null);
    }
  }

  const a2g = useMemo(() => data?.adrienToAngele ?? [], [data]);
  const g2a = useMemo(() => data?.angeleToAdrien ?? [], [data]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="sigil">🤝</div>
          <div>
            <h1>Mode échange</h1>
            <p>Les doubles utiles, prêts à passer de main en main</p>
          </div>
        </div>

        <div className="controls">
          <a className="link" href="/">🎴 Cartes</a>
          <a className="link" href="/chapitres">📚 Chapitres</a>
          <a className="link" href="/stats">📊 Stats</a>
          <a className="link" href="/gift">🎁 Doubles</a>
          <a className="link" href="/echange/historique">🧾 Historique</a>
        </div>
      </header>

      <div className="topbar" style={{ marginTop: 12, justifyContent: "space-between" }}>
        <div className="controls" style={{ gap: 10 }}>
          <input
            className="pill"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔎 Rechercher une carte..."
          />

          <select value={chapter} onChange={(e) => setChapter(e.target.value)}>
            <option value="all">Tous les chapitres</option>
            {(data?.filters.chapters ?? []).map((ch) => (
              <option key={ch} value={ch}>
                Chapitre {ch}
              </option>
            ))}
          </select>

          <select value={ink} onChange={(e) => setInk(e.target.value)}>
            <option value="all">Toutes les encres</option>
            {(data?.filters.inks ?? []).map((x) => (
              <option key={x} value={x}>
                {tInk(x)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ opacity: 0.85 }}>
          {loading ? (
            "⏳"
          ) : data ? (
            <>
              Adrien→Angèle: <b>{data.summary.adrienToAngeleCount}</b> (copies:{" "}
              <b>{data.summary.adrienToAngeleCopies}</b>) • Angèle→Adrien:{" "}
              <b>{data.summary.angeleToAdrienCount}</b> (copies: <b>{data.summary.angeleToAdrienCopies}</b>)
            </>
          ) : null}
        </div>
      </div>

      {err && (
        <div className="topbar" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <p>❌ Erreur: {err}</p>
          <button className="btn" onClick={() => location.reload()}>
            Réessayer
          </button>
        </div>
      )}

      <section style={{ marginTop: 12, padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)" }}>
        <h2 style={{ margin: 0 }}>Adrien → Angèle</h2>
        <p style={{ marginTop: 6, opacity: 0.85 }}>
          Cartes où Adrien a des copies en trop (au-delà de 1) et Angèle en a 0.
        </p>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
          {!loading && a2g.length === 0 && <div style={{ opacity: 0.8 }}>Rien à échanger ici 🎈</div>}

          {a2g.map((r) => (
            <article key={r.card.id} className="card">
              <div className="cardMedia">
                <img src={r.card.imageUrl || PLACEHOLDER} alt={r.card.name} loading="lazy" />

                <div className="corner ok">À donner: {r.give}</div>

                <div className="overlay">
                  <div className="ovTitle">{r.card.name}</div>
                  <div className="ovMeta">
                    {r.card.setName}
                    {r.card.setCode ? " • Chapitre " + r.card.setCode : ""}
                    <br />
                    {tInk(r.card.ink)} • {tRarity(r.card.rarity)} • Coût {r.card.cost ?? "—"}
                    <br />
                    Adrien: {r.aQty} • Angèle: {r.gQty}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button
                      className="btn"
                      disabled={busy === "adrien->angele:" + r.card.id}
                      onClick={(e) => {
                        e.preventDefault();
                        markGiven("adrien", "angele", r.card.id, 1);
                      }}
                    >
                      {busy === "adrien->angele:" + r.card.id ? "⏳..." : "✅ Donné"}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 12, padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)" }}>
        <h2 style={{ margin: 0 }}>Angèle → Adrien</h2>
        <p style={{ marginTop: 6, opacity: 0.85 }}>
          Cartes où Angèle a des copies en trop (au-delà de 1) et Adrien en a 0.
        </p>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
          {!loading && g2a.length === 0 && <div style={{ opacity: 0.8 }}>Rien à échanger ici 🎈</div>}

          {g2a.map((r) => (
            <article key={r.card.id} className="card">
              <div className="cardMedia">
                <img src={r.card.imageUrl || PLACEHOLDER} alt={r.card.name} loading="lazy" />

                <div className="corner ok">À donner: {r.give}</div>

                <div className="overlay">
                  <div className="ovTitle">{r.card.name}</div>
                  <div className="ovMeta">
                    {r.card.setName}
                    {r.card.setCode ? " • Chapitre " + r.card.setCode : ""}
                    <br />
                    {tInk(r.card.ink)} • {tRarity(r.card.rarity)} • Coût {r.card.cost ?? "—"}
                    <br />
                    Angèle: {r.gQty} • Adrien: {r.aQty}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button
                      className="btn"
                      disabled={busy === "angele->adrien:" + r.card.id}
                      onClick={(e) => {
                        e.preventDefault();
                        markGiven("angele", "adrien", r.card.id, 1);
                      }}
                    >
                      {busy === "angele->adrien:" + r.card.id ? "⏳..." : "✅ Donné"}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
