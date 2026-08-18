"use client";

import { useEffect, useRef, useState } from "react";
import AppHeader from "app/components/AppHeader";

type Status = "missing" | "deck" | "enough";
type ScanResult = {
  id: string; name: string | null; name_fr: string | null; collection_number: string | null; imageUrl: string | null; setCode: string | null; confidence: number;
  price: { normal: number; foil: number };
  mine: { normal: number; foil: number; total: number; deckNeed: number; missingForDeck: number; status: Status };
  other: { normal: number; foil: number; total: number; deckNeed: number; missingForDeck: number; status: Status };
  otherName: string;
};
type OcrWorker = { recognize: (image: HTMLCanvasElement) => Promise<{ data: { text: string } }>; terminate: () => Promise<void> };
type CameraCapabilities = { focusMode?: string[]; zoom?: { min: number; max: number } };

const euro = (value: number) => `${value.toFixed(2)} €`;

type CardCode = { number: string; chapter: string };

function codesFromOcr(value: string): CardCode[] {
  // Le bas d'une carte Lorcana suit le format : 147/207 · FR · 13.
  // Le chapitre est indispensable : le même numéro peut exister dans plusieurs sets.
  const corrected = value.toUpperCase()
    .replace(/[OQD]/g, "0")
    .replace(/[IL|]/g, "1")
    .replace(/S/g, "5")
    .replace(/[•·]/g, " ");
  const matches = corrected.matchAll(/(\d{1,3})\s*\/\s*(204|207)\D{0,16}(\d{1,2})(?!\d)/g);
  return Array.from(matches, (match) => ({ number: `${Number(match[1])}/${match[2]}`, chapter: String(Number(match[3])) }));
}

