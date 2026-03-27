"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearch } from "@/app/components/SearchContext";

type Props = {
  title: string;
  subtitle?: string;
  icon?: string;
};

const INKS = [
  "amber",
  "amethyst",
  "emerald",
  "ruby",
  "sapphire",
  "steel",
];

export default function AppHeader({
  title,
  subtitle,
  icon = "📜",
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // 🔍 contexte global de recherche
  const { query, setQuery } = useSearch();

  // 🎯 filtre visuel chapitre
  const [activeChapter, setActiveChapter] = useState<number | null>(null);

  // 💡 suggestions live
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const [activeUser, setActiveUser] = useState<"adrien" | "angele">("adrien");

  useEffect(() => {
    const u =
      (localStorage.getItem("activeUser") as "adrien" | "angele") || "adrien";
    setActiveUser(u);
  }, []);


  /* ================= SUGGESTIONS LIVE ================= */
  useEffect(() => {
    const q = query.trim().toLowerCase();

    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const baseSuggestions = [
      "chapitre 1",
      "chapitre 2",
      "chapitre 3",
      "chapitre 4",
      "chapitre 5",
      "chapitre 6",
      "chapitre 7",
      "chapitre 8",
      "chapitre 9",
      "chapitre 10",
      "amber",
      "amethyst",
      "emerald",
      "ruby",
      "sapphire",
      "steel",
    ];

    const matches = baseSuggestions.filter((s) =>
      s.toLowerCase().includes(q)
    );

    setSuggestions(matches.slice(0, 6));
  }, [query]);

  function changeUser(u: "adrien" | "angele") {
    setActiveUser(u);
    localStorage.setItem("activeUser", u);
    window.location.reload();
  }

  /* ================= RECHERCHE INTELLIGENTE ================= */
  function submitSearch(value?: string) {
    const q = (value ?? query).trim().toLowerCase();
    if (!q) return;

    setSuggestions([]);
    setMenuOpen(false);

    // 📚 chapitre détecté
    const chapMatch =
      q.match(/chapitre\s*(\d+)/) ||
      q.match(/^ch\s*(\d+)/) ||
      q.match(/^(\d+)$/);

    if (chapMatch) {
      const chap = Number(chapMatch[1]);
      setActiveChapter(chap);
      router.push(`/chapitres/${chap}`);
      return;
    }

    // 🎨 encre
    if (INKS.includes(q)) {
      setActiveChapter(null);
      router.push(`/?ink=${q}`);
      return;
    }

    // 🃏 texte libre
    setActiveChapter(null);
    router.push(`/?q=${encodeURIComponent(q)}`);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submitSearch();
  }

  return (
    <>
      {/* ================= HEADER ================= */}
      <header className="topbar boss">
        <div className="brand">
          <div className="sigil">{icon}</div>
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>

        {/* 🔍 SEARCH DESKTOP */}
        <div className="searchBox hide-mobile">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="🔍 Carte, encre, chapitre…"
          />

          {suggestions.length > 0 && (
            <div className="suggestBox">
              {suggestions.map((s, i) => (
                <button
                  key={`${s}-${i}`}
                  onClick={() => {
                    setQuery(s);
                    submitSearch(s);
                  }}
                >
                  🔎 {s}
                </button>
              ))}
            </div>
          )}
        </div>

      <div className="userSwitch hide-mobile">
        <select
          value={activeUser}
          onChange={(e) => changeUser(e.target.value as "adrien" | "angele")}
        >
          <option value="adrien">Adrien</option>
          <option value="angele">Angèle</option>
        </select>
      </div>

        {/* 🖥️ MENU DESKTOP */}
        <nav className="nav-desktop hide-mobile">
          <Link href="/">🎴 Cartes</Link>
          <Link href="/chapitres">📚 Chapitres</Link>
          <Link href="/stats">📊 Stats</Link>
          <Link href="/echange">🤝 Échange</Link>
          <Link href="/opening">💲 Opening</Link>
        </nav>

        {/* 📱 BURGER */}
        <button
          className="burger show-mobile"
          onClick={() => setMenuOpen(true)}
          aria-label="Menu"
        >
          ☰
        </button>
      </header>

      {/* 🎯 BADGE FILTRE CHAPITRE */}
      {activeChapter && (
        <div className="activeFilter">
          🎯 Filtré par <b>Chapitre {activeChapter}</b>
          <button onClick={() => setActiveChapter(null)}>✕</button>
        </div>
      )}

      {/* ================= MOBILE MENU ================= */}
      {menuOpen && (
        <div className="mobileOverlay" onClick={() => setMenuOpen(false)}>
          <div
            className="mobileMenu boss"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close" onClick={() => setMenuOpen(false)}>
              ✕
            </button>

            <input
              className="pill"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="🔍 Carte, encre, chapitre…"
            />

            <div className="quickHints">
              <span>Ariel</span>
              <span>amber</span>
              <span>chapitre 3</span>
            </div>

            <div className="mobileUserSwitch">
              <label>Collection</label>
              <select
                value={activeUser}
                onChange={(e) => changeUser(e.target.value as "adrien" | "angele")}
              >
                <option value="adrien">Adrien</option>
                <option value="angele">Angèle</option>
              </select>
            </div>

            <hr />

            <Link href="/" onClick={() => setMenuOpen(false)}>
              🎴 Cartes
            </Link>
            <Link href="/chapitres" onClick={() => setMenuOpen(false)}>
              📚 Chapitres
            </Link>
            <Link href="/stats" onClick={() => setMenuOpen(false)}>
              📊 Stats
            </Link>
            <Link href="/echange" onClick={() => setMenuOpen(false)}>
              🤝 Échange
            </Link>
            <Link href="/opening" onClick={() => setMenuOpen(false)}>
              💲 Opening
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
