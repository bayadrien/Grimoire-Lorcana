"use client";

import { useEffect, useMemo, useState } from "react";
import { CHAPTERS_NAMES_FR } from "@/lib/chapters-fr";

type Card = {
  id: string;
  setCode?: string | null;
  setName: string;
};

export default function ChapitresPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cards", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setCards(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const chapters = useMemo(() => {
    const map = new Map<string, { code: string; total: number }>();

    cards.forEach((c) => {
      if (!c.setCode) return;
      if (!/^\d+$/.test(c.setCode)) return;

      if (!map.has(c.setCode)) {
        map.set(c.setCode, {
          code: c.setCode,
          total: 0,
        });
      }

      map.get(c.setCode)!.total += 1;
    });

    return Array.from(map.values()).sort(
      (a, b) => Number(a.code) - Number(b.code)
    );
  }, [cards]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="sigil">📚</div>
          <div>
            <h1>Chapitres</h1>
            <p>
              {loading
                ? "Chargement…"
                : `${chapters.length} chapitres`}
            </p>
          </div>
        </div>
      </header>

      <section className="grid" style={{ marginTop: 16 }}>
        {chapters.map((ch) => (
          <a
            key={ch.code}
            href={`/chapitres/${ch.code}`}
            className="albumCard"
          >
            <div className="albumTitle">
              Chapitre {ch.code}
            </div>
            <div className="albumSub">
              {CHAPTERS_NAMES_FR[ch.code] ??
                `Chapitre ${ch.code}`}
            </div>
            <div className="albumFooter">
              {ch.total} cartes
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
