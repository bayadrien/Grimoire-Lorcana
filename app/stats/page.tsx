"use client";

import { useEffect, useMemo, useState } from "react";
import { tInk } from "@/lib/lorcana-fr";

type Stats = {
  totalCards: number;
  global: {
    adrienOwned: number;
    angeleOwned: number;
    duoOwned: number;
    adrienMissing: number;
    angeleMissing: number;
    duoMissing: number;
    adrienDoubles: number;
    angeleDoubles: number;
  };
  chapters: Array<{ chapter: string; total: number; adrienOwned: number; angeleOwned: number; duoOwned: number }>;
  inks: Array<{ ink: string; total: number; adrienOwned: number; angeleOwned: number; duoOwned: number }>;
};

function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

export default function StatsPage() {
  const [data, setData] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErr(null);
        const r = await fetch("/api/stats", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancel) setData(j);
      } catch (e: any) {
        if (!cancel) setErr(String(e?.message || e));
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const g = data?.global;

  const chapterRows = useMemo(() => data?.chapters ?? [], [data]);
  const inkRows = useMemo(() => data?.inks ?? [], [data]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="sigil">📊</div>
          <div>
            <h1>Statistiques</h1>
            <p>Comparaison Adrien vs Angèle + cumul</p>
          </div>
        </div>

        <div className="controls">
          <a className="link" href="/">🎴 Cartes</a>
          <a className="link" href="/chapitres">📚 Chapitres</a>
          <a className="link" href="/gift">🎁 Doubles</a>
        </div>
      </header>

      {!data && !err && (
        <div className="topbar" style={{ marginTop: 12 }}>
          <p>⏳ Chargement…</p>
        </div>
      )}

      {err && (
        <div className="topbar" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <p>❌ Erreur: {err}</p>
          <button className="btn" onClick={() => location.reload()}>
            Réessayer
          </button>
        </div>
      )}

      {data && g && (
        <>
          <section className="panel" style={{ marginTop: 12 }}>
            <h2 style={{ margin: 0 }}>Global</h2>

            <div className="statsGrid">
              <div className="statCard">
                <b>Adrien</b>
                <div className="big">{g.adrienOwned} / {data.totalCards}</div>
                <div className="muted">{pct(g.adrienOwned, data.totalCards)}% • {g.adrienMissing} manquantes</div>
                <div className="muted">Doubles: {g.adrienDoubles}</div>
              </div>

              <div className="statCard">
                <b>Angèle</b>
                <div className="big">{g.angeleOwned} / {data.totalCards}</div>
                <div className="muted">{pct(g.angeleOwned, data.totalCards)}% • {g.angeleMissing} manquantes</div>
                <div className="muted">Doubles: {g.angeleDoubles}</div>
              </div>

              <div className="statCard">
                <b>Cumul (vous deux)</b>
                <div className="big">{g.duoOwned} / {data.totalCards}</div>
                <div className="muted">{pct(g.duoOwned, data.totalCards)}% • {g.duoMissing} manquantes</div>
                <div className="muted">“Au moins l’un de vous l’a”</div>
              </div>
            </div>
          </section>

          <section className="panel" style={{ marginTop: 12 }}>
            <h2 style={{ margin: 0 }}>Par chapitre</h2>

            <div className="tableLike">
              <div className="row head">
                <div>Chapitre</div><div>Total</div><div>Adrien</div><div>Angèle</div><div>Cumul</div>
              </div>

              {chapterRows.map((r) => (
                <div className="row" key={r.chapter}>
                  <div>Chapitre {r.chapter}</div>
                  <div>{r.total}</div>
                  <div>{r.adrienOwned} ({pct(r.adrienOwned, r.total)}%)</div>
                  <div>{r.angeleOwned} ({pct(r.angeleOwned, r.total)}%)</div>
                  <div>{r.duoOwned} ({pct(r.duoOwned, r.total)}%)</div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel" style={{ marginTop: 12 }}>
            <h2 style={{ margin: 0 }}>Par encre</h2>

            <div className="tableLike">
              <div className="row head">
                <div>Encre</div><div>Total</div><div>Adrien</div><div>Angèle</div><div>Cumul</div>
              </div>

              {inkRows.map((r) => (
                <div className="row" key={r.ink}>
                  <div>{tInk(r.ink)}</div>
                  <div>{r.total}</div>
                  <div>{r.adrienOwned} ({pct(r.adrienOwned, r.total)}%)</div>
                  <div>{r.angeleOwned} ({pct(r.angeleOwned, r.total)}%)</div>
                  <div>{r.duoOwned} ({pct(r.duoOwned, r.total)}%)</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <style jsx>{`
        .panel{
          padding: 14px;
          border-radius: 16px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.10);
        }
        .statsGrid{
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .statCard{
          padding: 14px;
          border-radius: 16px;
          background: rgba(0,0,0,.20);
          border: 1px solid rgba(255,255,255,.10);
        }
        .big{ font-size: 24px; font-weight: 800; margin-top: 6px; }
        .muted{ opacity: .8; margin-top: 6px; }

        .tableLike{ margin-top: 12px; }
        .row{
          display: grid;
          grid-template-columns: 1.2fr .6fr 1fr 1fr 1fr;
          gap: 10px;
          padding: 10px 8px;
          border-top: 1px solid rgba(255,255,255,.10);
        }
        .row.head{
          opacity: .85;
          font-weight: 700;
          border-top: none;
        }

        @media (max-width: 900px){
          .statsGrid{ grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
