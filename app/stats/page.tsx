"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { CHAPTERS_NAMES_FR } from "@/lib/chapters-fr";
import { tInk, tRarity } from "@/lib/lorcana-fr";
import AppHeader from "app/components/AppHeader";

type User = "adrien" | "angele";
type Card = { id:string; setCode?:string|null; setName?:string|null; ink?:string|null; rarity?:string|null; usd?:number|null; usd_foil?:number|null; name_fr?:string|null; name?:string|null; imageUrl?:string|null };
type Row = { cardId:string; quantity:number; variant?:string };
type Qty = { normal:number; foil:number };
type Collection = Record<string, Qty>;

const price = (v?:number|null) => (v || 0) * .92;
const amount = (v:number) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:v >= 100 ? 0 : 2}).format(v);
const percentage = (v:number, max:number) => max ? Math.round(v * 100 / max) : 0;
const total = (q:Qty) => q.normal + q.foil;
const empty = ():Qty => ({normal:0,foil:0});
const nameOf = (c:Card) => c.name_fr || c.name || "Carte Lorcana";

function mapRows(rows:Row[]):Collection {
  return rows.reduce<Collection>((map,row) => {
    const q = map[row.cardId] || empty();
    if (row.variant === "foil") q.foil += row.quantity; else q.normal += row.quantity;
    map[row.cardId] = q; return map;
  },{});
}

function Stat({icon,label,value,note,accent=false}:{icon:string;label:string;value:string;note:string;accent?:boolean}) {
  return <article className={"stat " + (accent ? "accent" : "")}><span>{icon}</span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}

