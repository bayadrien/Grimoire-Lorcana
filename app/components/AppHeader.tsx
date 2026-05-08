"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type User = "adrien" | "angele";

export default function AppHeader() {
  const pathname = usePathname();

  const [activeUser, setActiveUser] = useState<User>("adrien");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const u = (localStorage.getItem("activeUser") as User) || "adrien";
    setActiveUser(u);
  }, []);

  function changeUser(u: User) {
    setActiveUser(u);
    localStorage.setItem("activeUser", u);
    window.location.reload();
  }

  const navItems = [
    { href: "/", label: "Cartes", icon: "🎴" },
    { href: "/chapitres", label: "Chapitres", icon: "📚" },
    { href: "/stats", label: "Stats", icon: "📊" },
    { href: "/echange", label: "Échange", icon: "🤝" },
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