function mostFrequentCode(readings: CardCode[]) {
  const counts = new Map<string, number>();
  readings.forEach((reading) => {
    const key = `${reading.number}|${reading.chapter}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const key = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!key) return null;
  const [number, chapter] = key.split("|");
  return { number, chapter };
}

export default function ScanPage() {
  const [userId, setUserId] = useState("adrien");
  const [manual, setManual] = useState("");
  const [status, setStatus] = useState("Ouvre la caméra et place le numéro de la carte dans le cadre.");
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<OcrWorker | null>(null);

  useEffect(() => {
    setUserId(localStorage.getItem("activeUser") || "adrien");
    return () => { streamRef.current?.getTracks().forEach((track) => track.stop()); if (workerRef.current) void workerRef.current.terminate(); };
  }, []);

  async function search(number: string, name = "", chapter = "") {
    if (!number.trim() && !name.trim()) return;
    setStatus(chapter ? `Recherche dans le chapitre ${chapter}…` : "Recherche dans tous les chapitres…");
    const response = await fetch(`/api/cards/market-scan?userId=${userId}&number=${encodeURIComponent(number)}&name=${encodeURIComponent(name)}&chapter=${encodeURIComponent(chapter)}`);
    const found = await response.json();
    const list = Array.isArray(found) ? found : [];
    setResults(list);
    if (!list.length) { setStatus("Aucune carte suffisamment sûre. Essaie le numéro ou le nom manuellement."); return; }
    const top = list[0] as ScanResult;
    if (navigator.vibrate) navigator.vibrate(top.mine.status === "enough" ? 70 : top.mine.status === "deck" ? [70, 50, 70] : [70, 50, 70, 50, 70]);
    setStatus("Voici les cartes les plus probables. La caméra reste ouverte pour la suivante.");
  }

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) { setStatus("La caméra n’est pas disponible ici. Utilise la recherche manuelle."); return; }
    if (!window.isSecureContext && window.location.hostname !== "localhost") { setStatus("Sur iPhone, la caméra fonctionne uniquement sur la version HTTPS publiée du site."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1080 }, height: { ideal: 1440 }, aspectRatio: { ideal: 3 / 4 } }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
      window.setTimeout(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play().catch(() => setStatus("Touchez l’aperçu pour démarrer la caméra."));
      }, 0);
      window.setTimeout(async () => {
        const track = stream.getVideoTracks()[0] as MediaStreamTrack & { getCapabilities?: () => CameraCapabilities };
        const capabilities = track.getCapabilities?.();
        const advanced: Record<string, string | number>[] = [];
        if (capabilities?.focusMode?.includes("continuous")) advanced.push({ focusMode: "continuous" });
        if (capabilities?.zoom && capabilities.zoom.max > capabilities.zoom.min) advanced.push({ zoom: Math.min(capabilities.zoom.max, capabilities.zoom.min + (capabilities.zoom.max - capabilities.zoom.min) * .22) });
        if (advanced.length) try { await track.applyConstraints({ advanced } as unknown as MediaTrackConstraints); } catch { /* Réglages non disponibles sur tous les téléphones. */ }
      }, 0);
      setStatus("Caméra prête. Approche la carte, attends qu’elle soit nette, puis analyse-la.");
    } catch (error) {
      setStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "Autorise l’accès à l’appareil photo dans les réglages du navigateur." : "Impossible d’ouvrir la caméra. Utilise la recherche manuelle.");
    }
  }

  function cropFrame(video: HTMLVideoElement) {
    const frame = frameRef.current;
    const viewport = video.parentElement;
    if (!frame || !viewport) throw new Error("Cadre de lecture indisponible.");
    const viewportRect = viewport.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const scale = Math.max(viewportRect.width / video.videoWidth, viewportRect.height / video.videoHeight);
    const renderedWidth = video.videoWidth * scale;
    const renderedHeight = video.videoHeight * scale;
    const offsetX = (viewportRect.width - renderedWidth) / 2;
    const offsetY = (viewportRect.height - renderedHeight) / 2;
    const sourceX = Math.max(0, (frameRect.left - viewportRect.left - offsetX) / scale);
    const sourceY = Math.max(0, (frameRect.top - viewportRect.top - offsetY) / scale);
    const sourceWidth = Math.min(video.videoWidth - sourceX, frameRect.width / scale);
    const sourceHeight = Math.min(video.videoHeight - sourceY, frameRect.height / scale);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = Math.min(1600, Math.max(900, Math.round(sourceWidth * 2)));
    canvas.height = Math.max(1, Math.round(canvas.width * (sourceHeight / sourceWidth)));
    context?.save();
    if (context) context.filter = "grayscale(1) contrast(2.8) brightness(1.1)";
    context?.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    context?.restore();
    return canvas;
  }

  async function worker() {
    if (!workerRef.current) {
      setStatus("Préparation du lecteur de texte… la première fois peut prendre quelques secondes.");
      const { createWorker } = await import("tesseract.js");
      workerRef.current = await createWorker("eng") as unknown as OcrWorker;
    }
    return workerRef.current;
  }

  async function analyze() {
    const video = videoRef.current;
    if (!video?.videoWidth || isScanning) { setStatus("La caméra n’est pas encore prête. Attends une seconde."); return; }
    setIsScanning(true); setResults([]); setStatus("Mise au point… garde le téléphone immobile.");
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 750));
      const captures = [cropFrame(video)];
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      captures.push(cropFrame(video));
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      captures.push(cropFrame(video));
      const ocr = await worker();
      const readings: CardCode[] = [];
      for (let index = 0; index < captures.length; index += 1) {
        setStatus(`Lecture du code ${index + 1}/3…`);
        const { data } = await ocr.recognize(captures[index]);
        readings.push(...codesFromOcr(data.text));
      }
      const code = mostFrequentCode(readings);
      if (!code) { setStatus("Code incomplet. Place la ligne entière XXX/204 ou 207 · FR · chapitre dans le rectangle doré, sans reflet."); return; }
      setManual(`${code.number} · FR · ${code.chapter}`);
      await search(code.number, "", code.chapter);
    } catch (error) {
      console.error("MARKET SCAN OCR ERROR:", error);
      setStatus("La lecture a échoué. Essaie avec davantage de lumière ou la recherche manuelle.");
    } finally { setIsScanning(false); }
  }

  function reset() { setResults([]); setManual(""); setStatus(cameraOpen ? "Prêt pour la carte suivante." : "Ouvre la caméra et place le numéro de la carte dans le cadre."); }
  function label(result: ScanResult) {
    if (result.mine.status === "enough") return `Tu n’en as pas besoin · ${result.mine.total} exemplaire${result.mine.total > 1 ? "s" : ""}`;
    if (result.mine.status === "deck") return `Il t’en faut encore ${result.mine.missingForDeck} pour tes decks`;
    return "Tu ne la possèdes pas encore";
  }
  function otherLabel(result: ScanResult) {
    if (result.other.status === "enough") return null;
    return result.other.status === "deck" ? `${result.otherName} a besoin de ${result.other.missingForDeck} exemplaire${result.other.missingForDeck > 1 ? "s" : ""} pour ses decks` : `${result.otherName} ne la possède pas`;
  }

  return <main><AppHeader /><div className="wrap">
    <section className="hero"><p>SCAN TOUT</p><h1>Repère les cartes <em>qui te manquent.</em></h1><span>Recherche tous les chapitres, vérifie vos collections et la valeur sur place.</span></section>
    <section className="cameraCard">
      <div className="cameraViewport">{cameraOpen ? <video ref={(element) => { videoRef.current = element; if (element && streamRef.current) { element.srcObject = streamRef.current; void element.play().catch(() => setStatus("Touchez l’aperçu pour démarrer la caméra.")); } }} autoPlay playsInline muted onClick={() => void videoRef.current?.play()} /> : <button className="openCamera" onClick={openCamera}><span>📷</span>Ouvrir la caméra</button>}<div className="frame" ref={frameRef}><b>XXX / 204 · FR · CHAPITRE</b></div></div>
      <p className="status">{isScanning ? "⌛ " : "✦ "}{status}</p>
      <div className="actions"><button className="primary" onClick={cameraOpen ? analyze : openCamera} disabled={isScanning}>{isScanning ? "Lecture…" : "✨ Analyser la carte"}</button>{results.length > 0 && <button className="secondary" onClick={reset}>Carte suivante</button>}</div>
      <form onSubmit={(event) => { event.preventDefault(); const code = mostFrequentCode(codesFromOcr(manual)); void search(code?.number || manual, code ? "" : manual, code?.chapter); }}><input value={manual} onChange={(event) => setManual(event.target.value)} placeholder="147/207 · FR · 13 ou nom" /><button>Rechercher</button></form>
    </section>
    {results.length > 0 && <section className="resultList"><p className="listLabel">PROPOSITIONS · CHOISIS LA BONNE CARTE</p>{results.map((result) => <article key={result.id} className={`result ${result.mine.status}`}>
      <img src={result.imageUrl || ""} alt={result.name_fr || result.name || "Carte Lorcana"} />
      <div className="info"><div className="title"><div><p>CHAPITRE {result.setCode || "—"} · #{result.collection_number || "—"}</p><h2>{result.name_fr || result.name}</h2></div><b>{result.confidence}%<small>confiance</small></b></div><div className="prices"><span>◉ Normal <b>{euro(result.price.normal)}</b></span><span>✦ Foil <b>{euro(result.price.foil)}</b></span></div><strong className="state">{result.mine.status === "enough" ? "●" : result.mine.status === "deck" ? "▲" : "✕"} {label(result)}</strong><small className="copies">Toi : {result.mine.normal} normal · {result.mine.foil} foil {result.mine.deckNeed ? `· ${result.mine.deckNeed} utilisé${result.mine.deckNeed > 1 ? "s" : ""} en deck` : ""}</small>{otherLabel(result) && <small className="other">👤 {otherLabel(result)}</small>}</div>
    </article>)}</section>}
  </div><style jsx>{`
    main{min-height:100vh;background:radial-gradient(circle at 12% 5%,#dfe7ff 0,transparent 30%),#f7f5fb;padding-bottom:88px}.wrap{width:min(670px,calc(100% - 24px));margin:18px auto}.hero{padding:28px 24px;border-radius:27px;background:linear-gradient(135deg,#1b163e,#5d3f93);color:#fff;box-shadow:0 16px 38px #2b1c4e2c}.hero p,.listLabel{margin:0;font-size:10px;font-weight:900;letter-spacing:.15em}.hero h1{margin:7px 0 9px;font-size:39px;line-height:.95;letter-spacing:-.06em}.hero em{font-family:Georgia,serif;color:#ffe082}.hero span{font-size:13px;line-height:1.45;color:#ddd4ed}.cameraCard{margin-top:15px;padding:14px;border:1px solid #e5dfee;border-radius:24px;background:#fff;box-shadow:0 10px 27px #45345d14}.cameraViewport{position:relative;aspect-ratio:3/4;overflow:hidden;border-radius:18px;background:#15111f}.cameraViewport video{width:100%;height:100%;object-fit:cover}.openCamera{width:100%;height:100%;display:grid;place-content:center;gap:8px;border:0;background:radial-gradient(circle,#4c3474,#181127);color:#fff;font:800 15px inherit;cursor:pointer}.openCamera span{font-size:38px}.frame{position:absolute;left:10%;right:10%;bottom:8%;height:22%;border:2px solid #f6ce66;border-radius:12px;box-shadow:0 0 0 999px #0004;pointer-events:none}.frame b{position:absolute;top:-21px;left:50%;transform:translateX(-50%);padding:3px 7px;border-radius:7px;background:#f6ce66;color:#342143;font-size:9px;white-space:nowrap}.status{min-height:34px;margin:12px 4px 8px;color:#746881;font-size:12px;line-height:1.35}.actions{display:grid;grid-template-columns:1fr auto;gap:8px}.actions button,.cameraCard form button{min-height:47px;border:0;border-radius:13px;padding:0 15px;font:800 13px inherit;cursor:pointer}.primary{background:linear-gradient(135deg,#5f3e98,#8a67c8);color:#fff}.primary:disabled{opacity:.65;cursor:wait}.secondary{background:#f0ecf5;color:#554568}.cameraCard form{display:flex;gap:8px;margin-top:9px}.cameraCard input{min-width:0;flex:1;height:43px;padding:0 13px;border:1px solid #e4ddea;border-radius:12px;outline:none;font:13px inherit}.cameraCard form button{min-height:43px;background:#efe9f6;color:#574176}.resultList{margin-top:19px}.listLabel{padding:0 5px;color:#847691}.result{display:grid;grid-template-columns:86px minmax(0,1fr);gap:12px;margin-top:9px;padding:11px;border:1px solid #e5e0ea;border-left:5px solid #7a6d88;border-radius:18px;background:#fff;box-shadow:0 9px 20px #46385b10}.result.enough{border-left-color:#38a66d}.result.deck{border-left-color:#e6a63c}.result.missing{border-left-color:#dc5b5b}.result>img{width:86px;height:121px;object-fit:cover;border-radius:9px;background:#eeeaf1}.title{display:flex;justify-content:space-between;gap:9px}.title p{margin:2px 0 5px;color:#8b8098;font-size:9px;font-weight:900;letter-spacing:.08em}.title h2{margin:0;color:#302640;font-size:18px;line-height:1.05}.title>b{display:grid;align-content:center;min-width:43px;height:43px;border-radius:12px;background:#f0edf5;color:#665477;text-align:center;font-size:12px}.title>b small{font-size:7px;color:#91869e}.prices{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.prices span{padding:5px 7px;border-radius:8px;background:#f7f4f9;color:#7b6f88;font-size:10px}.prices b{margin-left:3px;color:#443653}.state{display:block;margin-top:9px;font-size:11px}.enough .state{color:#198355}.deck .state{color:#a66c11}.missing .state{color:#bd4141}.copies,.other{display:block;margin-top:5px;color:#80758d;font-size:10px;line-height:1.3}.other{padding:5px 7px;border-radius:8px;background:#f5f1fa;color:#67557b}@media(max-width:640px){.wrap{margin:8px auto}.hero{padding:14px 17px;border-radius:18px}.hero p{font-size:8px}.hero h1{margin:4px 0;font-size:28px;line-height:1}.hero span{display:none}.cameraCard{margin-top:8px;padding:10px;border-radius:18px}.cameraViewport{height:min(42vh,360px);aspect-ratio:auto;border-radius:13px}.frame{left:9%;right:9%;bottom:9%;height:23%}.status{min-height:25px;margin:8px 3px 6px;font-size:11px}.actions{gap:6px}.actions button,.cameraCard form button{min-height:42px;padding:0 11px;font-size:12px}.cameraCard form{gap:6px;margin-top:6px}.cameraCard input{height:39px;padding:0 10px;font-size:12px}.cameraCard form button{min-height:39px}.resultList{margin-top:12px}}@media(min-width:700px){.wrap{margin-top:26px}.cameraCard{padding:18px}.cameraViewport{max-height:580px}.hero{padding:33px}.result{grid-template-columns:100px minmax(0,1fr)}.result>img{width:100px;height:141px}}`}</style></main>;
}