export default function StatsPage() {
  const [cards,setCards] = useState<Card[]>([]);
  const [adrien,setAdrien] = useState<Collection>({});
  const [angele,setAngele] = useState<Collection>({});
  const [active,setActive] = useState<User>("adrien");
  const [loading,setLoading] = useState(true);
  const [failed,setFailed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("activeUser") === "angele") setActive("angele");
    Promise.all([fetch("/api/cards",{cache:"no-store"}),fetch("/api/collection?userId=adrien",{cache:"no-store"}),fetch("/api/collection?userId=angele",{cache:"no-store"})])
      .then(async responses => {
        if (responses.some(r => !r.ok)) throw new Error("load");
        const values = await Promise.all(responses.map(r => r.json()));
        setCards(values[0] as Card[]); setAdrien(mapRows(values[1] as Row[])); setAngele(mapRows(values[2] as Row[]));
      }).catch(() => setFailed(true)).finally(() => setLoading(false));
  },[]);

  const stats = useMemo(() => {
    const mine = active === "adrien" ? adrien : angele, other = active === "adrien" ? angele : adrien;
    const user = active === "adrien" ? "Adrien" : "Angèle", partner = active === "adrien" ? "Angèle" : "Adrien";
    let owned=0,copies=0,foils=0,doubles=0,value=0,otherOwned=0,otherValue=0,shared=0;
    const chapterMap = new Map<string,{code:string;name:string;total:number;owned:number;value:number}>();
    const rarityMap = new Map<string,{name:string;owned:number;copies:number;value:number}>();
    const inks = new Map<string,number>();
    const valuables:Array<{card:Card;q:Qty;value:number}> = [];
    cards.forEach(card => {
      const q=mine[card.id] || empty(), oq=other[card.id] || empty(), has=total(q)>0, hasOther=total(oq)>0;
      const cardValue=q.normal*price(card.usd)+q.foil*price(card.usd_foil);
      const code=card.setCode && /^\d+$/.test(card.setCode) ? card.setCode : "0";
      if(!chapterMap.has(code)) chapterMap.set(code,{code,name:CHAPTERS_NAMES_FR[code] || card.setName || "Autres cartes",total:0,owned:0,value:0});
      const chapter=chapterMap.get(code)!; chapter.total++;
      if(has) {
        owned++; copies+=total(q); foils+=q.foil; doubles+=Math.max(0,total(q)-1); value+=cardValue; chapter.owned++; chapter.value+=cardValue;
        const rarity=tRarity(card.rarity), r=rarityMap.get(rarity) || {name:rarity,owned:0,copies:0,value:0}; r.owned++;r.copies+=total(q);r.value+=cardValue;rarityMap.set(rarity,r);
        if(card.ink) inks.set(tInk(card.ink),(inks.get(tInk(card.ink)) || 0)+1);
        valuables.push({card,q,value:cardValue});
      }
      if(hasOther) {otherOwned++;otherValue+=oq.normal*price(card.usd)+oq.foil*price(card.usd_foil);}
      if(has && hasOther) shared++;
    });
    const chapters=[...chapterMap.values()].filter(x=>x.code!=="0").sort((a,b)=>Number(a.code)-Number(b.code)).map(x=>({...x,progress:percentage(x.owned,x.total),missing:x.total-x.owned}));
    const best=[...chapters].filter(x=>x.owned>0).sort((a,b)=>b.progress-a.progress || b.owned-a.owned)[0];
    const next=[...chapters].filter(x=>x.owned>0 && x.progress<100).sort((a,b)=>a.missing-b.missing || b.progress-a.progress)[0];
    return {user,partner,total:cards.length,owned,copies,foils,doubles,value,missing:cards.length-owned,progress:percentage(owned,cards.length),otherProgress:percentage(otherOwned,cards.length),otherValue,shared,chapters,best,next,rarities:[...rarityMap.values()].sort((a,b)=>b.value-a.value),inks:[...inks.entries()].map(x=>({name:x[0],value:x[1]})).sort((a,b)=>b.value-a.value),top:valuables.sort((a,b)=>b.value-a.value).slice(0,5)};
  },[active,adrien,angele,cards]);

  if(loading || failed) return <><AppHeader/><main className="stats-page load"><div><span>{failed?"⚠️":"✦"}</span><h1>{failed?"Les statistiques sont indisponibles":"Préparation du tableau de bord"}</h1><p>{failed?"Rafraîchis la page dans un instant.":"Calcul des cartes, exemplaires et valeurs…"}</p></div><style jsx>{styles}</style></main></>;
  const pie=[{name:"Collection",value:stats.owned},{name:"Manquantes",value:stats.missing}];
  return <><AppHeader/><main className="stats-page"><div className="wrap">
    <section className="hero"><div className="copy"><p className="eyebrow">TABLEAU DE BORD · {stats.user.toUpperCase()}</p><h1>Ta collection,<br/><em>en un regard.</em></h1><p>{stats.owned} cartes différentes, {stats.copies} exemplaires et une valeur estimée à partir des prix enregistrés.</p><div className="value"><span>Valeur estimée</span><strong>{amount(stats.value)}</strong><small>Normal et foil inclus</small></div></div><div className="donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pie} dataKey="value" innerRadius="71%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none">{pie.map((x,i)=><Cell key={x.name} fill={i?"rgba(255,255,255,.13)":"#ffc94a"}/>)}</Pie></PieChart></ResponsiveContainer><div><strong>{stats.progress}%</strong><span>complété</span></div></div><div className="note">✦ Il reste <b>{stats.missing}</b> cartes à trouver</div></section>
    <section className="stats-grid"><Stat icon="🎴" label="Cartes distinctes" value={stats.owned.toLocaleString("fr-FR")} note={"sur "+stats.total.toLocaleString("fr-FR")}/><Stat icon="📦" label="Exemplaires" value={stats.copies.toLocaleString("fr-FR")} note={stats.doubles+" doublons à échanger"}/><Stat icon="✨" label="Versions foil" value={stats.foils.toLocaleString("fr-FR")} note="dans ta collection"/><Stat icon="🏆" label="Cartes manquantes" value={stats.missing.toLocaleString("fr-FR")} note={stats.progress+"% de progression"} accent/></section>
    <section className="grid-main"><article className="panel"><Header title="Chaque chapitre" label="PROGRESSION" badge={stats.chapters.length+" chapitres"}/><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.chapters.map(x=>({name:"C"+x.code,progress:x.progress}))} margin={{top:10,right:0,left:-28,bottom:0}}><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fill:"#8b8b96",fontSize:11,fontWeight:700}}/><Tooltip cursor={{fill:"rgba(255,201,74,.1)"}}/><Bar dataKey="progress" radius={[7,7,2,2]} fill="#5445a9" maxBarSize={24}/></BarChart></ResponsiveContainer></div><div className="chapters">{stats.chapters.map(x=><div className="chapter" key={x.code}><div><b>C{x.code}</b><span>{x.name}</span></div><i><em style={{width:x.progress+"%"}}/></i><strong>{x.progress}%</strong><small>{x.owned}/{x.total}</small></div>)}</div></article>
      <article className="panel"><Header title="Ta collection" label="RÉPARTITION" badge={amount(stats.value)} gold/><div className="rarities">{stats.rarities.length?stats.rarities.map(x=><div key={x.name}><p><b>{x.name}</b><span>{x.owned} cartes · {x.copies} ex.</span></p><strong>{amount(x.value)}</strong></div>):<p className="empty">Ajoute des cartes pour voir la répartition.</p>}</div><div className="inks"><p className="eyebrow">ENCRES COLLECTIONNÉES</p>{stats.inks.map(x=><span key={x.name}>{x.name}<b>{x.value}</b></span>)}</div></article></section>
    <section className="grid-bottom"><article className="panel"><Header title="Les pépites du grimoire" label="VALEUR" badge="Top 5"/>{stats.top.length? <div className="top">{stats.top.map((x,i)=><div key={x.card.id}><span>0{i+1}</span>{x.card.imageUrl?<img src={x.card.imageUrl} alt=""/>:<i>🎴</i>}<p><b>{nameOf(x.card)}</b><small>{tRarity(x.card.rarity)} · {total(x.q)} exemplaire{total(x.q)>1?"s":""}{x.q.foil?" · "+x.q.foil+" foil":""}</small></p><strong>{amount(x.value)}</strong></div>)}</div>:<p className="empty">Aucune carte dans cette collection.</p>}</article>
      <aside className="insights"><article><span>⚡</span><p>MEILLEURE PROGRESSION</p><h3>{stats.best?"Chapitre "+stats.best.code:"À démarrer"}</h3><small>{stats.best?stats.best.name+" · "+stats.best.progress+"%":"Ajoute ta première carte"}</small></article><article><span>🎯</span><p>OBJECTIF LE PLUS PROCHE</p><h3>{stats.next?stats.next.missing+" cartes":"Tout est complet !"}</h3><small>{stats.next?"pour terminer le chapitre "+stats.next.code:"Bravo !"}</small></article><article className="compare"><p>COMPARAISON AVEC {stats.partner.toUpperCase()}</p><div><span>{stats.user}<b>{stats.progress}%</b></span><i><em style={{width:stats.progress+"%"}}/></i><span>{stats.partner}<b>{stats.otherProgress}%</b></span><i><em style={{width:stats.otherProgress+"%"}}/></i></div><small>{stats.shared} cartes en commun · {amount(stats.otherValue)} chez {stats.partner}</small></article></aside></section>
    <p className="disclaimer">Valeur indicative basée sur les derniers prix disponibles dans le Grimoire. Les prix normal et foil sont comptés séparément.</p>
  </div></main><style jsx>{styles}</style></>;
}

