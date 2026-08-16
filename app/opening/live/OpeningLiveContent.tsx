"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "app/components/AppHeader";

type Card = {
  id: string;
  name: string;
  name_fr?: string;
  collection_number?: string;
  usd?: number;
  usd_foil?: number;
  imageUrl: string;
  isNew?: boolean;
  quantity?: number;
  forOtherUser?: boolean;
  foil?: boolean;
  confidence?: number;
};

type OcrWorker = {
  recognize: (image: HTMLCanvasElement) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<void>;
};

type CameraCapabilities = {
  focusMode?: string[];
  zoom?: { min: number; max: number };
};

export default function OpeningLiveContent() {
  const params = useSearchParams();

  const chapter = params.get("chapter") || "";
  const boosterImage = decodeURIComponent(params.get("booster") || "");

  const [cards, setCards] = useState<Card[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [scanText, setScanText] = useState({ number: "", name: "" });
  const [numberReadings, setNumberReadings] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuggestions, setScanSuggestions] = useState<Card[]>([]);
  const [capturePreview, setCapturePreview] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ocrWorkerRef = useRef<OcrWorker | null>(null);

  const [collection, setCollection] = useState<Record<string, number>>({});
  const [otherCollection, setOtherCollection] = useState<Record<string, number>>({});
  const [openingStats, setOpeningStats] = useState<Record<string, { count: number; last: string }>>({});

  // 💱 conversion €
  const toEuro = (usd?: number) =>
    usd ? (usd * 0.92).toFixed(2) + "€" : "-";

  // 🔥 Total Somme
const totalValue = cards.reduce((sum, c) => {
  const price = c.foil ? c.usd_foil : c.usd;
  return sum + (price || 0);
}, 0);

const progress = (cards.length / 12) * 100;

  // ================== LOAD COLLECTION ==================
  useEffect(() => {
    async function load() {
      const me = localStorage.getItem("activeUser") || "adrien";
      const other = me === "adrien" ? "angele" : "adrien";

      const [mine, otherC] = await Promise.all([
        fetch(`/api/collection?userId=${me}`).then((r) => r.json()),
        fetch(`/api/collection?userId=${other}`).then((r) => r.json()),
      ]);

      const map: any = {};
      mine.forEach((c: any) => {
        map[c.cardId] = c.quantity;
      });

      const otherMap: any = {};
      otherC.forEach((c: any) => {
        otherMap[c.cardId] = c.quantity;
      });

      setCollection(map);
      setOtherCollection(otherMap);
    }

    load();
  }, []);

  useEffect(() => {
    const activeUser = localStorage.getItem("activeUser") || "adrien";
    fetch("/api/booster/history", { cache: "no-store" })
      .then((response) => response.json())
      .then((history) => {
        const stats: Record<string, { count: number; last: string }> = {};
        (Array.isArray(history) ? history : []).filter((opening) => opening.userId === activeUser).forEach((opening) => {
          (opening.cards || []).forEach((pull: any) => {
            const id = pull.cardId || pull.card?.id;
            if (!id) return;
            const previous = stats[id];
            const isLater = !previous || new Date(opening.createdAt).getTime() > new Date(previous.last).getTime();
            stats[id] = { count: (previous?.count || 0) + 1, last: isLater ? opening.createdAt : previous.last };
          });
        });
        setOpeningStats(stats);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (ocrWorkerRef.current) void ocrWorkerRef.current.terminate();
    };
  }, []);

  async function openScanner() {
    setScannerOpen(true);
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanStatus("La caméra n'est pas disponible dans ce navigateur. Utilise la saisie manuelle.");
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setScanStatus("Sur iPhone, Safari autorise la caméra uniquement sur un site sécurisé HTTPS. Ouvre la version publiée du site, pas son adresse locale.");
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            aspectRatio: { ideal: 3 / 4 },
            width: { ideal: 1080 },
            height: { ideal: 1440 },
          },
          audio: false,
        });
      } catch {
        // Safari peut refuser les contraintes avancées : on retente avec la caméra disponible.
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0] as MediaStreamTrack & {
        getCapabilities?: () => CameraCapabilities;
      };
      const capabilities = track?.getCapabilities?.() as unknown as CameraCapabilities | undefined;
      const advanced: Record<string, string | number>[] = [];
      if (capabilities?.focusMode?.includes("continuous")) advanced.push({ focusMode: "continuous" });
      if (capabilities?.zoom && capabilities.zoom.max > capabilities.zoom.min) {
        advanced.push({ zoom: Math.min(capabilities.zoom.max, capabilities.zoom.min + (capabilities.zoom.max - capabilities.zoom.min) * 0.25) });
      }
      if (advanced.length) {
        try {
          await track.applyConstraints({ advanced } as unknown as MediaTrackConstraints);
        } catch {
          // Chaque téléphone expose des réglages différents : la caméra reste utilisable sans ces optimisations.
        }
      }
      setScanSuggestions([]);
      setScanText({ number: "", name: "" });
      setNumberReadings([]);
      setCapturePreview("");
      setScanStatus("Caméra prête. Centre le numéro dans le cadre doré et attends que l'image soit nette.");
    } catch (error) {
      const message = error instanceof DOMException && error.name === "NotAllowedError"
        ? "Autorise l'accès à l'appareil photo dans les réglages de Safari, puis réessaie."
        : "Impossible d'ouvrir la caméra. Vérifie que Safari a accès à l'appareil photo.";
      setScanStatus(message);
    }
  }

  function closeScanner() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScannerOpen(false);
  }

  async function getOcrWorker() {
    if (!ocrWorkerRef.current) {
      setScanStatus("Préparation du lecteur de texte… la première fois peut prendre quelques secondes.");
      const { createWorker } = await import("tesseract.js");
      ocrWorkerRef.current = await createWorker("eng") as unknown as OcrWorker;
    }
    return ocrWorkerRef.current;
  }

  function captureNumberCrop(source: HTMLVideoElement) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return canvas;
    const cropTop = source.videoHeight * 0.76;
    const cropHeight = source.videoHeight * 0.22;
    canvas.width = Math.min(1400, source.videoWidth);
    canvas.height = Math.max(1, Math.round(canvas.width * (cropHeight / source.videoWidth)));
    context.filter = "grayscale(1) contrast(2)";
    context.drawImage(source, 0, cropTop, source.videoWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    context.filter = "none";
    return canvas;
  }

  function numberFromOcr(value: string) {
    const corrected = value
      .toUpperCase()
      .replace(/[OQD]/g, "0")
      .replace(/[IL|]/g, "1")
      .replace(/S/g, "5")
      .replace(/\s+/g, " ");
    const fractions = corrected.match(/\d{1,3}\s*\/\s*\d{2,3}/g) ?? [];
    return fractions.map((part) => part.replace(/\s/g, ""));
  }

  function mostFrequent(readings: string[]) {
    const counts = new Map<string, number>();
    readings.forEach((reading) => counts.set(reading, (counts.get(reading) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  }

  async function captureAndScan() {
    if (isScanning) return;
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setScanStatus("La caméra n'est pas encore prête. Attends une seconde, puis réessaie.");
      return;
    }
    setIsScanning(true);
    setScanSuggestions([]);
    setScanStatus("Mise au point en cours… garde le téléphone immobile.");
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      const preview = document.createElement("canvas");
      preview.width = video.videoWidth;
      preview.height = video.videoHeight;
      preview.getContext("2d")?.drawImage(video, 0, 0);
      setCapturePreview(preview.toDataURL("image/jpeg", 0.82));

      const captures = [captureNumberCrop(video)];
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      captures.push(captureNumberCrop(video));
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      captures.push(captureNumberCrop(video));

      const worker = await getOcrWorker();
      const readings: string[] = [];
      for (let index = 0; index < captures.length; index += 1) {
        setScanStatus(`Lecture du numéro ${index + 1} / ${captures.length}…`);
        const { data } = await worker.recognize(captures[index]);
        readings.push(...numberFromOcr(data.text));
      }

      const number = mostFrequent(readings);
      setNumberReadings(readings);
      if (!number) {
        setScanStatus("La photo a été prise, mais le numéro n'a pas été lu. Place uniquement le bas de la carte dans le cadre doré, sans reflet.");
        return;
      }
      setScanText({ number, name: "" });
      setInput(number);
      setScanStatus("Recherche parmi les cartes du chapitre…");
      const response = await fetch(`/api/cards/scan?chapter=${encodeURIComponent(chapter)}&number=${encodeURIComponent(readings.join(" "))}`);
      const found = await response.json();
      setScanSuggestions(Array.isArray(found) ? found : []);
      setScanStatus(Array.isArray(found) && found.length ? "Carte(s) trouvée(s) : choisis celle qui correspond avant de l'ajouter." : "Texte lu, mais aucune carte sûre. La saisie manuelle a été préremplie ci-dessous.");
    } catch (error) {
      console.error("CARD OCR ERROR:", error);
      const detail = error instanceof Error ? error.message : "erreur inconnue";
      setScanStatus(`La lecture a échoué : ${detail}`);
    } finally {
      setIsScanning(false);
    }
  }

  function confirmScannedCard(card: Card) {
    setCards((prev) => [...prev, enrichCard(card)]);
    closeScanner();
    setScanSuggestions([]);
    setScanStatus("");
  }

  // ================== SUGGESTIONS ==================
  async function handleChange(value: string) {
    setInput(value);

    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }

    const res = await fetch(
      `/api/cards?q=${encodeURIComponent(value)}&chapter=${chapter}`
    );

    const data = await res.json();
    setSuggestions(Array.isArray(data) ? data : []);
  }

  // ================== ADD CARD ==================
  function enrichCard(card: any): Card {
    const isNew = !collection[card.id];
    const quantity = collection[card.id] || 0;
    const forOtherUser = !otherCollection[card.id];

    return {
      ...card,
      isNew,
      quantity,
      forOtherUser,
    };
  }

  async function handleAdd() {
    if (!input) return;

    const res = await fetch(
      `/api/cards?q=${encodeURIComponent(input)}&chapter=${chapter}`
    );

    const data = await res.json();

    if (!data || data.length === 0) {
      alert("Carte introuvable");
      return;
    }

    if (data.length > 1) {
      alert("Plusieurs cartes trouvées");
      return;
    }

    const enriched = enrichCard(data[0]);

    setCards((prev) => [...prev, enriched]);
    setInput("");
    setSuggestions([]);
  }

  function removeLastCard() {
    setCards((prev) => prev.slice(0, -1));
  }

  function toggleFoil() {
    setCards((prev) => {
      const copy = [...prev];
      const index = copy.length - 1;

      if (index < 0) return prev;

      copy[index] = {
        ...copy[index],
        foil: !copy[index].foil,
      };

      return copy;
    });
  }

  const lastCard = cards[cards.length - 1];
  const isFoilCard = cards.length === 11 || cards.length === 12;
  const lastCardHistory = lastCard ? openingStats[lastCard.id] : undefined;

  return (
    <main className="opening-live">
      <AppHeader />
      <div className="liveWrap">
      <section className="liveHero">
        <div><p>OUVERTURE EN DIRECT · CHAPITRE {chapter}</p><h1>Révèle ton<br/><em>booster.</em></h1><span>{cards.length ? "La dernière carte apparaît ici. Ajoute la suivante quand tu es prêt." : "Le booster est prêt. Commence par scanner ou rechercher la première carte."}</span></div>
        <div className="liveHeroPack">{boosterImage ? <img src={boosterImage} alt="Booster Lorcana" /> : "🎁"}<b>{cards.length} / 12</b></div>
      </section>
      <section className="layout">

        {/* LEFT */}
        <div className="left">
          {lastCard && (
            <>
              <div className={lastCard?.foil ? "foilCard current" : "current"}>
                <img src={lastCard.imageUrl} />
              </div>

              {isFoilCard && (
                <button className="foilBtn" onClick={toggleFoil}>
                  ✨ {lastCard?.foil ? "Foil activée" : "Mettre en foil"}
                </button>
              )}
            </>
          )}
          {!lastCard && <div className="awaiting"><span>✦</span><p>LE BOOSTER EST PRÊT</p><h2>Révèle la<br/><em>première carte.</em></h2><small>Scanne-la ou cherche-la manuellement à droite.</small></div>}
        </div>

        {/* RIGHT */}
        <div className="right">

  <div className="actionTitle"><p>AJOUTER UN TIRAGE</p><h2>Carte {Math.min(cards.length + 1, 12)} <span>/ 12</span></h2><small>Le Grimoire l’ajoutera à cette ouverture après ta validation.</small></div>

  {/* BOOSTER + VALUE */}
  <div className="boosterBox">
    {boosterImage && <img src={boosterImage} />}
    <div className="value">💰 {toEuro(totalValue)}</div>
  </div>

  {/* PROGRESS */}
  <div className="progressBar">
    <div
      className="progressFill"
      style={{ width: `${progress}%` }}
    />
  </div>

  <div className="progressText">
    🎴 {cards.length} / 12
  </div>

  {/* SEARCH */}
  <div className="searchBox">
    <button className="scanBtn" onClick={openScanner} type="button">
      📷 Scanner une carte
    </button>
    <input
      className="pill input"
      value={input}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && handleAdd()}
      placeholder="Nom ou numéro"
    />

    <button className="btn" onClick={handleAdd}>
      Valider
    </button>

    <button className="undoBtn" onClick={removeLastCard}>
      ↩️ Annuler
    </button>
    {suggestions.length > 0 && <div className="suggestions">{suggestions.slice(0, 5).map((c, i) => <button key={c.id || i} className="suggestionItem" onClick={() => { const enriched = enrichCard(c); setCards((prev) => [...prev, enriched]); setInput(""); setSuggestions([]); }}><img src={c.imageUrl} alt="" /><span><b>{c.name_fr || c.name}</b><small>#{c.collection_number || "—"}</small></span><i>Ajouter</i></button>)}</div>}
  </div>

  {scannerOpen && (
    <div className="scanner" role="dialog" aria-modal="true" aria-label="Scanner une carte Lorcana">
      <div className="cameraViewport">
        <video
          ref={(element) => {
            videoRef.current = element;
            if (element && streamRef.current) {
              element.srcObject = streamRef.current;
              void element.play().catch(() => setScanStatus("Touchez l'aperçu pour démarrer la caméra."));
            }
          }}
          autoPlay
          muted
          playsInline
          onClick={() => void videoRef.current?.play()}
        />
        <div className="scanFrame"><span>NUMÉRO DE LA CARTE</span></div>
      </div>
      <p>{scanStatus}</p>
      {capturePreview && <img className="capturePreview" src={capturePreview} alt="Photo utilisée pour la lecture" />}
      {scanText.number || scanText.name ? <small>Lu : {scanText.number || "—"} {scanText.name ? `• ${scanText.name}` : ""}</small> : null}
      {numberReadings.length > 0 && <small>Lectures : {numberReadings.join(" · ")}</small>}
      <div className="scannerActions">
        <button className="btn" onClick={captureAndScan} type="button" disabled={isScanning}>
          {isScanning ? "Mise au point / lecture…" : "Lire le numéro"}
        </button>
        <button className="undoBtn" onClick={closeScanner} type="button">Fermer</button>
      </div>
      {scanSuggestions.map((card) => (
        <div className="scanResult" key={card.id}>
          {card.imageUrl && <img src={card.imageUrl} alt="" />}
          <div><strong>{card.name_fr || card.name}</strong><span>#{card.collection_number || "—"} · Confiance {card.confidence ?? 0}%</span></div>
          <button className="btn" onClick={() => confirmScannedCard(card)} type="button">Valider</button>
        </div>
      ))}
      <button className="rescanBtn" onClick={captureAndScan} type="button">🔄 Rescanner</button>
    </div>
  )}

  {/* CARD INFO */}
  {lastCard && (
    <div className="cardInfo">

      <div className="title">
        {lastCard.name_fr || lastCard.name}
      </div>

      <div className="number">
        #{lastCard.collection_number || "-"}
      </div>

      <div className="prices">
        <div>💰 {toEuro(lastCard.usd)}</div>
        <div>✨ {toEuro(lastCard.usd_foil)}</div>
      </div>

      <div className="badges">
        {lastCard.isNew && <span className="badge new">🆕 Nouvelle</span>}
        {lastCard.quantity! > 0 && (
          <span className="badge dup">🔁 x{lastCard.quantity}</span>
        )}
        {lastCard.forOtherUser && (
          <span className="badge gift">🎁 Utile</span>
        )}
      </div>

      <div className="openingInsights"><div><span>Collection</span><b>{lastCard.quantity || 0} exemplaire{(lastCard.quantity || 0) > 1 ? "s" : ""}</b></div><div><span>Déjà tirée</span><b>{lastCardHistory?.count || 0} fois</b></div><div><span>Dernière fois</span><b>{lastCardHistory?.last ? new Date(lastCardHistory.last).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "Aujourd’hui"}</b></div><div><span>Statut</span><b>{lastCard.isNew ? "Nouvelle ✦" : "Doublon"}</b></div></div>

    </div>
  )}

  {/* FINISH BUTTON */}
  {cards.length === 12 && (
    <button
      className="finish"
      onClick={async () => {
        if (loading) return;
        setLoading(true);

        try {
          const userId = localStorage.getItem("activeUser") || "adrien";

          const collectionRes = await fetch("/api/collection/addBooster", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, cards }),
          });

          const collectionData = await collectionRes.json();

          if (!collectionRes.ok || !collectionData.ok) {
            throw new Error(
              collectionData.error || "Impossible d'ajouter les cartes à la collection."
            );
          }

          const res = await fetch("/api/booster/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              chapter,
              boosterImage,
              cards,
            }),
          });

          const data = await res.json();

          if (!res.ok || !data.id) {
            throw new Error(data.error || "Impossible d'enregistrer le booster.");
          }

          window.location.href = `/opening/result?id=${data.id}`;
        } catch (error) {
          console.error("OPENING SAVE ERROR =", error);
          alert(
            error instanceof Error
              ? error.message
              : "Une erreur est survenue pendant l'enregistrement du booster."
          );
        } finally {
          setLoading(false);
        }
      }}
    >
      🎉 Terminer le booster
    </button>
  )}

