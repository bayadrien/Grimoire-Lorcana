"use client";

import { useEffect, useMemo, useState } from "react";
import { tInk, tRarity } from "@/lib/lorcana-fr";
import { Toast } from "../components/Toast";
import AppHeader from "app/components/AppHeader";

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

type Finish = "normal" | "foil";

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
  const [finishByCard, setFinishByCard] = useState<Record<string, "normal" | "foil">>({});

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<{ other:string; gives:Card[]; receives:Card[]; possible:number; matches?:Array<{give:Card;receive:Card;giveValue:number;receiveValue:number;difference:number}> } | null>(null);

  // ✅ 2A: Toggle Grille/Liste + mémorisation
  const [view, setView] = useState<"grid" | "list">("grid");
  useEffect(() => {
    const saved = (localStorage.getItem("echangeView") as "grid" | "list" | null) || "grid";
    setView(saved);
  }, []);
  function setViewAndSave(v: "grid" | "list") {
    setView(v);
    localStorage.setItem("echangeView", v);
  }

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
    const userId = localStorage.getItem("activeUser") === "angele" ? "angele" : "adrien";
    fetch(`/api/echange/suggestions?userId=${userId}`, { cache: "no-store" }).then((response) => response.json()).then(setSuggestion).catch(() => undefined);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, chapter, ink]);

  async function markGiven(
    fromUser: "adrien" | "angele",
    toUser: "adrien" | "angele",
    cardId: string,
    quantity = 1,
    finish: "normal" | "foil" = "normal"
  ) {
    const key = fromUser + "->" + toUser + ":" + cardId;
    if (busy) return;

    setBusy(key);
    try {
      const res = await fetch("/api/trades/give", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUser, toUser, cardId, quantity, finish }),
      });

      const j = await res.json().catch(() => null);

      if (!res.ok) {
        alert("❌ Transfert impossible : " + (j?.error || res.status));
        return;
      }

      await load();
      setToast(`✅ Don effectué : ${fromUser} → ${toUser}`);
    } finally {
      setBusy(null);
    }
  }

  async function confirmSuggestedSwap() {
    const match = suggestion?.matches?.[0];
    if (!match || busy) return;
    const fromUser = localStorage.getItem("activeUser") === "angele" ? "angele" : "adrien";
    const toUser = fromUser === "adrien" ? "angele" : "adrien";
    setBusy("suggested-swap");
    try {
      const response = await fetch("/api/trades/swap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ give: { fromUser, toUser, cardId: match.give.id }, receive: { fromUser: toUser, toUser: fromUser, cardId: match.receive.id } }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) { alert("❌ Échange impossible : " + (result?.error || "réessaie dans un instant.")); return; }
      await load();
      const refreshedUser = localStorage.getItem("activeUser") === "angele" ? "angele" : "adrien";
      const refreshed = await fetch(`/api/echange/suggestions?userId=${refreshedUser}`, { cache: "no-store" }).then((res) => res.json());
      setSuggestion(refreshed);
      setToast("✨ Échange validé : les deux collections ont été mises à jour.");
    } finally { setBusy(null); }
  }

  const a2g = useMemo(() => data?.adrienToAngele ?? [], [data]);
  const g2a = useMemo(() => data?.angeleToAdrien ?? [], [data]);

  // ✅ rendu LISTE compacte (IRL)
  function ListView({
    rows,
    fromUser,
    toUser,
  }: {
    rows: Row[];
    fromUser: "adrien" | "angele";
    toUser: "adrien" | "angele";
  }) {
    if (!loading && rows.length === 0) return <div style={{ opacity: 0.8 }}>Rien à échanger ici 🎈</div>;

    return (
      <div className="listBox">
        {rows.map((r) => (
          <div key={r.card.id} className="listRow">
            <img className="listImg" src={r.card.imageUrl || PLACEHOLDER} alt={r.card.name} loading="lazy" />

            <div className="listMain">
              <div className="listTitle">{r.card.name}</div>
              <div className="listMeta">
                {r.card.setCode ? "Chapitre " + r.card.setCode : "Chapitre —"} • {tInk(r.card.ink)} •{" "}
                {tRarity(r.card.rarity)} • À donner: <b>{r.give}</b>
                <span style={{ marginLeft: 8, opacity: 0.8 }}>
                  ({fromUser === "adrien" ? "Adrien: " + r.aQty + " • Angèle: " + r.gQty : "Angèle: " + r.gQty + " • Adrien: " + r.aQty})
                </span>
              </div>
            </div>

            <button
              className="btn"
              disabled={busy === fromUser + "->" + toUser + ":" + r.card.id}
              onClick={() => markGiven(fromUser, toUser, r.card.id, 1)}
            >
              {busy === fromUser + "->" + toUser + ":" + r.card.id ? "⏳..." : "✅ Donné"}
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <main className="shell">
      <AppHeader />

      <div className="topbar" style={{ marginTop: 12, justifyContent: "space-between" }}>
        <div className="controls" style={{ gap: 10, flexWrap: "wrap" }}>
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

          {/* ✅ Toggle view */}
          <div className="controls" style={{ gap: 6 }}>
            <button className="btn" onClick={() => setViewAndSave("grid")} style={{ opacity: view === "grid" ? 1 : 0.6 }}>
              🧱 Grille
            </button>
            <button className="btn" onClick={() => setViewAndSave("list")} style={{ opacity: view === "list" ? 1 : 0.6 }}>
              📋 Liste
            </button>
          </div>
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

      {suggestion && suggestion.possible > 0 && <section className="swapSuggestion"><div><p>ÉCHANGE SUGGÉRÉ</p><h2>Un échange équilibré est possible avec {suggestion.other === "angele" ? "Angèle" : "Adrien"}</h2><span>{suggestion.matches?.[0] ? `Écart estimé : ${suggestion.matches[0].difference.toLocaleString("fr-FR", { style:"currency", currency:"EUR" })}.` : "Tu donnes un doublon contre une carte qui te manque."}</span></div><div className="swapCards">{suggestion.matches?.[0] ? <><div><img src={suggestion.matches[0].give.imageUrl || ""} alt={suggestion.matches[0].give.name}/><small>Tu donnes · {suggestion.matches[0].giveValue.toLocaleString("fr-FR", { style:"currency", currency:"EUR" })}</small></div><b>⇄</b><div><img src={suggestion.matches[0].receive.imageUrl || ""} alt={suggestion.matches[0].receive.name}/><small>Tu reçois · {suggestion.matches[0].receiveValue.toLocaleString("fr-FR", { style:"currency", currency:"EUR" })}</small></div></> : <><div>{suggestion.gives.slice(0, 2).map(card => <img key={card.id} src={card.imageUrl || ""} alt={card.name}/>)}</div><b>⇄</b><div>{suggestion.receives.slice(0, 2).map(card => <img key={card.id} src={card.imageUrl || ""} alt={card.name}/>)}</div></>}</div>{suggestion.matches?.[0] && <button className="confirmSwap" disabled={busy === "suggested-swap"} onClick={confirmSuggestedSwap}>{busy === "suggested-swap" ? "Validation…" : "✓ Valider cet échange"}</button>}</section>}

      {/* Adrien -> Angèle */}
      <section
        style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,.10)",
          background: "rgba(255,255,255,.04)",
        }}
      >
        <h2 style={{ margin: 0 }}>Adrien → Angèle</h2>
        <p style={{ marginTop: 6, opacity: 0.85 }}>
          Cartes où Adrien a des copies en trop (au-delà de 1) et Angèle en a 0.
        </p>

        {view === "list" ? (
          <ListView rows={a2g} fromUser="adrien" toUser="angele" />
        ) : (
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: 12,
            }}
          >
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
                          const finish = finishByCard[r.card.id] ?? "normal";
                          markGiven("adrien", "angele", r.card.id, 1, finish);
                        }}
                      >

                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button
                            className={finishByCard[r.card.id] !== "foil" ? "btn active" : "btn"}
                            onClick={() =>
                              setFinishByCard((s) => ({ ...s, [r.card.id]: "normal" }))
                            }
                          >
                            Normal
                          </button>

                          <button
                            className={finishByCard[r.card.id] === "foil" ? "btn active" : "btn"}
                            onClick={() =>
                              setFinishByCard((s) => ({ ...s, [r.card.id]: "foil" }))
                            }
                          >
                            ✨ Brillante
                          </button>
                        </div>
                        
                        {busy === "adrien->angele:" + r.card.id ? "⏳..." : "✅ Donné"}
                      </button>

                      <select
                        value={finishByCard[r.card.id] ?? "normal"}
                        onChange={(e) =>
                          setFinishByCard((s) => ({
                            ...s,
                            [r.card.id]: e.target.value as "normal" | "foil",
                          }))
                        }
                        className="pill"
                      >
                        <option value="normal">🃏 Normale</option>
                        <option value="foil">✨ Brillante</option>
                      </select>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`.swapSuggestion{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:16px;padding:18px 20px;border:1px solid #e6d6ac;border-radius:18px;background:linear-gradient(120deg,#fff8e8,#f2edff);box-shadow:0 8px 20px rgba(55,38,88,.06)}.swapSuggestion p{margin:0;color:#98711e;font-size:10px;font-weight:900;letter-spacing:.12em}.swapSuggestion h2{margin:5px 0;font-size:19px}.swapSuggestion span{font-size:11px;color:#766b7b}.swapCards{display:flex;align-items:center;gap:9px}.swapCards>div{display:flex;flex-direction:column;gap:4px}.swapCards small{font-size:9px;color:#796d83;white-space:nowrap}.swapCards img{width:37px;height:53px;object-fit:cover;border-radius:6px;border:2px solid white;margin-left:-9px;box-shadow:0 4px 9px rgba(0,0,0,.12)}.swapCards b{color:#70558f;font-size:22px}.confirmSwap{border:0;border-radius:11px;padding:11px 13px;background:#4f377c;color:#fff;font-size:11px;font-weight:900;cursor:pointer;box-shadow:0 7px 14px rgba(64,41,105,.22)}.confirmSwap:disabled{opacity:.6;cursor:wait}@media(max-width:600px){.swapSuggestion{align-items:flex-start;flex-direction:column}.swapCards{align-self:center}.confirmSwap{width:100%}}`}</style>

      {/* Angèle -> Adrien */}
      <section
        style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,.10)",
          background: "rgba(255,255,255,.04)",
        }}
      >
        <h2 style={{ margin: 0 }}>Angèle → Adrien</h2>
        <p style={{ marginTop: 6, opacity: 0.85 }}>
          Cartes où Angèle a des copies en trop (au-delà de 1) et Adrien en a 0.
        </p>

        {view === "list" ? (
          <ListView rows={g2a} fromUser="angele" toUser="adrien" />
        ) : (
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: 12,
            }}
          >
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
                          const finish = finishByCard[r.card.id] ?? "normal";
                          markGiven("angele", "adrien", r.card.id, 1, finish);
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
        )}
      </section>

      <Toast msg={toast} onClose={() => setToast(null)} />
    </main>
  );
}
