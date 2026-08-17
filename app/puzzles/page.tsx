"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "app/components/AppHeader";

type Puzzle = { id: string; ch: number; t: string; img: string; n: number; c: number; portrait?: boolean };

const puzzles: Puzzle[] = [
  { id: "ascension-floodborn", ch: 2, t: "L’Ascension des Floodborn I", img: "/puzzles/ascension-floodborn-2x2.png", n: 4, c: 2 },
  { id: "ascension-floodborn-2", ch: 2, t: "L’Ascension des Floodborn II", img: "/puzzles/ascension-floodborn-2x2-b.png", n: 4, c: 2 },
  { id: "retour-ursula", ch: 4, t: "Le Retour d’Ursula", img: "/puzzles/retour-ursula-3x3.png", n: 9, c: 3, portrait: true },
  { id: "mer-azurite", ch: 6, t: "La Mer Azurite", img: "/puzzles/mer-azurite-3x3.png", n: 9, c: 3, portrait: true },
  { id: "archazia-1", ch: 7, t: "Archazia I", img: "/puzzles/archazia-1-3x3.png", n: 9, c: 3, portrait: true },
  { id: "archazia-2", ch: 7, t: "Archazia II", img: "/puzzles/archazia-2-3x3.png", n: 9, c: 3, portrait: true },
  { id: "jafar-1", ch: 8, t: "Jafar I", img: "/puzzles/jafar-1-3x3.png", n: 9, c: 3, portrait: true },
  { id: "jafar-2", ch: 8, t: "Jafar II", img: "/puzzles/jafar-2-3x3.png", n: 9, c: 3, portrait: true },
  { id: "fabuleux", ch: 9, t: "Fabuleux", img: "/puzzles/fabuleux-3x3.png", n: 9, c: 3, portrait: true },
  { id: "profondeurs-1", ch: 10, t: "Lueurs dans les Profondeurs I", img: "/puzzles/profondeurs-1-3x3.png", n: 9, c: 3, portrait: true },
  { id: "profondeurs-2", ch: 10, t: "Lueurs dans les Profondeurs II", img: "/puzzles/profondeurs-2-3x3.png", n: 9, c: 3, portrait: true },
  { id: "givresort", ch: 11, t: "Givresort I", img: "/puzzles/givresort-3x3.png", n: 9, c: 3 },
  { id: "givresort-2", ch: 11, t: "Givresort II", img: "/puzzles/givresort-2-3x3.png", n: 9, c: 3 },
  { id: "contrees-inconnues", ch: 12, t: "Contrées inconnues", img: "/puzzles/contrees-inconnues-3x3.png", n: 9, c: 3, portrait: true },
  { id: "invasion-epineuse", ch: 13, t: "Invasion Épineuse", img: "/puzzles/invasion-epineuse-3x3.png", n: 9, c: 3, portrait: true },
];

