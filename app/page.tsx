"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CHAPTERS_NAMES_FR } from "@/lib/chapters-fr";
import AppHeader from "app/components/AppHeader";

type User = "adrien" | "angele";
type Card = { id:string; setCode?:string|null; setName?:string|null; name?:string|null; name_fr?:string|null; imageUrl?:string|null; usd?:number|null; usd_foil?:number|null };
type CollectionRow = { cardId:string; quantity:number; variant?:string };
type OpeningCard = { card?:Card; foil?:boolean };
type Opening = { id:string; userId:string; chapter:number|string; createdAt:string; boosterImage?:string|null; cards?:OpeningCard[] };

const euro = (value?:number|null) => (value || 0) * .92;
const money = (value:number) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:value > 100 ? 0 : 2}).format(value);
const percent = (value:number,total:number) => total ? Math.round(value * 100 / total) : 0;
const cardName = (card?:Card) => card?.name_fr || card?.name || "Carte Lorcana";

export default function Home() {
  const [user,setUser] = useState<User>("adrien");
  const [cards,setCards] = useState<Card[]>([]);
  const [collection,setCollection] = useState<CollectionRow[]>([]);
  const [openings,setOpenings] = useState<Opening[]>([]);
  const [loading,setLoading] = useState(true);

  useEffect(() => {
    const selected = localStorage.getItem("activeUser") === "angele" ? "angele" : "adrien";
    setUser(selected);
    fetch("/api/prices/snapshot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selected }) }).catch(() => undefined);
    Promise.all([
      fetch("/api/cards",{cache:"no-store"}).then(r=>r.json()),
      fetch("/api/collection?userId="+selected,{cache:"no-store"}).then(r=>r.json()),
      fetch("/api/booster/history",{cache:"no-store"}).then(r=>r.json()),
    ]).then(([allCards,rows,history]) => {
      setCards(Array.isArray(allCards) ? allCards : []);
      setCollection(Array.isArray(rows) ? rows : []);
      setOpenings(Array.isArray(history) ? history : []);
    }).finally(()=>setLoading(false));
  },[]);

  const dashboard = useMemo(() => {
    const quantities:Record<string,{normal:number;foil:number}> = {};
    collection.forEach(row => {
      const item=quantities[row.cardId] || {normal:0,foil:0};
      if(row.variant === "foil") item.foil += row.quantity; else item.normal += row.quantity;
      quantities[row.cardId]=item;
    });
    let owned=0,copies=0,value=0,doubles=0;
    const chapters=new Map<string,{code:string;name:string;total:number;owned:number;value:number}>();
    const valuable:Array<{card:Card;value:number}>=[];
    cards.forEach(card => {
      const q=quantities[card.id] || {normal:0,foil:0}, count=q.normal+q.foil;
      const itemValue=q.normal*euro(card.usd)+q.foil*euro(card.usd_foil);
      const code=card.setCode && /^\d+$/.test(card.setCode) ? card.setCode : "0";
      if(!chapters.has(code)) chapters.set(code,{code,name:CHAPTERS_NAMES_FR[code] || card.setName || "Autres cartes",total:0,owned:0,value:0});
      const chapter=chapters.get(code)!;chapter.total++;
      if(count){owned++;copies+=count;doubles+=Math.max(0,count-1);value+=itemValue;chapter.owned++;chapter.value+=itemValue;valuable.push({card,value:itemValue});}
    });
    const chapterRows=[...chapters.values()].filter(x=>x.code!=="0").map(x=>({...x,progress:percent(x.owned,x.total),missing:x.total-x.owned})).sort((a,b)=>a.missing-b.missing || b.progress-a.progress);
    const next=chapterRows.find(x=>x.owned>0 && x.progress<100);
    const recent=openings.filter(x=>x.userId===user).slice(0,3);
    const latest=recent[0];
    const lastValue=(latest?.cards || []).reduce((sum,item)=>sum+euro(item.foil ? item.card?.usd_foil : item.card?.usd),0);
    return {owned,copies,value,doubles,total:cards.length,progress:percent(owned,cards.length),missing:cards.length-owned,next,recent,latest,lastValue,top:valuable.sort((a,b)=>b.value-a.value).slice(0,3)};
  },[cards,collection,openings,user]);

  const userName=user==="adrien"?"Adrien":"Angèle";
  const monthSummary = useMemo(() => {
    const now = new Date();
    const monthOpenings = openings.filter((opening) => opening.userId === user && new Date(opening.createdAt).getMonth() === now.getMonth() && new Date(opening.createdAt).getFullYear() === now.getFullYear());
    const newCards = new Set(monthOpenings.flatMap((opening) => (opening.cards || []).map((item) => item.card?.id).filter(Boolean))).size;
    const foil = monthOpenings.reduce((sum, opening) => sum + (opening.cards || []).filter((item) => item.foil).length, 0);
    const value = monthOpenings.reduce((sum, opening) => sum + (opening.cards || []).reduce((total, item) => total + euro(item.foil ? item.card?.usd_foil : item.card?.usd), 0), 0);
    return { boosters: monthOpenings.length, newCards, foil, value };
  }, [openings, user]);
  return <main className="home-page"><AppHeader/><div className="home-wrap">
    <section className="hero">
      <div className="hero-glow one"/><div className="hero-glow two"/>
      <div className="hero-content"><p className="eyebrow">✦ LE GRIMOIRE D{user==="adrien"?"’":"’"}{userName.toUpperCase()}</p><h1>Prêt pour une nouvelle<br/><em>aventure enchantée ?</em></h1><p className="hero-copy">Retrouve ta collection, ouvre un booster et avance vers le prochain chapitre de ton histoire Lorcana.</p><div className="hero-actions"><Link href="/opening" className="primary">🎁 Ouvrir un booster <span>→</span></Link><Link href="/chapitres" className="secondary">📚 Explorer les chapitres</Link></div></div>
      <div className="hero-progress"><div className="magic-ring"><div><strong>{dashboard.progress}%</strong><span>collection</span></div></div><p><b>{dashboard.owned}</b> cartes réunies<br/><span>sur {dashboard.total} dans le Grimoire</span></p></div>
      <div className="stars">✦　✧　✦　✧</div>
    </section>
    <section className="quick"><Link href="/opening"><span>📷</span><div><b>Scanner une carte</b><small>Ajoute-la à ton booster</small></div><i>→</i></Link><Link href="/chapitres"><span>📖</span><div><b>Ma collection</b><small>{dashboard.missing} cartes à trouver</small></div><i>→</i></Link><Link href="/echange"><span>🤝</span><div><b>Mes échanges</b><small>{dashboard.doubles} doublons disponibles</small></div><i>→</i></Link><Link href="/deck"><span>🃏</span><div><b>Mes decks</b><small>Prépare ton prochain deck</small></div><i>→</i></Link></section>
    <section className="main-grid">
      <article className="quest"><p className="eyebrow">QUÊTE DU MOMENT</p>{dashboard.next ? <><div className="quest-top"><div><h2>Terminer le chapitre {dashboard.next.code}</h2><p>{dashboard.next.name}</p></div><strong>{dashboard.next.progress}%</strong></div><div className="progress"><i style={{width:dashboard.next.progress+"%"}}/></div><div className="quest-bottom"><span><b>{dashboard.next.owned}</b> / {dashboard.next.total} cartes</span><span>Plus que <b>{dashboard.next.missing}</b> à trouver ✦</span></div><Link href={"/chapitres/"+dashboard.next.code}>Continuer cette quête <b>→</b></Link></> : <><h2>Commence ton aventure</h2><p>Ajoute tes premières cartes pour suivre ta progression.</p><Link href="/opening">Ouvrir un booster <b>→</b></Link></>}</article>
      <article className="collection-summary"><p className="eyebrow">TON TRÉSOR</p><div><span>💰</span><p>Valeur estimée</p><strong>{money(dashboard.value)}</strong></div><div className="treasure-meta"><span>{dashboard.copies} exemplaires</span><span>{dashboard.doubles} doublons</span></div><Link href="/stats">Voir toutes mes statistiques →</Link></article>
    </section>
    <section className="sections">
      <div className="section-title"><div><p className="eyebrow">DERNIÈRES OUVERTURES</p><h2>Les derniers boosters</h2></div><Link href="/opening/history">Voir l’historique →</Link></div>
      {dashboard.recent.length ? <div className="opening-grid">{dashboard.recent.map(opening => {const picks=(opening.cards || []).slice(0,4);const openingValue=(opening.cards || []).reduce((sum,item)=>sum+euro(item.foil ? item.card?.usd_foil : item.card?.usd),0);return <Link href={"/opening/result?id="+opening.id} key={opening.id} className="opening"><div className="opening-art">{opening.boosterImage?<img src={opening.boosterImage} alt="Booster Lorcana"/>:<span>🎁</span>}<b>Chapitre {opening.chapter}</b></div><div><p>{new Date(opening.createdAt).toLocaleDateString("fr-FR",{day:"numeric",month:"long"})}</p><strong>{money(openingValue)}</strong><small>{(opening.cards || []).length} cartes trouvées</small><div className="miniatures">{picks.map((pick,i)=>pick.card?.imageUrl?<img key={pick.card.id || i} src={pick.card.imageUrl} alt={cardName(pick.card)}/>:null)}</div></div></Link>})}</div> : <div className="empty-state"><span>🎁</span><h3>Ton histoire commence ici</h3><p>Ouvre un premier booster pour retrouver ses cartes ici.</p><Link href="/opening">Ouvrir un booster</Link></div>}
    </section>
    <section className="sections gems"><div className="section-title"><div><p className="eyebrow">DANS TON GRIMOIRE</p><h2>Les cartes les plus précieuses</h2></div><Link href="/stats">Voir les statistiques →</Link></div><div className="gems-grid">{dashboard.top.length?dashboard.top.map((item,index)=><article key={item.card.id}><span>0{index+1}</span>{item.card.imageUrl?<img src={item.card.imageUrl} alt={cardName(item.card)}/>:<i>🎴</i>}<div><b>{cardName(item.card)}</b><small>Valeur estimée</small></div><strong>{money(item.value)}</strong></article>):<p className="empty">Ajoute des cartes pour découvrir tes pépites.</p>}</div></section>
    <section className="monthly"><div><p className="eyebrow">BILAN DU MOIS</p><h2>Ton aventure en {new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(new Date())}</h2><p>Une vue rapide sur les nouveaux souvenirs ajoutés à ton Grimoire.</p></div><div className="monthly-stats"><span><b>{monthSummary.boosters}</b> boosters ouverts</span><span><b>{monthSummary.newCards}</b> cartes découvertes</span><span><b>{monthSummary.foil}</b> foils trouvées</span><span><b>{money(monthSummary.value)}</b> de valeur tirée</span></div></section>
    <p className="footer-note">✦ Chaque carte te rapproche un peu plus de la légende.</p>
  </div><style jsx>{styles}</style></main>;
}

const styles = [
".home-page{min-height:100vh;background:radial-gradient(circle at 5% 8%,#fff0c9 0,transparent 24rem),radial-gradient(circle at 96% 42%,#e8e2ff 0,transparent 27rem),#f8f5ef;color:#292439;padding-bottom:55px}.home-wrap{max-width:1180px;margin:auto;padding:28px 18px;display:grid;gap:20px}.hero{position:relative;isolation:isolate;overflow:hidden;min-height:360px;border-radius:32px;padding:43px 47px;background:linear-gradient(125deg,#211b43,#3d2a72 55%,#7156a9);color:#fff;box-shadow:0 23px 52px rgba(48,33,92,.26)}.hero:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,9,28,.26),transparent 75%);z-index:-1}.hero-content{max-width:680px}.eyebrow{margin:0;color:#8b8498;font-weight:800;letter-spacing:.14em;font-size:10px}.hero .eyebrow{color:#eadfff}.hero h1{font-size:clamp(34px,4.2vw,55px);line-height:1.01;letter-spacing:-.06em;margin:12px 0 14px}.hero h1 em{color:#ffd05b;font-family:Georgia,serif;font-weight:400}.hero-copy{max-width:570px;color:#e1daf7;line-height:1.6;font-size:15px;margin:0 0 24px}.hero-actions{display:flex;gap:10px;flex-wrap:wrap}.hero a{font-size:13px;font-weight:800;text-decoration:none}.primary,.secondary{display:inline-flex;align-items:center;gap:10px;padding:12px 15px;border-radius:13px;transition:transform .2s}.primary{background:#ffd05b;color:#423012;box-shadow:0 8px 18px rgba(0,0,0,.14)}.primary span{font-size:18px}.secondary{border:1px solid rgba(255,255,255,.27);color:#fff;background:rgba(255,255,255,.08)}.primary:hover,.secondary:hover{transform:translateY(-2px)}.hero-progress{position:absolute;right:55px;bottom:42px;display:flex;align-items:center;gap:15px;z-index:1}.magic-ring{width:133px;height:133px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#ffd15d 0deg,#ffd15d 240deg,rgba(255,255,255,.13) 240deg);box-shadow:0 0 0 8px rgba(255,255,255,.05)}.magic-ring>div{width:109px;height:109px;border-radius:50%;background:#3b2c6f;display:grid;place-content:center;text-align:center}.magic-ring strong{font-size:27px;letter-spacing:-.05em}.magic-ring span{font-size:10px;color:#d8d0ed}.hero-progress>p{line-height:1.45;font-size:13px;margin:0;color:#fff}.hero-progress b{font-size:19px}.hero-progress p span{color:#d1c8e8;font-size:11px}.stars{position:absolute;right:75px;top:42px;color:#ffe4a0;font-size:20px;letter-spacing:8px;opacity:.82}.hero-glow{position:absolute;border-radius:50%;filter:blur(4px);z-index:-1}.hero-glow.one{height:390px;width:390px;right:-100px;bottom:-190px;background:radial-gradient(circle,rgba(234,193,115,.41),transparent 69%)}.hero-glow.two{height:190px;width:190px;left:35%;top:-100px;background:radial-gradient(circle,rgba(185,151,255,.23),transparent 69%)}.quick{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.quick a{background:rgba(255,255,255,.84);border:1px solid #ece7ef;border-radius:17px;padding:14px;display:flex;gap:10px;align-items:center;text-decoration:none;color:#312b40;box-shadow:0 7px 19px rgba(47,37,77,.055);transition:transform .2s,box-shadow .2s}.quick a:hover{transform:translateY(-3px);box-shadow:0 12px 25px rgba(47,37,77,.12)}.quick>a>span{width:35px;height:35px;border-radius:11px;display:grid;place-items:center;background:#f5eecd;font-size:18px}.quick div{min-width:0;display:grid;gap:2px}.quick b{font-size:12px}.quick small{font-size:10px;color:#8c8594;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.quick i{font-style:normal;color:#8a809b;margin-left:auto}.main-grid{display:grid;grid-template-columns:1.5fr .85fr;gap:20px}.quest,.collection-summary,.sections{background:rgba(255,255,255,.87);border:1px solid #ebe6ef;box-shadow:0 8px 25px rgba(50,39,82,.055);border-radius:23px}.quest{padding:27px 28px;background:linear-gradient(115deg,#fffdf8,#fff7e3);border-color:#f0dfb6}.quest-top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-top:8px}.quest h2,.section-title h2{font-size:23px;letter-spacing:-.045em;margin:0}.quest-top p{color:#827885;font-size:13px;margin:4px 0 0}.quest-top strong{color:#9a6a13;font-size:26px}.progress{height:8px;border-radius:99px;background:#eadfcb;overflow:hidden;margin:20px 0 11px}.progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#f2b83c,#d99416)}.quest-bottom{display:flex;justify-content:space-between;color:#7f7382;font-size:12px;margin-bottom:22px}.quest-bottom b{color:#423927}.quest>a,.collection-summary>a{font-size:12px;font-weight:800;text-decoration:none;color:#5c468f}.quest>a b{font-size:16px}.collection-summary{padding:27px 26px;background:linear-gradient(145deg,#f0edff,#f9f8ff)}.collection-summary>div:nth-child(2){margin-top:14px}.collection-summary>div:nth-child(2)>span{font-size:23px}.collection-summary>div:nth-child(2)>p{font-size:12px;color:#7f778f;margin:7px 0 1px}.collection-summary>div:nth-child(2)>strong{font-size:31px;letter-spacing:-.05em}.treasure-meta{display:flex;gap:7px;margin:13px 0 18px}.treasure-meta span{font-size:10px;background:rgba(255,255,255,.74);border:1px solid #e4dff3;border-radius:99px;padding:5px 7px;color:#6b627d}.collection-summary>a{display:block}.sections{padding:25px}.section-title{display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:15px}.section-title a{font-size:12px;font-weight:750;text-decoration:none;color:#635188;white-space:nowrap}.opening-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.opening{display:grid;grid-template-columns:88px 1fr;gap:12px;min-width:0;padding:10px;border:1px solid #eeeaf0;border-radius:16px;text-decoration:none;color:#302a3c;transition:transform .2s,box-shadow .2s}.opening:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(51,39,83,.12)}.opening-art{position:relative;height:112px;border-radius:11px;overflow:hidden;background:#393060;display:grid;place-items:center}.opening-art img{height:100%;width:100%;object-fit:cover}.opening-art>span{font-size:31px}.opening-art b{position:absolute;bottom:4px;left:4px;right:4px;color:#fff;font-size:9px;text-align:center;background:rgba(20,14,47,.65);border-radius:5px;padding:4px}.opening>div:last-child{min-width:0;display:flex;flex-direction:column}.opening>div:last-child>p{font-size:10px;color:#8d8695;margin:5px 0}.opening>div:last-child>strong{font-size:15px}.opening>div:last-child>small{font-size:10px;color:#8d8695;margin-top:2px}.miniatures{display:flex;margin-top:auto;padding-bottom:3px}.miniatures img{width:26px;height:36px;object-fit:cover;border-radius:4px;border:1px solid #fff;margin-right:-8px}.gems-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.gems-grid article{display:grid;grid-template-columns:20px 40px minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px;border-radius:13px;background:#faf9fc}.gems-grid article>span{font-size:10px;color:#aaa3b4;font-weight:800}.gems-grid img,.gems-grid i{width:40px;height:56px;object-fit:cover;border-radius:5px;background:#eeeaf6;display:grid;place-items:center}.gems-grid article div{min-width:0}.gems-grid b{font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gems-grid small{font-size:10px;color:#8f8897}.gems-grid strong{font-size:12px;white-space:nowrap}.empty-state{text-align:center;padding:25px}.empty-state span{font-size:34px}.empty-state h3{margin:6px 0;font-size:18px}.empty-state p,.empty{color:#8e8695;font-size:12px}.empty-state a{display:inline-block;background:#f4c655;color:#49330b;padding:9px 12px;border-radius:10px;text-decoration:none;font-weight:800;font-size:12px}.footer-note{text-align:center;color:#9a93a1;font-family:Georgia,serif;font-style:italic;font-size:13px;margin:2px 0}.load{}",
"@media(max-width:850px){.hero{padding:34px 31px 170px}.hero-progress{left:31px;bottom:26px;right:auto}.stars{right:30px}.quick{grid-template-columns:repeat(2,1fr)}.opening-grid{grid-template-columns:1fr}.opening{grid-template-columns:90px 1fr}.opening-art{height:100px}}@media(max-width:560px){.home-wrap{padding:15px 12px;gap:13px}.hero{border-radius:23px;padding:30px 21px 160px;min-height:410px}.hero h1{font-size:37px}.hero-copy{font-size:13px}.hero-actions{display:grid}.hero-actions a{justify-content:center}.hero-progress{left:20px;bottom:19px;gap:11px}.magic-ring{width:110px;height:110px}.magic-ring>div{width:89px;height:89px}.magic-ring strong{font-size:23px}.stars{top:25px;right:16px;font-size:14px}.quick{gap:8px}.quick a{padding:11px;gap:7px}.quick>a>span{width:30px;height:30px;font-size:16px}.quick b{font-size:11px}.quick small{font-size:9px}.main-grid{grid-template-columns:1fr;gap:13px}.quest,.collection-summary,.sections{border-radius:19px}.quest,.collection-summary,.sections{padding:19px}.quest h2,.section-title h2{font-size:19px}.quest-bottom{font-size:10px}.opening-grid,.gems-grid{grid-template-columns:1fr}.opening{grid-template-columns:78px 1fr}.opening-art{height:96px}.gems-grid article{grid-template-columns:20px 40px minmax(0,1fr) auto}.section-title{align-items:flex-start}.section-title a{font-size:10px;padding-top:6px}}",
".monthly{display:flex;justify-content:space-between;gap:24px;align-items:center;padding:23px 26px;border:1px solid #e7deda;border-radius:22px;background:linear-gradient(115deg,#fff9e9,#f1ebff);box-shadow:0 8px 21px rgba(47,35,74,.05)}.monthly h2{margin:6px 0;font-size:22px;letter-spacing:-.04em}.monthly p:not(.eyebrow){margin:0;color:#83798a;font-size:12px}.monthly-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;min-width:510px}.monthly-stats span{padding:10px;border-radius:10px;background:rgba(255,255,255,.7);font-size:10px;color:#81768a}.monthly-stats b{display:block;font-size:17px;color:#4f3a78;margin-bottom:3px}@media(max-width:780px){.monthly{align-items:flex-start;flex-direction:column}.monthly-stats{width:100%;min-width:0}}@media(max-width:560px){.monthly{padding:18px}.monthly-stats{grid-template-columns:repeat(2,1fr)}}"
].join("");
