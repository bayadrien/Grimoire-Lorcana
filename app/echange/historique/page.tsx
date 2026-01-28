"use client";

import { useEffect, useState } from "react";

type Trade = {
  id: string;
  fromUser: string;
  toUser: string;
  quantity: number;
  createdAt: string;
  card: { name: string; setCode?: string | null; setName?: string | null };
};

export default function HistoriqueEchange() {
  const [rows, setRows] = useState<Trade[]>([]);
  const [from, setFrom] = useState("all");
  const [to, setTo] = useState("all");

  useEffect(() => {
    const p = new URLSearchParams({ from, to });
    fetch(`/api/trades/list?${p.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setRows);
  }, [from, to]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="sigil">🧾</div>
          <div>
            <h1>Historique des échanges</h1>
            <p>{rows.length} lignes</p>
          </div>
        </div>

        <div className="controls">
          <a className="link" href="/echange">⬅️ Échange</a>
          <a className="link" href="/">🎴 Cartes</a>
        </div>
      </header>

      <div className="topbar" style={{ marginTop: 12, justifyContent: "space-between" }}>
        <div className="controls" style={{ gap: 10 }}>
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="all">De: tous</option>
            <option value="adrien">De: Adrien</option>
            <option value="angele">De: Angèle</option>
          </select>

          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="all">Vers: tous</option>
            <option value="adrien">Vers: Adrien</option>
            <option value="angele">Vers: Angèle</option>
          </select>
        </div>
      </div>

      <section style={{ marginTop: 12 }}>
        {rows.map((t) => (
          <div key={t.id} className="topbar" style={{ marginTop: 10, justifyContent: "space-between" }}>
            <div>
              <b>{t.card.name}</b>
              <div style={{ opacity: 0.8, marginTop: 4 }}>
                {t.card.setName}{t.card.setCode ? ` • Chapitre ${t.card.setCode}` : ""} • Qty: {t.quantity}
              </div>
            </div>
            <div style={{ opacity: 0.85 }}>
              {t.fromUser} → {t.toUser}<br />
              <span style={{ fontSize: 12, opacity: 0.75 }}>{new Date(t.createdAt).toLocaleString("fr-FR")}</span>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