</div>

        {/* HISTORY */}
        <div className="historyFull">
          <div className="queueTitle"><span>LE CONTENU DU BOOSTER</span><b>{cards.length} / 12 révélées</b></div>
          <div className="cardQueue">{Array.from({ length: 12 }, (_, index) => { const card = cards[index]; return <div key={index} className={card ? "queueCard revealed" : "queueCard"}>{card ? <img src={card.imageUrl} alt={card.name_fr || card.name} /> : <span>{index + 1}</span>}{card?.foil && <i>✦</i>}</div>; })}</div>
        </div>

      </section>
      </div>

      <style jsx>{`
        .opening-live { min-height:100vh; background:radial-gradient(circle at 4% 8%,#fff0cb,transparent 24rem),radial-gradient(circle at 97% 43%,#e4dcff,transparent 28rem),#f8f5ef; color:#302a3c; padding-bottom:60px; }
        .liveWrap { max-width:1120px; margin:auto; padding:26px 18px; }
        .liveHero { min-height:245px; padding:29px 38px; border-radius:28px; background:linear-gradient(125deg,#241d43,#493477 63%,#7759a9); color:#fff; display:flex; justify-content:space-between; align-items:center; position:relative; overflow:hidden; box-shadow:0 20px 45px rgba(54,37,98,.23); margin-bottom:17px; }
        .liveHero:after { content:'✦'; position:absolute; right:23%; top:-66px; font:210px Georgia; color:rgba(255,255,255,.06); }
        .liveHero>div { position:relative; z-index:1; }.liveHero p{margin:0;color:#ded5f3;font-size:10px;font-weight:900;letter-spacing:.14em}.liveHero h1{margin:10px 0;font-size:clamp(34px,4vw,48px);letter-spacing:-.065em;line-height:.94}.liveHero h1 em{font-family:Georgia;font-weight:400;color:#ffd265}.liveHero span{font-size:12px;color:#ded7ef;max-width:490px;display:block}.liveHeroPack{width:94px;transform:rotate(5deg);filter:drop-shadow(0 14px 18px rgba(0,0,0,.25));text-align:center;font-size:42px}.liveHeroPack img{width:100%;border-radius:10px;display:block}.liveHeroPack b{display:inline-block;margin-top:7px;padding:4px 7px;border-radius:99px;background:#f6d26c;color:#42300e;font-size:10px;transform:rotate(-5deg)}
        .layout {
          display: grid;
          grid-template-columns: minmax(0,1fr) 390px;
          gap: 16px;
          max-width: 1120px;
          margin: auto;
        }

        .left {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 365px;
          justify-content: center;
          border:1px solid #e9e3ed;
          border-radius:22px;
          background:linear-gradient(145deg,#fff,#faf8fc);
          box-shadow:0 8px 22px rgba(48,36,75,.055);
          padding:20px;
          position:relative;
          overflow:hidden;
        }
        .left:before{content:'';position:absolute;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(122,86,177,.18),transparent 67%);top:-115px;left:-95px}.awaiting{position:relative;z-index:1;text-align:center;padding:25px}.awaiting>span{display:grid;place-items:center;width:70px;height:70px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(135deg,#f7d672,#d99733);color:#fff;font:31px Georgia;box-shadow:0 10px 24px rgba(184,130,38,.25)}.awaiting p,.actionTitle p{font-size:10px;font-weight:900;letter-spacing:.13em;color:#8d8398;margin:0}.awaiting h2{font-size:30px;letter-spacing:-.06em;line-height:.97;margin:9px 0}.awaiting h2 em{font-family:Georgia;font-weight:400;color:#73539d}.awaiting small{display:block;max-width:250px;color:#8a8290;font-size:11px;line-height:1.5}

        .right {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding:20px;
          border:1px solid #e9e3ed;
          border-radius:22px;
          background:rgba(255,255,255,.9);
          box-shadow:0 8px 22px rgba(48,36,75,.055);
          align-self:start;
        }
        .actionTitle{padding-bottom:5px}.actionTitle h2{font-size:25px;letter-spacing:-.055em;margin:5px 0}.actionTitle h2 span{font-size:14px;color:#9d94a4}.actionTitle small{color:#8c8392;font-size:10px;line-height:1.4}

        .current img {
          width: 100%;
          max-width: 218px;
          border-radius: 15px;
          box-shadow:0 20px 30px rgba(31,21,53,.2);
        }

.searchBox {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.searchBox { display:grid; grid-template-columns:1fr 1fr; }
.searchBox .scanBtn,.searchBox .input{grid-column:span 2}.searchBox .input{width:100%;height:43px;padding:0 13px;border-radius:11px;background:#faf9fb;border:1px solid #e5dfe8}.searchBox .btn,.searchBox .undoBtn{height:42px;border:0;cursor:pointer;font-weight:800;font-size:11px}.searchBox .undoBtn{border:1px solid #e4dfe8;background:#f7f5f8;color:#746b7d}

.scanBtn, .rescanBtn {
  padding: 10px;
  border-radius: 10px;
  background: linear-gradient(90deg,#584182,#7756a7);
  color: white;
  font-weight: 700;
}

.scanner {
  background: #13213b;
  color: white;
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cameraViewport { position: relative; width: min(100%, 430px); margin: 0 auto; aspect-ratio: 3 / 4; overflow: hidden; border-radius: 12px; background: #000; }
.scanner video { width: 100%; height: 100%; border-radius: 12px; object-fit: cover; }
.capturePreview { width: 72px; border-radius: 8px; border: 1px solid rgba(255,255,255,.45); }
.scanFrame {
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: 6%;
  height: 19%;
  border: 3px solid #e8c56f;
  border-radius: 10px;
  pointer-events: none;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.scanFrame span { transform: translateY(-120%); font-size: 11px; font-weight: 800; color: #e8c56f; text-shadow: 0 1px 2px #000; }
.scanner p { margin: 0; font-size: 14px; }
.scanner small { opacity: .8; overflow-wrap: anywhere; }
.scannerActions { display: flex; gap: 8px; }
.scanResult { display: flex; align-items: center; gap: 8px; border-top: 1px solid rgba(255,255,255,.2); padding-top: 8px; }
.scanResult img { width: 40px; border-radius: 4px; }
.scanResult div { flex: 1; display: flex; flex-direction: column; font-size: 12px; }
.scanResult span { opacity: .8; }

        .cardInfo {
          background: linear-gradient(145deg,#fff,#f8f5fc);
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 8px 20px rgba(45,34,69,0.08);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .openingInsights{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:6px;padding-top:11px;border-top:1px solid #ece6ef}.openingInsights div{padding:8px;border-radius:9px;background:#f7f4f9}.openingInsights span,.openingInsights b{display:block}.openingInsights span{font-size:8px;color:#958b9c;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.openingInsights b{font-size:10px;color:#4e435b;margin-top:3px}

        .title {
          font-weight: bold;
          font-size: 16px;
        }

        .number {
          font-size: 13px;
          opacity: 0.6;
        }

        .prices {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
        }

        .historyFull {
          grid-column: span 2;
          display: flex;
          gap: 6px;
          overflow-x: auto;
          margin-top: 10px;
          padding:12px;
          border-radius:16px;
          background:rgba(255,255,255,.7);
          border:1px solid #e8e3eb;
        }

        .historyFull img {
          width: 60px;
          border-radius: 6px;
        }

        .btn {
          padding: 10px;
          border-radius: 10px;
          background: #c9a86a;
          color: white;
        }

        .undoBtn {
          padding: 10px;
          border-radius: 10px;
          background: #eee;
        }

        .foilBtn {
          margin-top: 10px;
          padding: 10px;
          border-radius: 999px;
          background: linear-gradient(90deg, #fff, #f3e8ff);
          font-weight: bold;
        }

.suggestions {
  position: absolute;
  top: calc(100% + 7px);
  left: 0;
  width: 100%;
  background: white;
  border: 1px solid #e5dfe9;
  border-radius: 12px;
  box-shadow: 0 16px 30px rgba(37,27,57,0.18);
  z-index: 30;
  overflow: auto;
  max-height: 310px;
}

        .suggestionItem {
          display: flex;
          align-items:center;
          width:100%;
          border:0;
          background:white;
          gap: 8px;
          padding: 8px;
          cursor: pointer;
          text-align:left;
        }

        .suggestionItem img {
          width: 30px;
        }

        .suggestionItem:hover {
          background: #f5f1f9;
        }
        .suggestionItem span{flex:1;min-width:0}.suggestionItem span b,.suggestionItem span small{display:block}.suggestionItem span b{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.suggestionItem span small{font-size:9px;color:#92899a;margin-top:2px}.suggestionItem i{font-size:9px;font-weight:900;font-style:normal;color:#69508f}

        .badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .badge {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 999px;
        }

        .badge.new {
          background: #d1fae5;
          color: #065f46;
        }

        .badge.dup {
          background: #fef3c7;
          color: #92400e;
        }

        .badge.gift {
          background: #ede9fe;
          color: #5b21b6;
        }

        .boosterBox {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.boosterBox img {
  width: 70px;
  border-radius: 6px;
  }

.value {
  font-weight: bold;
  font-size: 18px;
}

.progressBar {
  height: 8px;
  background: #e5e5e5;
  border-radius: 999px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: linear-gradient(90deg,#efb839,#f5d46a);
  color:#45300d;
  transition: 0.4s;
}

.progressText {
  text-align: center;
  font-size: 13px;
  font-weight: 500;
}

.finish {
  padding: 12px;
  background: linear-gradient(90deg,#493476,#7152a2);
  color: white;
  border-radius: 10px;
  cursor: pointer;
  text-align: center;
}
.finish{min-height:49px;border:0;font-weight:900;font-size:13px;box-shadow:0 10px 20px rgba(73,52,118,.18)}
.historyFull{flex-direction:column}.queueTitle{display:flex;justify-content:space-between;align-items:center;color:#837a8e}.queueTitle span{font-size:10px;font-weight:900;letter-spacing:.1em}.queueTitle b{font-size:11px;color:#593f83}.cardQueue{display:grid;grid-template-columns:repeat(12,1fr);gap:6px}.queueCard{position:relative;min-width:0;aspect-ratio:.69;border:1px dashed #d8d0dd;border-radius:7px;background:#f7f4f8;display:grid;place-items:center;color:#b3a9b9;font-size:10px;font-weight:900;overflow:hidden}.queueCard.revealed{border:0;background:#ded7e4}.queueCard img{width:100%;height:100%;object-fit:cover}.queueCard i{position:absolute;right:2px;top:2px;width:14px;height:14px;display:grid;place-items:center;border-radius:50%;background:#f3cf5a;color:#59401a;font-size:9px;font-style:normal}

@media (max-width: 640px) {
  .liveWrap { padding:15px 12px 20px; }
  .liveHero{padding:25px 20px;min-height:210px}.liveHeroPack{width:82px}.liveHero h1{font-size:34px}
  .layout {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 0 12px 20px;
  }

  .left { min-height: 245px; }
  .right{padding:15px;border-radius:18px}.cardQueue{grid-template-columns:repeat(6,1fr)}.queueTitle{margin-bottom:4px}.awaiting h2{font-size:27px}
  .current img { max-width: 230px; }
  .historyFull { grid-column: span 1; }
  .boosterBox img { width: 58px; }
  .searchBox .btn, .searchBox .undoBtn, .scanBtn { min-height: 44px; }

  .scanner {
    position: fixed;
    inset: 0;
    z-index: 50;
    border-radius: 0;
    padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
    overflow-y: auto;
  }

  .cameraViewport { width: 100%; max-height: 56vh; }
  .scannerActions { position: sticky; bottom: 0; }
  .scannerActions button, .rescanBtn { min-height: 46px; flex: 1; }
  .scanResult { align-items: flex-start; }
}
      `}</style>
    </main>
  );
}
