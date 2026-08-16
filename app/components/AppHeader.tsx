"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type User = "adrien" | "angele";
type SearchCard = { id:string; name?:string|null; name_fr?:string|null; imageUrl?:string|null; setCode?:string|null; collection_number?:string|null; ink?:string|null; rarity?:string|null; quantity:number };
type Notification = { id:string; icon:string; title:string; text:string; href:string; createdAt:string };

export default function AppHeader() {
  const pathname = usePathname();

  const [activeUser, setActiveUser] = useState<User>("adrien");
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchCard[]>([]);
  const [preview, setPreview] = useState<SearchCard | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [noticeOpen, setNoticeOpen] = useState(false);

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

  useEffect(() => {
    fetch(`/api/notifications?userId=${activeUser}`, { cache: "no-store" }).then((response) => response.ok ? response.json() : { notifications: [] }).then((data) => setNotifications(data.notifications || [])).catch(() => setNotifications([]));
  }, [activeUser]);

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
      <header className="appNav">
        {/* LEFT */}
        <div className="appNavBrand">
          <div className="appNavLogo">✦</div>
          <div className="appNavBrandText">
            <div className="appNavTitle">Grimoire</div>
            <div className="appNavSubtitle">Lorcana</div>
          </div>
        </div>

        {/* CENTER */}
        <nav className="appNavLinks" aria-label="Navigation principale">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`appNavLink ${isActive ? "active" : ""}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="globalSearch">
          <span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une carte…" />
          {results.length > 0 && <div className="searchResults">{results.map((card) => <button key={card.id} onClick={() => { setPreview(card); setSearch(""); setResults([]); }}><img src={card.imageUrl || ""} alt=""/><span><b>{card.name_fr || card.name}</b><small>C{card.setCode || "—"} · #{card.collection_number || "—"} · {card.quantity ? `${card.quantity} possédée${card.quantity > 1 ? "s" : ""}` : "manquante"}</small></span></button>)}</div>}
        </div>

        {/* RIGHT */}
        <div className="appNavActions">
          <div className="notificationWrap">
            <button className="notificationButton" aria-label="Ouvrir les notifications" onClick={() => setNoticeOpen((open) => !open)}>♢{notifications.length > 0 && <i>{Math.min(notifications.length, 9)}</i>}</button>
            {noticeOpen && <div className="notificationPanel"><div><p>ACTUALITÉS DU GRIMOIRE</p><button onClick={() => setNoticeOpen(false)}>×</button></div>{notifications.length ? notifications.map((notice) => <Link href={notice.href} onClick={() => setNoticeOpen(false)} key={notice.id}><span>{notice.icon}</span><p><b>{notice.title}</b><small>{notice.text}</small></p></Link>) : <em>Tout est calme pour le moment ✦</em>}</div>}
          </div>
          <select
            value={activeUser}
            onChange={(e) =>
              changeUser(e.target.value as User)
            }
          >
            <option value="adrien">Adrien</option>
            <option value="angele">Angèle</option>
          </select>

          <button className="appNavBurger" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(true)}>
            ☰
          </button>
        </div>
      </header>

      <nav className="appMobileDock" aria-label="Raccourcis mobiles">
        <Link href="/" className={pathname === "/" ? "active" : ""}><span>✦</span>Accueil</Link>
        <Link href="/chapitres" className={pathname.startsWith("/chapitres") ? "active" : ""}><span>📚</span>Album</Link>
        <Link href="/opening" className="scan"><span>⌁</span>Scanner</Link>
        <Link href="/stats" className={pathname.startsWith("/stats") ? "active" : ""}><span>📊</span>Stats</Link>
        <button onClick={() => setMenuOpen(true)}><span>☰</span>Plus</button>
      </nav>

      {/* MOBILE */}
      {menuOpen && (
        <div className="appNavOverlay" onClick={() => setMenuOpen(false)}>
          <div className="appNavMenu" onClick={(e) => e.stopPropagation()}>
            <button className="appNavMenuClose" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)}>✕</button>

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
        .appNav{position:sticky;top:12px;z-index:1000;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:18px;width:min(1280px,calc(100% - 28px));min-height:68px;margin:12px auto 0;padding:8px 10px 8px 12px;border:1px solid rgba(255,255,255,.65);border-radius:22px;background:rgba(20,14,39,.82);box-shadow:0 16px 42px rgba(37,25,66,.22),inset 0 1px 0 rgba(255,255,255,.14);backdrop-filter:blur(18px);color:#fff}
        .appNavBrand{display:flex;align-items:center;gap:10px;padding:0 4px}.appNavLogo{width:40px;height:40px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(135deg,#ffe496,#e9a934);color:#3f2610;font-size:21px;box-shadow:0 8px 18px rgba(231,174,50,.3)}.appNavBrandText{line-height:1}.appNavTitle{font-family:Georgia,serif;font-weight:700;font-size:19px;letter-spacing:-.045em;color:#fff7db}.appNavSubtitle{margin-top:5px;font-size:9px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#c4b9df}
        .appNavLinks{display:flex;justify-content:center;gap:2px;min-width:0;padding:4px;border-radius:15px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.09)}.appNavLink{display:inline-flex;align-items:center;gap:6px;padding:9px 11px;border-radius:11px;color:#dfd8ec;text-decoration:none;white-space:nowrap;font-size:12px;font-weight:800;transition:background .18s ease,color .18s ease,transform .18s ease}.appNavLink:hover{color:#fff;background:rgba(255,255,255,.1);transform:translateY(-1px)}.appNavLink.active{color:#30213f;background:linear-gradient(135deg,#ffe384,#eeb449);box-shadow:0 6px 15px rgba(0,0,0,.2)}
        .globalSearch{position:relative;display:flex;align-items:center;gap:6px;width:205px;padding:0 11px;border:1px solid rgba(255,255,255,.16);border-radius:13px;background:rgba(255,255,255,.09);color:#e9dff7}.globalSearch input{width:100%;min-width:0;height:34px;border:0;outline:0;background:transparent;padding:0;color:#fff;font:inherit;font-size:11px}.globalSearch input::placeholder{color:#c7bbd6}.searchResults{position:absolute;top:45px;right:0;width:340px;max-height:430px;overflow:auto;border:1px solid rgba(88,62,127,.15);border-radius:16px;background:#fffcf8;padding:7px;box-shadow:0 20px 48px rgba(26,17,47,.28);z-index:1002}.searchResults button{width:100%;display:flex;align-items:center;gap:10px;padding:7px;border:0;border-radius:11px;background:transparent;text-align:left;cursor:pointer;color:#302641}.searchResults button:hover{background:#f3edf8}.searchResults img{width:31px;height:44px;object-fit:cover;border-radius:5px;background:#eee9f0}.searchResults b,.searchResults small{display:block}.searchResults b{font-size:11px}.searchResults small{margin-top:3px;font-size:9px;color:#847994}
        .appNavActions{display:flex;align-items:center;gap:8px}.appNavActions select{height:36px;border:1px solid rgba(255,255,255,.15);padding:0 25px 0 11px;border-radius:12px;background:rgba(255,255,255,.1);color:#fff;cursor:pointer;font:700 12px inherit}.appNavActions option{color:#302641}.appNavBurger{display:none;width:38px;height:36px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(255,255,255,.1);color:white;font-size:18px;cursor:pointer}.notificationWrap{position:relative}.notificationButton{position:relative;width:36px;height:36px;border:1px solid rgba(255,255,255,.15);border-radius:12px;background:rgba(255,255,255,.1);color:#fff;font-size:20px;cursor:pointer}.notificationButton i{position:absolute;right:-4px;top:-4px;min-width:15px;height:15px;padding:0 3px;display:grid;place-items:center;border:2px solid #2a1d46;border-radius:99px;background:#f4c959;color:#35223b;font-size:8px;font-style:normal;font-weight:900}.notificationPanel{position:absolute;right:0;top:45px;width:330px;padding:10px;border:1px solid rgba(96,72,135,.2);border-radius:17px;background:#fffdfb;color:#372c44;box-shadow:0 22px 50px rgba(18,10,38,.27)}.notificationPanel>div{display:flex;justify-content:space-between;align-items:center;padding:2px 4px 8px}.notificationPanel>div p{margin:0;color:#867a96;font-size:9px;font-weight:900;letter-spacing:.11em}.notificationPanel>div button{width:24px;height:24px;border:0;border-radius:8px;background:#f0ebf5;color:#554666;font-size:17px;cursor:pointer}.notificationPanel a{display:flex;gap:9px;padding:9px 6px;border-top:1px solid #eee9f0;color:inherit;text-decoration:none}.notificationPanel a:hover{background:#f7f3fa}.notificationPanel a>span{width:29px;height:29px;display:grid;place-items:center;border-radius:9px;background:#f0eafa;font-size:15px}.notificationPanel p{margin:0}.notificationPanel b,.notificationPanel small{display:block}.notificationPanel b{font-size:11px}.notificationPanel small{margin-top:3px;color:#8c8294;font-size:9px;line-height:1.3}.notificationPanel em{display:block;padding:18px 7px 8px;color:#8c8294;font-size:11px;font-style:normal}
        .appNavOverlay{position:fixed;inset:0;z-index:1200;background:rgba(15,8,28,.52);backdrop-filter:blur(5px)}.appNavMenu{position:absolute;right:12px;top:12px;width:min(320px,calc(100% - 24px));padding:18px;border:1px solid rgba(255,255,255,.25);border-radius:22px;background:linear-gradient(150deg,#302151,#1b132f);box-shadow:0 22px 60px rgba(14,8,26,.35);display:flex;flex-direction:column;gap:5px}.appNavMenu a{padding:12px;border-radius:12px;color:#f9f4ff;text-decoration:none;font-weight:800}.appNavMenu a:hover{background:rgba(255,255,255,.1)}.appNavMenuClose{align-self:flex-end;width:31px;height:31px;border:0;border-radius:10px;background:rgba(255,255,255,.12);color:#fff;font-size:18px;cursor:pointer}
        .quickOverlay{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;padding:18px;background:rgba(18,10,32,.62);backdrop-filter:blur(6px)}.quickCard{position:relative;display:grid;grid-template-columns:160px minmax(0,1fr);gap:19px;width:min(510px,100%);padding:18px;border:1px solid rgba(255,255,255,.7);border-radius:22px;background:linear-gradient(145deg,#fffdf9,#f1ebf8);box-shadow:0 25px 60px rgba(12,8,21,.35)}.quickCard>img{width:160px;border-radius:11px;box-shadow:0 12px 23px rgba(43,30,70,.23)}.quickCard p{font-size:9px;font-weight:900;letter-spacing:.1em;color:#8c809a;margin:8px 0}.quickCard h2{margin:0;font-size:25px;letter-spacing:-.05em}.quickCard span,.quickCard strong,.quickCard a{display:block;margin-top:9px;font-size:11px}.quickCard span{color:#857c90}.quickCard strong{color:#4c8762}.quickCard a{color:#694a9b;font-weight:900;text-decoration:none}.closeQuick{position:absolute;right:10px;top:8px;border:0;background:#eee8f4;border-radius:50%;width:27px;height:27px;font-size:20px;cursor:pointer;color:#4c4160}
        @media(max-width:1120px){.appNav{grid-template-columns:auto 1fr auto}.appNavLinks{display:none}.appNavBurger{display:grid;place-items:center}.globalSearch{justify-self:end;width:min(250px,40vw)}}
        @media(max-width:640px){.appNav{top:7px;width:calc(100% - 14px);min-height:58px;margin-top:7px;padding:7px 8px}.appNavLogo{width:35px;height:35px;border-radius:11px;font-size:18px}.appNavTitle{font-size:17px}.appNavSubtitle{display:none}.globalSearch{width:min(180px,40vw);border-radius:11px}.appNavActions select{display:none}.appNavBurger{width:35px;height:35px}.searchResults{position:fixed;top:72px;left:7px;right:7px;width:auto}.quickCard{grid-template-columns:112px minmax(0,1fr);gap:13px;padding:14px}.quickCard>img{width:112px}.quickCard h2{font-size:20px}}
        .appMobileDock{display:none}
        @media(max-width:640px){.appMobileDock{position:fixed;z-index:950;bottom:9px;left:9px;right:9px;display:grid;grid-template-columns:repeat(5,1fr);align-items:end;padding:5px;border:1px solid rgba(255,255,255,.18);border-radius:20px;background:rgba(28,19,50,.88);box-shadow:0 14px 34px rgba(25,15,43,.28);backdrop-filter:blur(16px)}.appMobileDock a,.appMobileDock button{min-width:0;display:grid;justify-items:center;gap:2px;padding:6px 2px;border:0;border-radius:14px;background:transparent;color:#d8d1e6;text-decoration:none;font-size:8px;font-weight:800;line-height:1.1}.appMobileDock span{font-size:16px}.appMobileDock .active{color:#fff;background:rgba(255,255,255,.12)}.appMobileDock .scan{margin-top:-22px;padding:9px 2px;border:3px solid #f1eafb;border-radius:17px;background:linear-gradient(135deg,#ffdc79,#d79d37);color:#372044;box-shadow:0 9px 17px rgba(0,0,0,.22)}.appMobileDock .scan span{font-size:22px;line-height:.7}.appMobileDock button{cursor:pointer}body{padding-bottom:70px}}
      `}</style>
    </>
  );
}
