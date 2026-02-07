"use client";

type Props = {
  aName: string;
  aOwned: number;
  gName: string;
  gOwned: number;
  total: number;
};

function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

export default function UserCompare({
  aName,
  aOwned,
  gName,
  gOwned,
  total,
}: Props) {
  const aPct = pct(aOwned, total);
  const gPct = pct(gOwned, total);

  const leader =
    aPct === gPct ? "equal" : aPct > gPct ? "a" : "g";

  return (
    <section className="duelBox">
      <h2 className="duelTitle">⚔️ Duel de collection</h2>

      {/* ADRIEN */}
      <div className={`fighter ${leader === "a" ? "winner" : ""}`}>
        <div className="name">
          {aName} {leader === "a" && <span>👑</span>}
        </div>

        <div className="bar">
          <div
            className="fill adrien"
            style={{ width: `${aPct}%` }}
          />
        </div>

        <div className="stats">
          {aPct}% • {aOwned} cartes
        </div>
      </div>

      <div className="vs">VS</div>

      {/* ANGÈLE */}
      <div className={`fighter ${leader === "g" ? "winner" : ""}`}>
        <div className="name">
          {gName} {leader === "g" && <span>👑</span>}
        </div>

        <div className="bar">
          <div
            className="fill angele"
            style={{ width: `${gPct}%` }}
          />
        </div>

        <div className="stats">
          {gPct}% • {gOwned} cartes
        </div>
      </div>

      <style jsx>{`
        .duelBox {
          margin-top: 20px;
          padding: 22px;
          border-radius: 26px;
          background: linear-gradient(145deg, #2c2c2c, #121212);
          box-shadow: 0 30px 80px rgba(0,0,0,.6);
          color: white;
        }

        .duelTitle {
          text-align: center;
          font-size: 20px;
          font-weight: 900;
          margin-bottom: 18px;
        }

        .fighter {
          padding: 14px;
          border-radius: 18px;
          background: rgba(255,255,255,.06);
          transition: transform .3s ease;
        }

        .fighter.winner {
          transform: scale(1.03);
          box-shadow: 0 0 25px rgba(255,215,0,.45);
        }

        .name {
          font-weight: 900;
          font-size: 16px;
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .bar {
          margin: 8px 0;
          height: 14px;
          background: rgba(255,255,255,.15);
          border-radius: 999px;
          overflow: hidden;
        }

        .fill {
          height: 100%;
          border-radius: 999px;
          animation: grow 1.2s ease forwards;
        }

        .fill.adrien {
          background: linear-gradient(90deg, #4facfe, #00f2fe);
        }

        .fill.angele {
          background: linear-gradient(90deg, #f093fb, #f5576c);
        }

        .stats {
          font-size: 13px;
          opacity: .85;
        }

        .vs {
          text-align: center;
          font-weight: 900;
          opacity: .6;
          margin: 10px 0;
        }

        @keyframes grow {
          from { width: 0; }
        }
      `}</style>
    </section>
  );
}
