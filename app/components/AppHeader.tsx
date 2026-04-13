"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  title: string;
  subtitle?: string;
  icon?: string;
};

export default function AppHeader({
  title,
  subtitle,
  icon = "📜",
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<"adrien" | "angele">("adrien");

  useEffect(() => {
    const u =
      (localStorage.getItem("activeUser") as "adrien" | "angele") || "adrien";
    setActiveUser(u);
  }, []);

  function changeUser(u: "adrien" | "angele") {
    setActiveUser(u);
    localStorage.setItem("activeUser", u);
    window.location.reload();
  }

  return (
    <>
      <header className="topbar boss">
        {/* ✨ TITRE */}
        <div className="brand">
          <div className="sigil">{icon}</div>
          <div className="titleBlock">
            <h1 className="magicTitle">{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>

        {/* 👤 USER */}
        <div className="userSwitch hide-mobile">
          <select
            value={activeUser}
            onChange={(e) => changeUser(e.target.value as "adrien" | "angele")}
          >
            <option value="adrien">Adrien</option>
            <option value="angele">Angèle</option>
          </select>
        </div>

        {/* 🖥️ NAV */}
        <nav className="nav-desktop hide-mobile">
          <Link href="/" className="nav-link">🎴 Cartes</Link>

          {/* 📚 CHAPITRES */}
          <div className="nav-item group">
            <span className="nav-link">📚 Chapitres</span>
            <div className="dropdown">
              {[...Array(11)].map((_, i) => (
                <Link
                  key={i}
                  href={`/chapitres/${i + 1}`}
                  className="dropdown-link"
                >
                  Chapitre {i + 1}
                </Link>
              ))}
            </div>
          </div>

          <Link href="/stats" className="nav-link">📊 Stats</Link>
          <Link href="/echange" className="nav-link">🤝 Échange</Link>

          {/* 💰 OPENING */}
          <div className="nav-item group">
            <span className="nav-link">💰 Opening</span>
            <div className="dropdown">
              <Link href="/opening" className="dropdown-item">
                🎁 Ouvrir un booster
              </Link>
              <Link href="/opening/history" className="dropdown-item">
                📜 Historique
              </Link>
            </div>
          </div>
        </nav>

        {/* 📱 BURGER */}
        <button
          className="burger show-mobile"
          onClick={() => setMenuOpen(true)}
        >
          ☰
        </button>
      </header>

      {/* 📱 MOBILE */}
      {menuOpen && (
        <div className="mobileOverlay" onClick={() => setMenuOpen(false)}>
          <div
            className="mobileMenu boss"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close" onClick={() => setMenuOpen(false)}>
              ✕
            </button>

            <div className="mobileUserSwitch">
              <label>Collection</label>
              <select
                value={activeUser}
                onChange={(e) =>
                  changeUser(e.target.value as "adrien" | "angele")
                }
              >
                <option value="adrien">Adrien</option>
                <option value="angele">Angèle</option>
              </select>
            </div>

            <hr />

            <Link href="/" onClick={() => setMenuOpen(false)}>
              🎴 Cartes
            </Link>

            {[...Array(11)].map((_, i) => (
              <Link
                key={i}
                href={`/chapitres/${i + 1}`}
                onClick={() => setMenuOpen(false)}
              >
                📚 Chapitre {i + 1}
              </Link>
            ))}

            <Link href="/stats" onClick={() => setMenuOpen(false)}>
              📊 Stats
            </Link>
            <Link href="/echange" onClick={() => setMenuOpen(false)}>
              🤝 Échange
            </Link>

            <Link href="/opening" onClick={() => setMenuOpen(false)}>
              💰 Ouvrir
            </Link>
            <Link href="/opening/history" onClick={() => setMenuOpen(false)}>
              📜 Historique
            </Link>
          </div>
        </div>
      )}

      {/* 🎨 STYLE DIRECT */}
      <style jsx global>{`
        .magicTitle {
          font-size: 1.6rem;
          font-weight: 600;
          background: linear-gradient(90deg, #ffd700, #fff2b0, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
        }

        .nav-item {
          position: relative;
          cursor: pointer;
        }

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 180px;
  padding: 6px;
  margin-top: 0;
  border-radius: 10px;
  background: white;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);

  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;

  transition: all 0.15s ease;
  z-index: 999;
}

.group:hover .dropdown {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

/* ⚠️ RESET TOTAL DU STYLE DES ITEMS */
.dropdown a {
  all: unset; /* 💥 ça enlève TOUS les styles hérités */

  display: block;
  width: 100%;
  padding: 8px 12px;

  font-size: 14px;
  cursor: pointer;
  border-radius: 6px;
}

/* hover clean */
.dropdown a:hover {
  background: rgba(0, 0, 0, 0.05);
}

/* RESET TOTAL ULTRA FORCÉ */
.dropdown .dropdown-link {
  all: unset !important;

  display: block !important;
  width: 100% !important;

  padding: 8px 12px !important;
  border-radius: 6px !important;

  font-size: 14px !important;
  cursor: pointer !important;
}

/* hover clean */
.dropdown .dropdown-link:hover {
  background: rgba(0, 0, 0, 0.05) !important;
}

.nav-link {
  padding: 8px 14px;
  border-radius: 999px;
  transition: all 0.2s ease;
  display: inline-block;
}

/* effet hover */
.nav-link:hover {
  background: rgba(0, 0, 0, 0.06);
}

/* effet actif (optionnel mais 🔥) */
.nav-link.active {
  background: linear-gradient(90deg, #ffd700, #ffb800);
  color: black;
}

      `}</style>
    </>
  );
}