export default function PuzzlesPage() {
  const [userId, setUserId] = useState("adrien");
  const [chapter, setChapter] = useState(2);
  const [owned, setOwned] = useState<Record<string, number[]>>({});
  const chapters = useMemo(() => [...new Set(puzzles.map((puzzle) => puzzle.ch))], []);
  const current = puzzles.filter((puzzle) => puzzle.ch === chapter);
  const totalPieces = puzzles.reduce((sum, puzzle) => sum + puzzle.n, 0);
  const foundPieces = Object.values(owned).reduce((sum, pieces) => sum + pieces.length, 0);
  const totalPercent = Math.round((foundPieces / totalPieces) * 100);

  useEffect(() => setUserId(localStorage.getItem("activeUser") || "adrien"), []);
  useEffect(() => {
    Promise.all(puzzles.map(async (puzzle) => {
      const response = await fetch(`/api/puzzles/${puzzle.id}?userId=${userId}`);
      const data = await response.json();
      return [puzzle.id, (data.pieces || []).map((piece: { piece: number }) => piece.piece)] as const;
    })).then((entries) => setOwned(Object.fromEntries(entries)));
  }, [userId]);

  async function toggle(puzzle: Puzzle, piece: number) {
    const before = owned[puzzle.id] || [];
    const hasPiece = before.includes(piece);
    setOwned((previous) => ({ ...previous, [puzzle.id]: hasPiece ? before.filter((item) => item !== piece) : [...before, piece] }));
    try {
      const response = await fetch(`/api/puzzles/${puzzle.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, piece, owned: !hasPiece }),
      });
      if (!response.ok) throw new Error("save failed");
    } catch {
      setOwned((previous) => ({ ...previous, [puzzle.id]: before }));
    }
  }

  return <main><AppHeader />
    <div className="wrap">
      <section className="hero">
        <div><p>GALERIE DES PUZZLES</p><h1>Ton album de puzzles.</h1><span>Retrouve chaque illustration morceau par morceau.</span></div>
        <div className="global"><b>{totalPercent}%</b><span>progression globale</span><small>{foundPieces} / {totalPieces} morceaux</small></div>
      </section>

      <section className="tabs" aria-label="Choisir un chapitre">
        {chapters.map((chapterNumber) => {
          const chapterPuzzles = puzzles.filter((puzzle) => puzzle.ch === chapterNumber);
          const first = chapterPuzzles[0];
          const chapterFound = chapterPuzzles.reduce((sum, puzzle) => sum + (owned[puzzle.id] || []).length, 0);
          const chapterTotal = chapterPuzzles.reduce((sum, puzzle) => sum + puzzle.n, 0);
          return <button key={chapterNumber} onClick={() => setChapter(chapterNumber)} className={chapter === chapterNumber ? "active" : ""}>
            <i style={{ backgroundImage: `url(${first.img})` }} /><span><b>Chapitre {chapterNumber}</b><small>{chapterFound}/{chapterTotal} · {chapterPuzzles.length > 1 ? `${chapterPuzzles.length} puzzles` : "1 puzzle"}</small></span>
          </button>;
        })}
      </section>

      <section className={`puzzleList ${current.length > 1 ? "multiple" : ""}`}>
        {current.map((puzzle) => {
          const pieces = owned[puzzle.id] || [];
          const percent = Math.round((pieces.length / puzzle.n) * 100);
          return <article key={puzzle.id} className="puzzleCard">
            <header><div><p>CHAPITRE {puzzle.ch}</p><h2>{puzzle.t}</h2></div><strong>{percent}%<small>{pieces.length}/{puzzle.n}</small></strong></header>
            <div className={`grid ${puzzle.portrait ? "portrait" : "landscape"}`} style={{ gridTemplateColumns: `repeat(${puzzle.c}, 1fr)` }}>
              {Array.from({ length: puzzle.n }, (_, index) => index + 1).map((piece) => {
                const column = (piece - 1) % puzzle.c;
                const row = Math.floor((piece - 1) / puzzle.c);
                const found = pieces.includes(piece);
                return <button key={piece} onClick={() => toggle(puzzle, piece)} className={found ? "found" : ""} aria-label={`Morceau ${piece}: ${found ? "obtenu" : "manquant"}`} style={{
                  backgroundImage: `url(${puzzle.img})`, backgroundSize: `${puzzle.c * 100}% ${puzzle.c * 100}%`, backgroundPosition: `${column * (100 / (puzzle.c - 1))}% ${row * (100 / (puzzle.c - 1))}%`,
                }}><span>{piece}</span><b>{found ? "✓" : "◇"}</b></button>;
              })}
            </div>
            <footer>{puzzle.n - pieces.length === 0 ? "Puzzle terminé ✨" : `${puzzle.n - pieces.length} morceau${puzzle.n - pieces.length > 1 ? "x" : ""} à retrouver`}</footer>
          </article>;
        })}
      </section>
    </div>
    <style jsx>{`
      main{min-height:100vh;background:#f7f5fb;padding-bottom:72px}.wrap{width:min(1100px,calc(100% - 24px));margin:24px auto}.hero{display:flex;justify-content:space-between;gap:28px;align-items:center;padding:32px;border-radius:28px;background:linear-gradient(130deg,#243a68,#8bbdd3);color:#fff}.hero p,.puzzleCard header p{margin:0;font-size:10px;font-weight:900;letter-spacing:.15em}.hero h1{margin:8px 0;font-size:40px}.hero>div>span{font-size:14px;opacity:.85}.global{display:grid;min-width:160px;padding:16px 22px;border-radius:20px;background:#ffffff18;text-align:center;border:1px solid #ffffff25}.global b{font-size:34px}.global span{font-size:11px;font-weight:800}.global small{margin-top:4px;font-size:10px;opacity:.8}.tabs{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}.tabs button{display:flex;align-items:center;gap:9px;padding:6px 12px 6px 6px;border:1px solid #e0dae8;border-radius:15px;background:#fff;color:#51465e;cursor:pointer;text-align:left}.tabs button.active{border-color:#4f3a82;background:#f0ebfb;box-shadow:0 6px 14px #42306416}.tabs i{display:block;width:35px;height:42px;border-radius:10px;background-size:300% 300%;background-position:center;background-repeat:no-repeat;box-shadow:inset 0 0 0 1px #ffffff99}.tabs b,.tabs small{display:block}.tabs b{font-size:11px}.tabs small{margin-top:2px;font-size:9px;color:#877c93}.puzzleList{display:grid;grid-template-columns:minmax(0,680px);justify-content:center}.puzzleList.multiple{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}.puzzleCard{padding:20px;border-radius:25px;background:#fff;box-shadow:0 12px 32px #342a4a18}.puzzleCard header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}.puzzleCard header p{color:#887c99}.puzzleCard h2{margin:5px 0 0;font-size:23px;color:#302543}.puzzleCard strong{display:grid;min-width:62px;padding:7px 9px;border-radius:13px;background:#f0ecf8;color:#4c367d;text-align:center;font-size:19px}.puzzleCard strong small{font-size:10px;color:#877a97}.grid{display:grid;margin:auto;overflow:hidden;border-radius:16px;box-shadow:0 12px 26px #1e315440}.grid.landscape{width:min(100%,620px);aspect-ratio:1.39}.multiple .grid.landscape{width:100%;aspect-ratio:1.18}.grid.portrait{width:min(100%,350px);aspect-ratio:.72}.multiple .grid.portrait{width:min(100%,285px)}.grid button{position:relative;border:1px solid #fff;background-repeat:no-repeat;cursor:pointer}.grid button:after{content:'';position:absolute;inset:0;background:#172039a8;transition:background .18s}.grid button:hover:after{background:#17203965}.grid button.found:after{background:transparent}.grid span,.grid b{position:absolute;z-index:1;color:#fff;text-shadow:0 1px 3px #000}.grid span{left:8px;top:5px;font-size:11px}.grid b{right:8px;bottom:5px}.puzzleCard footer{margin-top:13px;text-align:center;font-size:12px;font-weight:800;color:#71667c}@media(max-width:760px){.hero{align-items:flex-start;flex-direction:column}.hero h1{font-size:31px}.global{width:100%;box-sizing:border-box}.tabs{flex-wrap:nowrap;overflow:auto;padding-bottom:4px}.tabs button{flex:none}.puzzleList.multiple{grid-template-columns:1fr}.multiple .grid.landscape{aspect-ratio:1.39}.multiple .grid.portrait{width:min(100%,350px)}}
    `}</style>
  </main>;
}