function Header({title,label,badge,gold=false}:{title:string;label:string;badge:string;gold?:boolean}) { return <div className="panel-head"><div><p className="eyebrow">{label}</p><h2>{title}</h2></div><span className={gold?"gold":""}>{badge}</span></div>; }

const styles = [
".stats-page{min-height:calc(100vh - 64px);background:radial-gradient(circle at 15% 0%,#fff4d6 0,transparent 29rem),#f7f5f1;color:#252231;padding:38px 18px 62px}.wrap{max-width:1240px;margin:auto;display:grid;gap:18px}.hero{position:relative;overflow:hidden;min-height:310px;border-radius:30px;padding:36px 40px;background:linear-gradient(132deg,#272244,#433a77 52%,#6253a5);color:#fff;display:flex;align-items:center;box-shadow:0 20px 45px rgba(48,40,90,.22)}.hero:after{content:'';width:430px;height:430px;position:absolute;border:1px solid rgba(255,255,255,.12);border-radius:50%;right:-115px;top:-180px;box-shadow:0 0 0 60px rgba(255,255,255,.025),0 0 0 120px rgba(255,255,255,.02)}.copy{max-width:615px;position:relative;z-index:1}.eyebrow{margin:0;font-size:10px;letter-spacing:.15em;font-weight:800;color:#9590a5}.hero .eyebrow{color:#d6d1f3}h1,h2,h3,p{margin-top:0}.copy h1{font-size:clamp(35px,4vw,56px);line-height:.98;letter-spacing:-.055em;margin:10px 0 15px;font-weight:800}.copy h1 em{font-family:Georgia,serif;font-weight:400;color:#ffce5b}.copy>p:not(.eyebrow){color:#dedaf1;max-width:550px;line-height:1.55;font-size:15px;margin-bottom:22px}.value{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.value span{font-size:12px;font-weight:700;color:#d5d0eb}.value strong{font-size:31px;letter-spacing:-.04em}.value small{padding-left:10px;border-left:1px solid rgba(255,255,255,.3);color:#d5d0eb}.donut{position:absolute;right:90px;width:190px;height:190px;z-index:1}.donut>div:last-child{position:absolute;inset:0;display:grid;place-content:center;text-align:center;pointer-events:none}.donut strong{font-size:38px;letter-spacing:-.06em}.donut span{color:#d8d3ed;font-size:12px}.note{position:absolute;bottom:28px;right:34px;z-index:1;color:#dedaf1;font-size:13px}.note b{color:#fff}.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.stat,.panel{background:rgba(255,255,255,.9);border:1px solid #e9e6ed;box-shadow:0 8px 25px rgba(49,40,70,.055)}.stat{border-radius:20px;padding:18px 20px;position:relative}.stat>span{font-size:21px;position:absolute;right:17px;top:15px}.stat p{color:#777282;font-size:12px;font-weight:650;margin:0 0 7px}.stat strong{display:block;font-size:30px;letter-spacing:-.045em}.stat small{color:#9a96a2;font-size:11px}.stat.accent{background:#fff8e4;border-color:#f5de9c}.stat.accent strong{color:#9a6910}.grid-main{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(320px,.95fr);gap:18px}.panel{border-radius:22px;padding:24px}.panel-head{display:flex;justify-content:space-between;gap:14px}.panel-head h2{font-size:21px;letter-spacing:-.035em;margin:5px 0 0}.panel-head>span{color:#574e7f;background:#f0eef7;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:750}.panel-head>.gold{background:#fff1ca;color:#95680e}.chart{height:174px;margin:12px -8px 5px}.chapters{display:grid;gap:9px;max-height:312px;overflow:auto;padding-right:3px}.chapter{display:grid;grid-template-columns:minmax(140px,1fr) minmax(90px,1.5fr) 38px 52px;gap:10px;align-items:center;font-size:12px}.chapter>div{min-width:0;display:flex;align-items:center;gap:7px}.chapter>div b{color:#5a4a9c;font-size:11px;background:#f1eff8;padding:4px 5px;border-radius:6px}.chapter>div span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:650}.chapter>i,.compare i{height:6px;background:#ebe9f0;border-radius:99px;overflow:hidden}.chapter em,.compare em{display:block;height:100%;background:linear-gradient(90deg,#7161c4,#5445a9);border-radius:inherit}.chapter>strong{text-align:right;font-size:12px}.chapter>small{color:#928d9a;text-align:right}.rarities{display:grid;gap:2px;margin:17px 0 18px}.rarities>div{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #f0eef1}.rarities p{display:grid;gap:2px;margin:0}.rarities b{font-size:13px}.rarities p span,.rarities>div>strong{font-size:11px;color:#8d8895}.rarities>div>strong{color:#464050;align-self:center}.inks{border-top:1px solid #eeeaf0;padding-top:16px}.inks span{display:inline-block;font-size:11px;border:1px solid #e8e5ed;background:#faf9fc;border-radius:999px;padding:5px 8px;color:#706a78;margin:9px 5px 0 0}.inks b{margin-left:5px;color:#393442}.grid-bottom{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(310px,.8fr);gap:18px}.top{margin-top:15px;display:grid}.top>div{display:grid;grid-template-columns:25px 36px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #f0eef1}.top>div:last-child{border-bottom:0}.top>div>span{color:#b1acb8;font-size:11px;font-weight:800}.top img,.top i{width:36px;height:50px;border-radius:5px;object-fit:cover;background:#eeeaf6;display:grid;place-items:center}.top p{min-width:0;margin:0}.top p b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}.top p small{color:#908b98;font-size:11px;display:block;margin-top:2px}.top>div>strong{font-size:13px;white-space:nowrap}.insights{display:grid;gap:10px}.insights article{padding:16px 17px;border-radius:18px;background:#312a58;color:#fff;position:relative;overflow:hidden}.insights article>span{position:absolute;right:15px;top:12px;font-size:20px}.insights p{color:#c5bfdf;text-transform:uppercase;letter-spacing:.12em;font-size:9px;font-weight:800;margin-bottom:6px}.insights h3{margin:0 0 3px;font-size:18px;letter-spacing:-.035em}.insights small{color:#d4cfe7;font-size:11px}.insights article:nth-child(2){background:#f7e6b3;color:#604613}.insights article:nth-child(2) p,.insights article:nth-child(2) small{color:#8e6b24}.insights .compare{background:#fff;border:1px solid #e9e6ed;color:#393442}.insights .compare p{color:#777282}.compare>div{display:grid;grid-template-columns:47px 1fr 47px 1fr;gap:6px;align-items:center;margin-bottom:7px}.compare span{font-size:10px;color:#777282}.compare span b{display:block;color:#302b39;font-size:13px}.compare i{height:7px}.compare i:last-child em{background:#efbb37}.compare small{color:#938e9a}.empty{color:#938e9a;font-size:13px;padding:24px 0}.disclaimer{margin:0;color:#a09aa7;text-align:center;font-size:11px}.load{display:grid;place-items:center;text-align:center}.load>div{background:#fff;border-radius:24px;padding:35px;box-shadow:0 10px 35px rgba(38,30,62,.08)}.load span{font-size:34px}.load h1{margin:10px 0 5px;font-size:21px}.load p{margin:0;color:#777282}",
"@media(max-width:850px){.stats-page{padding:22px 13px 45px}.hero{padding:28px 25px 115px;min-height:350px}.donut{width:150px;height:150px;right:20px;bottom:19px}.note{left:25px;bottom:30px;right:auto}.stats-grid{grid-template-columns:repeat(2,1fr)}.grid-main,.grid-bottom{grid-template-columns:1fr}.chapter{grid-template-columns:minmax(120px,1fr) minmax(72px,1fr) 36px 45px}.chart{height:160px}}@media(max-width:480px){.stats-page{padding-top:15px}.hero{border-radius:23px;padding:25px 20px 130px}.copy h1{font-size:37px}.copy>p:not(.eyebrow){font-size:13px}.donut{width:136px;height:136px;right:12px;bottom:14px}.donut strong{font-size:29px}.note{left:20px;bottom:26px;font-size:11px;max-width:130px}.stat{padding:15px;border-radius:17px}.stat strong{font-size:25px}.panel{padding:19px 16px;border-radius:19px}.chapter{grid-template-columns:minmax(105px,1fr) minmax(52px,.8fr) 31px;gap:7px}.chapter>small{display:none}.chapter>div span{font-size:11px}.top>div{grid-template-columns:21px 32px minmax(0,1fr) auto;gap:8px}.top img,.top i{width:32px;height:45px}.top>div>strong{font-size:11px}.compare>div{grid-template-columns:42px 1fr 42px 1fr;gap:4px}}"
].join("");
