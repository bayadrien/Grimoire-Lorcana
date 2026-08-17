"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "app/components/AppHeader";

const PUZZLE_ID = "givresort";
const PIECES = Array.from({ length: 9 }, (_, index) => index + 1);

export default function PuzzlesPage() {
  const [userId, setUserId] = useState<"adrien" | "angele">("adrien");
  const [owned, setOwned] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => setUserId((localStorage.getItem("activeUser") as "adrien" | "angele") || "adrien"), []);
  useEffect(() => {
    setLoading(true);
    fetch(`/api/puzzles/${PUZZLE_ID}?userId=${userId}`, { cache: "no-store" }).then((response) => response.json()).then((data) => setOwned((data.pieces || []).map((item: { piece: number }) => item.piece))).catch(() => setOwned([])).finally(() => setLoading(false));
  }, [userId]);

  const missing = useMemo(() => PIECES.filter((piece) => !owned.includes(piece)), [owned]);
  const progress = Math.round((owned.length / PIECES.length) * 100);

  async function togglePiece(piece: number) {
    if (saving) return;
    const hasPiece = owned.includes(piece);
    const before = owned;
    setOwned((current) => hasPiece ? current.filter((item) => item !== piece) : [...current, piece].sort((a, b) => a - b));
    setSaving(piece);
    try {
      const response = await fetch(`/api/puzzles/${PUZZLE_ID}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, piece, owned: !hasPiece }) });
      if (!response.ok) throw new Error("save failed");
    } catch { setOwned(before); alert("La pièce n’a pas pu être enregistrée."); }
    finally { setSaving(null); }
  }

  return <main className="puzzle-page"><AppHeader /><div className="puzzle-wrap">
    <section className="puzzle-hero"><div><p>GALERIE DES PUZZLES</p><h1>Recompose la<br /><em>magie de Lorcana.</em></h1><span>Chaque morceau trouvé révèle une partie du décor. Ton suivi est enregistré pour {userId === "adrien" ? "Adrien" : "Angèle"}.</span></div><div className="puzzle-counter"><b>{owned.length}<small>/9</small></b><span>morceaux trouvés</span><strong>{progress}%</strong></div></section>
    <section className="puzzle-card"><header><div><p>CHAPITRE 11 · GIVRESORT</p><h2>La course dans les glaces</h2><span>Marque une pièce lorsque tu l’obtiens dans un booster.</span></div><div className="progress-copy"><b>{progress}%</b><span>{missing.length ? `${missing.length} pièce${missing.length > 1 ? "s" : ""} manquante${missing.length > 1 ? "s" : ""}` : "Puzzle complété ✦"}</span></div></header><div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
      <div className="puzzle-layout"><div className={`puzzle-grid ${loading ? "loading" : ""}`} aria-label="Puzzle Givresort, 9 morceaux">{PIECES.map((piece) => { const hasPiece = owned.includes(piece); const column = (piece - 1) % 3; const row = Math.floor((piece - 1) / 3); return <button key={piece} className={hasPiece ? "found" : "missing"} onClick={() => togglePiece(piece)} disabled={saving === piece} style={{ backgroundImage: "url('/puzzles/givresort-3x3.png')", backgroundPosition: `${column * 50}% ${row * 50}%` }}><span>Pièce {piece}</span><b>{hasPiece ? "✓ Trouvée" : "◇ Manquante"}</b></button>; })}</div>
        <aside><p>MODE ALBUM</p><h3>{owned.length === 9 ? "Image complète !" : "À toi de jouer"}</h3><span>{owned.length === 9 ? "Les neuf fragments de Givresort sont réunis dans ton Grimoire." : "Clique sur chaque morceau au moment où tu le trouves. Tu peux aussi recliquer pour corriger une erreur."}</span><div className="piece-list">{PIECES.map((piece) => <span key={piece} className={owned.includes(piece) ? "found" : ""}>{owned.includes(piece) ? "✓" : piece}</span>)}</div></aside></div>
    </section>
    <section className="future"><span>✦</span><div><p>PROCHAINS PUZZLES</p><h2>Ta galerie grandira avec tes prochains chapitres</h2><small>Les puzzles des autres collections apparaîtront ici dès que leurs morceaux auront été ajoutés au Grimoire.</small></div></section>
  </div><style jsx>{`
    .puzzle-page{min-height:100vh;padding-bottom:70px;background:radial-gradient(circle at 8% 9%,#e7f7ff,transparent 27rem),radial-gradient(circle at 92% 22%,#ddd0f4,transparent 30rem),#f8f6fb;color:#302640}.puzzle-wrap{width:min(1120px,calc(100% - 32px));margin:24px auto}.puzzle-hero{display:flex;justify-content:space-between;align-items:center;gap:30px;min-height:260px;padding:38px 44px;border-radius:30px;color:#fff;background:linear-gradient(125deg,#1e335c,#527ba7 55%,#9ed9ec);box-shadow:0 22px 46px rgba(43,77,125,.24);overflow:hidden;position:relative}.puzzle-hero:after{content:'✦';position:absolute;right:25%;top:-105px;font:300px Georgia;color:rgba(255,255,255,.11)}.puzzle-hero p,.puzzle-card header p,.future p{margin:0;font-size:10px;font-weight:900;letter-spacing:.14em}.puzzle-hero p{color:#d8efff}.puzzle-hero h1{margin:13px 0;font-size:clamp(39px,5vw,59px);line-height:.93;letter-spacing:-.07em}.puzzle-hero h1 em{font-family:Georgia;font-weight:400;color:#ffe08b}.puzzle-hero>div>span{display:block;max-width:520px;color:#eaf5ff;font-size:13px;line-height:1.6}.puzzle-counter{position:relative;z-index:1;min-width:180px;padding:25px;border:1px solid rgba(255,255,255,.25);border-radius:22px;background:rgba(18,40,77,.22);backdrop-filter:blur(9px);text-align:center}.puzzle-counter b{display:block;font-size:46px;line-height:.9}.puzzle-counter b small{font-size:20px;opacity:.7}.puzzle-counter span{display:block;margin-top:9px;font-size:11px}.puzzle-counter strong{display:inline-block;margin-top:14px;padding:6px 10px;border-radius:99px;background:#ffe28b;color:#314b6d;font-size:12px}.puzzle-card{margin-top:18px;padding:28px;border:1px solid rgba(55,44,80,.11);border-radius:28px;background:rgba(255,255,255,.78);box-shadow:0 15px 38px rgba(43,35,67,.08)}.puzzle-card header{display:flex;justify-content:space-between;align-items:flex-end;gap:18px}.puzzle-card header p,.future p{color:#82778f}.puzzle-card h2{margin:6px 0;font-size:27px;letter-spacing:-.055em}.puzzle-card header span{font-size:12px;color:#81778d}.progress-copy{text-align:right}.progress-copy b{display:block;color:#38688e;font-size:25px}.progress-copy span{font-size:11px}.progress-track{height:9px;margin:20px 0 26px;border-radius:99px;background:#e7e7ee;overflow:hidden}.progress-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#59a7ca,#7562b8);transition:width .35s ease}.puzzle-layout{display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:28px;align-items:center}.puzzle-grid{display:grid;grid-template-columns:repeat(3,1fr);aspect-ratio:1.39;overflow:hidden;border:3px solid #fff;border-radius:18px;box-shadow:0 20px 38px rgba(37,62,103,.22);background:#daeefa}.puzzle-grid button{min-width:0;position:relative;border:1px solid rgba(40,44,70,.42);background-size:300% 300%;cursor:pointer;transition:filter .2s ease,transform .2s ease}.puzzle-grid button:before{content:'';position:absolute;inset:0;background:rgba(22,30,52,.53);transition:background .2s ease}.puzzle-grid button.found:before{background:transparent}.puzzle-grid button:hover{z-index:2;transform:scale(1.035);filter:brightness(1.07)}.puzzle-grid button span,.puzzle-grid button b{position:absolute;z-index:1;left:8px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.5)}.puzzle-grid button span{top:7px;font-size:9px;font-weight:900;opacity:.9}.puzzle-grid button b{bottom:7px;padding:4px 6px;border-radius:7px;background:rgba(22,24,43,.69);font-size:9px}.puzzle-grid button.found b{background:rgba(31,111,85,.83)}.puzzle-grid.loading{opacity:.6;pointer-events:none}.puzzle-layout aside{padding:20px;border-radius:20px;background:linear-gradient(145deg,#f1f8ff,#f2edf9)}.puzzle-layout aside p{margin:0;color:#827993;font-size:9px;font-weight:900;letter-spacing:.13em}.puzzle-layout aside h3{margin:8px 0;font-size:21px;letter-spacing:-.05em}.puzzle-layout aside>span{display:block;color:#716780;font-size:12px;line-height:1.55}.piece-list{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:20px}.piece-list span{display:grid;place-items:center;aspect-ratio:1;border-radius:9px;background:#e1dde7;color:#7e738b;font-size:11px;font-weight:900}.piece-list span.found{background:#ccebdc;color:#247251}.future{display:flex;gap:17px;align-items:center;margin-top:18px;padding:24px 28px;border:1px dashed #cfc4dc;border-radius:24px;color:#4b405b}.future>span{width:49px;height:49px;display:grid;place-items:center;border-radius:16px;background:#eee5fa;color:#7153a0;font-size:23px}.future h2{margin:5px 0;font-size:19px;letter-spacing:-.04em}.future small{color:#84798d;font-size:11px}@media(max-width:740px){.puzzle-wrap{width:min(100% - 20px,1120px);margin:14px auto}.puzzle-hero{align-items:flex-start;flex-direction:column;min-height:0;padding:30px 23px}.puzzle-hero h1{font-size:42px}.puzzle-counter{width:100%;box-sizing:border-box;text-align:left}.puzzle-card{padding:19px 13px;border-radius:21px}.puzzle-card header{align-items:flex-start;flex-direction:column}.progress-copy{text-align:left}.puzzle-layout{grid-template-columns:1fr;gap:17px}.puzzle-grid{border-radius:12px}.puzzle-grid button span{font-size:8px}.puzzle-grid button b{font-size:8px;padding:3px}.future{padding:19px}.future h2{font-size:17px}}
  `}</style></main>;
}
