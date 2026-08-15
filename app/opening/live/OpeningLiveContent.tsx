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

type DetectedText = { rawValue: string };
type BrowserTextDetector = { detect: (source: CanvasImageSource) => Promise<DetectedText[]> };

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
  const [scanSuggestions, setScanSuggestions] = useState<Card[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [collection, setCollection] = useState<Record<string, number>>({});
  const [otherCollection, setOtherCollection] = useState<Record<string, number>>({});

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
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
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
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch {
        // Safari peut refuser les contraintes avancées : on retente avec la caméra disponible.
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      setScanSuggestions([]);
      setScanText({ number: "", name: "" });
      const hasNativeOcr = Boolean((window as unknown as { TextDetector?: unknown }).TextDetector);
      setScanStatus(hasNativeOcr
        ? "Cadre la carte entière, puis prends la photo."
        : "Caméra ouverte. Safari ne permet pas encore la lecture automatique ici : utilise la saisie manuelle après la photo.");
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

  async function readCrop(canvas: HTMLCanvasElement, source: HTMLVideoElement, top: number, height: number) {
    const context = canvas.getContext("2d");
    if (!context) return "";
    canvas.width = source.videoWidth;
    canvas.height = Math.max(1, Math.round(source.videoHeight * height));
    context.filter = "grayscale(1) contrast(2)";
    context.drawImage(source, 0, source.videoHeight * top, source.videoWidth, source.videoHeight * height, 0, 0, canvas.width, canvas.height);
    context.filter = "none";
    const TextDetector = (window as unknown as { TextDetector?: new () => BrowserTextDetector }).TextDetector;
    if (!TextDetector) return "";
    const blocks = await new TextDetector().detect(canvas);
    return blocks.map((block) => block.rawValue).join(" ");
  }

  async function captureAndScan() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setScanStatus("Lecture du numéro et du nom…");
    try {
      const [name, number] = await Promise.all([
        readCrop(document.createElement("canvas"), video, 0, 0.28),
        readCrop(document.createElement("canvas"), video, 0.72, 0.28),
      ]);
      if (!number && !name) {
        setScanStatus("OCR indisponible ou texte non lu. Essaie avec plus de lumière, ou utilise la saisie manuelle.");
        return;
      }
      setScanText({ number, name });
      const response = await fetch(`/api/cards/scan?chapter=${encodeURIComponent(chapter)}&number=${encodeURIComponent(number)}&name=${encodeURIComponent(name)}`);
      const found = await response.json();
      setScanSuggestions(Array.isArray(found) ? found : []);
      setScanStatus(Array.isArray(found) && found.length ? "Choisis la carte détectée avant de l'ajouter." : "Aucune carte sûre. Ajuste le cadrage ou utilise la saisie manuelle.");
    } catch {
      setScanStatus("La lecture a échoué. Essaie de nouveau ou utilise la saisie manuelle.");
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

  return (
    <main className="shell">
      <AppHeader title="Ouverture" icon="✨" />

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
        </div>

        {/* RIGHT */}
        <div className="right">

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
  </div>

  {scannerOpen && (
    <div className="scanner" role="dialog" aria-modal="true" aria-label="Scanner une carte Lorcana">
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
      <div className="scanFrame" />
      <p>{scanStatus}</p>
      {scanText.number || scanText.name ? <small>Lu : {scanText.number || "—"} {scanText.name ? `• ${scanText.name}` : ""}</small> : null}
      <div className="scannerActions">
        <button className="btn" onClick={captureAndScan} type="button">Prendre la photo</button>
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

  {/* SUGGESTIONS */}
  {suggestions.length > 0 && (
    <div className="suggestions">
      {suggestions.map((c, i) => (
        <div
          key={i}
          className="suggestionItem"
          onClick={() => {
            const enriched = enrichCard(c);
            setCards((prev) => [...prev, enriched]);
            setInput("");
            setSuggestions([]);
          }}
        >
          <img src={c.imageUrl} />
          <span>{c.name}</span>
        </div>
      ))}
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
          {cards.map((c, i) => (
            <img key={i} src={c.imageUrl} />
          ))}
        </div>

      </section>

      <style jsx>{`
        .layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          max-width: 900px;
          margin: auto;
        }

        .left {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .right {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .current img {
          width: 100%;
          max-width: 320px;
          border-radius: 12px;
        }

.searchBox {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scanBtn, .rescanBtn {
  padding: 10px;
  border-radius: 10px;
  background: #243b64;
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

.scanner video { width: 100%; border-radius: 12px; background: #000; max-height: 55vh; object-fit: cover; }
.scanFrame { border: 2px solid #e8c56f; border-radius: 12px; height: 0; margin: -45% 8% 45%; pointer-events: none; }
.scanner p { margin: 0; font-size: 14px; }
.scanner small { opacity: .8; overflow-wrap: anywhere; }
.scannerActions { display: flex; gap: 8px; }
.scanResult { display: flex; align-items: center; gap: 8px; border-top: 1px solid rgba(255,255,255,.2); padding-top: 8px; }
.scanResult img { width: 40px; border-radius: 4px; }
.scanResult div { flex: 1; display: flex; flex-direction: column; font-size: 12px; }
.scanResult span { opacity: .8; }

        .cardInfo {
          background: white;
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

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
  width: 100%;
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  z-index: 10;
  margin-top: 5px;
}

        .suggestionItem {
          display: flex;
          gap: 8px;
          padding: 8px;
          cursor: pointer;
        }

        .suggestionItem img {
          width: 30px;
        }

        .suggestionItem:hover {
          background: #f7edd9;
        }

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
  background: #c9a86a;
  transition: 0.4s;
}

.progressText {
  text-align: center;
  font-size: 13px;
  font-weight: 500;
}

.finish {
  padding: 12px;
  background: #333;
  color: white;
  border-radius: 10px;
  cursor: pointer;
  text-align: center;
}

@media (max-width: 640px) {
  .layout {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 0 12px 20px;
  }

  .left { min-height: 0; }
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

  .scanner video { max-height: 48vh; }
  .scannerActions { position: sticky; bottom: 0; }
  .scannerActions button, .rescanBtn { min-height: 46px; flex: 1; }
  .scanResult { align-items: flex-start; }
}
      `}</style>
    </main>
  );
}
