"use client";

import { useState } from "react";
import AppHeader from "app/components/AppHeader";
import { CHAPTERS_NAMES_FR } from "@/lib/chapters-fr";

type Chapter = {
  id: number;
  image: string;
};

const chapters: Chapter[] = [
  { id: 1, image: "/chapters/ch1.jpg" },
  { id: 2, image: "/chapters/ch2.jpg" },
  { id: 3, image: "/chapters/ch3.jpg" },
  { id: 4, image: "/chapters/ch4.jpg" },
  { id: 5, image: "/chapters/ch5.jpg" },
  { id: 6, image: "/chapters/ch6.jpg" },
  { id: 7, image: "/chapters/ch7.jpg" },
  { id: 8, image: "/chapters/ch8.jpg" },
  { id: 9, image: "/chapters/ch9.jpg" },
  { id: 10, image: "/chapters/ch10.jpg" },
  { id: 11, image: "/chapters/ch11.jpg" },
];

const boostersByChapter: Record<number, string[]> = {
  1: ["/boosters/ch1-1.jpg", "/boosters/ch1-2.jpg", "/boosters/ch1-3.jpg"],
  2: ["/boosters/ch2-1.jpg", "/boosters/ch2-2.jpg", "/boosters/ch2-3.jpg"],
  3: ["/boosters/ch3-1.jpg", "/boosters/ch3-2.jpg", "/boosters/ch3-3.jpg"],
  4: ["/boosters/ch4-1.jpg", "/boosters/ch4-2.jpg", "/boosters/ch4-3.jpg"],
  5: ["/boosters/ch5-1.jpg", "/boosters/ch5-2.jpg", "/boosters/ch5-3.jpg"],
  6: ["/boosters/ch6-1.jpg", "/boosters/ch6-2.jpg", "/boosters/ch6-3.jpg"],
  7: ["/boosters/ch7-1.jpg", "/boosters/ch7-2.jpg", "/boosters/ch7-3.jpg"],
  8: ["/boosters/ch8-1.jpg", "/boosters/ch8-2.jpg", "/boosters/ch8-3.jpg"],
  9: ["/boosters/ch9-1.jpg", "/boosters/ch9-2.jpg", "/boosters/ch9-3.jpg"],
  10: ["/boosters/ch10-1.jpg", "/boosters/ch10-2.jpg", "/boosters/ch10-3.jpg"],
  11: ["/boosters/ch11-1.jpg", "/boosters/ch11-2.jpg", "/boosters/ch11-3.jpg"],
};

export default function OpeningPage() {
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedBooster, setSelectedBooster] = useState<number | null>(null);

  const boosters = selectedChapter ? boostersByChapter[selectedChapter] : [];

  return (
    <main className="shell">
      <AppHeader title="Ouverture de booster" icon="✨" />

      <section className="container">

    {/* ===== CHAPITRES ===== */}
    <h2>Choisissez un chapitre</h2>

    <div className="chaptersGrid">
      {chapters.map((c) => (
        <div
          key={c.id}
          className={`card ${selectedChapter === c.id ? "active" : ""}`}
          onClick={() => {
            setSelectedChapter(c.id);
            setSelectedBooster(null);
          }}
        >
          <img src={c.image} />
        </div>
      ))}
    </div>

        {/* ===== BOOSTERS ===== */}
        {selectedChapter && (
          <>
            <div className="divider" />

            <h2>Choisissez un booster</h2>

            <div className="row center">
              {boosters.map((img, i) => (
                <div
                  key={i}
                  className={`booster ${selectedBooster === i ? "active" : ""}`}
                  onClick={() => setSelectedBooster(i)}
                >
                  <img src={img} />
                </div>
              ))}
            </div>

            {/* ===== BOUTON ===== */}
            {selectedBooster !== null && (
              <a
                href={`/opening/live?chapter=${selectedChapter}&booster=${encodeURIComponent(
                  boosters[selectedBooster]
                )}`}
                className="btn"
              >
                Ouvrir le booster
              </a>
            )}
          </>
        )}
      </section>

      {/* ===== STYLE ===== */}
      <style jsx>{`
        .container {
          max-width: 900px;
          margin: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .chaptersGrid {
          display: grid;
          grid-template-columns: repeat(6, 100px); /* 6 colonnes fixes */
          justify-content: center; /* centre la grille */
          gap: 16px;
        }

        .chapterCard img {
          width: 100%;
          height: auto;
          border-radius: 12px;
        }

        h2 {
          font-size: 18px;
        }

        .row {
          display: flex;
          gap: 12px;
          overflow-x: auto;
        }

        .row.center {
          justify-content: center;
        }

        .card {
          width: 115px;
          cursor: pointer;
          border-radius: 10px;
          overflow: hidden;
          background: #fffdf8;
          transition: 0.2s;
        }

        .card img {
          width: 100%;
          height: auto;
          object-fit: cover;
        }

        .card.active {
          outline: 3px solid #c9a86a;
        }

        .label {
          text-align: center;
          font-size: 12px;
          padding: 5px;
          display: none;
        }

        .booster {
          width: 120px;
          cursor: pointer;
          transition: 0.2s;
        }

        .booster img {
          width: 100%;
          height: 180px;
          object-fit: cover;
          border-radius: 10px;
        }

        .booster.active {
          outline: 3px solid #c9a86a;
          transform: scale(1.05);
        }

        .divider {
          height: 1px;
          background: #ddd;
        }

        .btn {
          margin: auto;
          padding: 12px 20px;
          background: #c9a86a;
          color: white;
          border-radius: 10px;
          text-align: center;
          width: fit-content;
        }
      `}</style>
    </main>
  );
}