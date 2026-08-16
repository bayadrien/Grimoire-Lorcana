"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type User = "adrien" | "angele";
type SearchCard = { id:string; name?:string|null; name_fr?:string|null; imageUrl?:string|null; setCode?:string|null; collection_number?:string|null; ink?:string|null; rarity?:string|null; quantity:number };

export default function AppHeader() {
  const pathname = usePathname();

  const [activeUser, setActiveUser] = useState<User>("adrien");
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchCard[]>([]);
  const [preview, setPreview] = useState<SearchCard | null>(null);

  useEffect(() => {
    const u = (localStorage.getItem("activeUser") as User) || "adrien";
    setActiveUser(u);
  }, []);

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return; }
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(search)}&userId=${activeUser}`, { cache: "no-store" })
        .then((response) => response.json())
        .then((data) => setResults(Array.isArray(data.cards) ? data.cards : []));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [search, activeUser]);

  function changeUser(u: User) {
    setActiveUser(u);
    localStorage.setItem("activeUser", u);
    window.location.reload();
  }

  const navItems = [
    { href: "/", label: "Accueil", icon: "✨" },
    { href: "/chapitres", label: "Chapitres", icon: "📚" },
    { href: "/stats", label: "Stats", icon: "📊" },
    { href: "/echange", label: "Échange", icon: "🤝" },
    { href: "/deck", label: "Deck", icon: "🃏" },
    { href: "/opening", label: "Opening", icon: "🎁" },
    { href: "/opening/history", label: "Historique", icon: "📜" },
  ];

  return (
    <>
      <header className="nav">
        {/* LEFT */}
        <div className="left">
          <div className="logo">✨</div>
          <div className="brandText">
            <div className="title">Grimoire</div>
            <div className="subtitle">Lorcana</div>
          </div>
        </div>

        {/* CENTER */}
        <div className="center">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`link ${isActive ? "active" : ""}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="globalSearch">
          <span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une carte…" />
          {results.length > 0 && <div className="searchResults">{results.map((card) => <button key={card.id} onClick={() => { setPreview(card); setSearch(""); setResults([]); }}><img src={card.imageUrl || ""} alt=""/><span><b>{card.name_fr || card.name}</b><small>C{card.setCode || "—"} · #{card.collection_number || "—"} · {card.quantity ? `${card.quantity} possédée${card.quantity > 1 ? "s" : ""}` : "manquante"}</small></span></button>)}</div>}
        </div>

        {/* RIGHT */}
        <div className="right">
          <select
            value={activeUser}
            onChange={(e) =>
              changeUser(e.target.value as User)
            }
          >
            <option value="adrien">Adrien</option>
            <option value="angele">Angèle</option>
          </select>

          <button className="burger" onClick={() => setMenuOpen(true)}>
            ☰
          </button>
        </div>
      </header>

      {/* MOBILE */}
      {menuOpen && (
        <div className="overlay" onClick={() => setMenuOpen(false)}>
          <div className="menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(false)}>✕</button>

            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {preview && <div className="quickOverlay" onClick={() => setPreview(null)}><article className="quickCard" onClick={(event) => event.stopPropagation()}><button className="closeQuick" onClick={() => setPreview(null)}>×</button><img src={preview.imageUrl || ""} alt={preview.name_fr || preview.name || "Carte Lorcana"}/><div><p>FICHE RAPIDE · CHAPITRE {preview.setCode || "—"}</p><h2>{preview.name_fr || preview.name}</h2><span>{preview.ink || "—"} · {preview.rarity || "—"}</span><strong>{preview.quantity ? `✓ ${preview.quantity} exemplaire${preview.quantity > 1 ? "s" : ""}` : "◇ Carte manquante"}</strong><Link href={`/cartes/${preview.id}`}>Voir la fiche complète →</Link></div></article></div>}

      <style jsx global>{`
        /* NAVBAR */
        .nav {
          position: sticky;
          top: 0;
          z-index: 1000;

          width: 100%;
          height: 64px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 20px;

          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(12px);

          border-bottom-left-radius: 18px;
          border-bottom-right-radius: 18px;

          box-shadow: 0 8px 25px rgba(0,0,0,0.08);
        }

        /* LEFT */
        .left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo {
          width: 36px;
          height: 36px;
          border-radius: 12px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: linear-gradient(135deg, #ffd700, #ffb800);
          color: white;
          font-size: 18px;

          box-shadow: 0 6px 14px rgba(255,184,0,0.3);
        }

        .brandText .title {
          font-weight: 600;
          font-size: 15px;

          background: linear-gradient(90deg, #ffd700, #ffb800);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brandText .subtitle {
          font-size: 12px;
          color: #777;
        }

        /* CENTER NAV */
        .center {
          display: flex;
          gap: 4px;

          background: rgba(0,0,0,0.04);
          padding: 4px;
          border-radius: 999px;
        }

        .link {
          padding: 8px 14px;
          border-radius: 999px;

          display: flex;
          align-items: center;
          gap: 6px;

          font-size: 14px;
          font-weight: 500;
          color: #444;

          transition: all 0.2s ease;
        }

        .link:hover {
          background: rgba(0,0,0,0.06);
          color: black;
        }

        .link.active {
          background: linear-gradient(90deg, #ffd700, #ffb800);
          color: black;

          box-shadow: 0 4px 10px rgba(255,184,0,0.25);
        }

        /* RIGHT */
        .right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .globalSearch { position:relative; display:flex; align-items:center; gap:5px; width:200px; padding:0 9px; border:1px solid #e6e1e8; border-radius:999px; background:#faf9fb; color:#796e88; }
        .globalSearch input { width:100%; min-width:0; height:33px; border:0; outline:0; background:transparent; padding:0; font:inherit; font-size:11px; }
        .searchResults { position:absolute; top:42px; right:0; width:330px; max-height:430px; overflow:auto; border:1px solid #e5e0e8; border-radius:14px; background:#fff; padding:6px; box-shadow:0 18px 42px rgba(35,24,57,.18); z-index:1002; }
        .searchResults button { width:100%; display:flex; align-items:center; gap:9px; padding:6px; border:0; border-radius:9px; background:transparent; text-align:left; cursor:pointer; color:#302a39; }
        .searchResults button:hover { background:#f5f2f8; }.searchResults img { width:31px; height:44px; object-fit:cover; border-radius:5px; background:#eee9f0; }.searchResults b,.searchResults small { display:block; }.searchResults b{font-size:11px}.searchResults small{margin-top:3px;font-size:9px;color:#8e8595}
        .quickOverlay { position:fixed; inset:0; z-index:2000; display:grid; place-items:center; padding:18px; background:rgba(21,14,35,.5); backdrop-filter:blur(5px); }.quickCard { position:relative; display:grid; grid-template-columns:160px minmax(0,1fr); gap:19px; width:min(510px,100%); padding:18px; border-radius:20px; background:linear-gradient(145deg,#fff,#f4eff9); box-shadow:0 25px 60px rgba(12,8,21,.35); }.quickCard>img{width:160px;border-radius:11px;box-shadow:0 12px 23px rgba(43,30,70,.23)}.quickCard p{font-size:9px;font-weight:900;letter-spacing:.1em;color:#8c809a;margin:8px 0}.quickCard h2{margin:0;font-size:25px;letter-spacing:-.05em}.quickCard span,.quickCard strong,.quickCard a{display:block;margin-top:9px;font-size:11px}.quickCard span{color:#857c90}.quickCard strong{color:#4c8762}.quickCard a{color:#694a9b;font-weight:900;text-decoration:none}.closeQuick{position:absolute;right:10px;top:8px;border:0;background:#eee8f4;border-radius:50%;width:27px;height:27px;font-size:20px;cursor:pointer;color:#4c4160}

        .right select {
          border: none;
          padding: 6px 12px;
          border-radius: 999px;
          background: #f3f3f3;
          cursor: pointer;
        }

        /* BURGER */
        .burger {
          display: none;
          background: none;
          border: none;
          font-size: 20px;
        }

        /* MOBILE */
        @media (max-width: 768px) {
          .center {
            display: none;
          }
          .globalSearch { margin-left:auto; width:min(210px,42vw); }

          .burger {
            display: block;
          }
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
        }

        .menu {
          position: absolute;
          right: 0;
          top: 0;
          width: 260px;
          height: 100%;

          background: white;
          padding: 20px;

          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .menu a {
          font-size: 16px;
        }
      `}</style>
    </>
  );
}
