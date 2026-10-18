"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import AppHeader from "@/app/components/AppHeader";
import { CHAPTERS_NAMES_FR } from "@/lib/chapters-fr";

type PromoCard = {
  id: string;
  name: string | null;
  name_fr: string | null;
  setCode: string | null;
  setName: string | null;
  collection_number: string | null;
  imageUrl: string | null;
  ink: string | null;
  rarity: string | null;
  type: string | null;
  text: string | null;
  usd: number | null;
  usd_foil: number | null;
  editable: boolean;
};

type FormState = {
  name: string;
  name_fr: string;
  setCode: string;
  collection_number: string;
  imageUrl: string;
  ink: string;
  rarity: string;
  type: string;
  text: string;
  usd: string;
  usd_foil: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  name_fr: "",
  setCode: "14",
  collection_number: "",
  imageUrl: "",
  ink: "",
  rarity: "Promo",
  type: "Character",
  text: "",
  usd: "",
  usd_foil: "",
};

const INKS = ["Amber", "Amethyst", "Emerald", "Ruby", "Sapphire", "Steel"];
const TYPES = ["Character", "Action", "Action, Song", "Item", "Location"];
const CHAPTERS = Object.entries(CHAPTERS_NAMES_FR).sort(([a], [b]) => Number(a) - Number(b));

function formFromCard(card: PromoCard): FormState {
  return {
    name: card.name || "",
    name_fr: card.name_fr || "",
    setCode: card.setCode || "14",
    collection_number: card.collection_number || "",
    imageUrl: card.imageUrl || "",
    ink: card.ink || "",
    rarity: card.rarity || "Promo",
    type: card.type || "Character",
    text: card.text || "",
    usd: card.usd === null ? "" : String(card.usd),
    usd_foil: card.usd_foil === null ? "" : String(card.usd_foil),
  };
}

export default function AjouterCartePage() {
  const [cards, setCards] = useState<PromoCard[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/cards/manual", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chargement impossible.");
      setCards(Array.isArray(data.cards) ? data.cards : []);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Chargement impossible." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/cards/manual", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...form }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Enregistrement impossible.");

      setMessage({
        kind: "success",
        text: editingId ? "Carte modifiée avec succès." : "Carte ajoutée au Grimoire. Elle apparaît maintenant dans son chapitre.",
      });
      resetForm();
      await loadCards();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Enregistrement impossible." });
    } finally {
      setSaving(false);
    }
  }

  function startEditing(card: PromoCard) {
    setEditingId(card.id);
    setForm(formFromCard(card));
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeCard(card: PromoCard) {
    if (!window.confirm(`Supprimer définitivement « ${card.name_fr || card.name || "cette carte"} » ?`)) return;

    setMessage(null);
    try {
      const response = await fetch("/api/cards/manual", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Suppression impossible.");
      if (editingId === card.id) resetForm();
      setMessage({ kind: "success", text: "Carte supprimée." });
      await loadCards();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Suppression impossible." });
    }
  }

  return (
    <>
      <AppHeader />
      <main className="manualPage">
        <div className="pageHeading">
          <div>
            <p>GESTION DU CATALOGUE</p>
            <h1>Ajouter une carte hors Lorcast</h1>
            <span>Pour les cartes promotionnelles, exclusives ou encore absentes de la synchronisation.</span>
          </div>
          <Link href="/chapitres">← Retour aux chapitres</Link>
        </div>

        <div className="contentGrid">
          <form className="cardForm" onSubmit={submit}>
            <div className="formTitle">
              <div><span>{editingId ? "✎" : "+"}</span><div><h2>{editingId ? "Modifier la carte" : "Nouvelle carte"}</h2><p>Les champs marqués * sont obligatoires.</p></div></div>
              {editingId && <button type="button" className="quietButton" onClick={resetForm}>Annuler</button>}
            </div>

            {message && <div className={`message ${message.kind}`} role="status">{message.text}</div>}

            <div className="fields twoColumns">
              <label>Nom anglais *<input required value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Ex. Belle — Always Reading" /></label>
              <label>Nom français<input value={form.name_fr} onChange={(event) => updateField("name_fr", event.target.value)} placeholder="Ex. Belle — Toujours plongée dans un livre" /></label>
              <label>Chapitre *<select required value={form.setCode} onChange={(event) => updateField("setCode", event.target.value)}>{CHAPTERS.map(([code, name]) => <option key={code} value={code}>Chapitre {code} — {name}</option>)}</select></label>
              <label>Numéro de collection *<input required value={form.collection_number} onChange={(event) => updateField("collection_number", event.target.value)} placeholder="Ex. 13/P4 ou 5/PD1" /></label>
              <label>Encre<select value={form.ink} onChange={(event) => updateField("ink", event.target.value)}><option value="">Non renseignée</option>{INKS.map((ink) => <option key={ink} value={ink}>{ink}</option>)}</select></label>
              <label>Type<select value={form.type} onChange={(event) => updateField("type", event.target.value)}>{TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
              <label>Rareté<input value={form.rarity} onChange={(event) => updateField("rarity", event.target.value)} placeholder="Promo" /></label>
              <label>Image de la carte<input type="url" value={form.imageUrl} onChange={(event) => updateField("imageUrl", event.target.value)} placeholder="https://…" /></label>
              <label>Prix normal (USD)<input inputMode="decimal" min="0" step="0.01" type="number" value={form.usd} onChange={(event) => updateField("usd", event.target.value)} placeholder="0.00" /></label>
              <label>Prix foil (USD)<input inputMode="decimal" min="0" step="0.01" type="number" value={form.usd_foil} onChange={(event) => updateField("usd_foil", event.target.value)} placeholder="0.00" /></label>
            </div>
            <label className="fullField">Texte de la carte<textarea rows={4} value={form.text} onChange={(event) => updateField("text", event.target.value)} placeholder="Capacités et texte de règles (facultatif)" /></label>

            <div className="previewLine">
              <div className="imagePreview">{form.imageUrl ? <img src={form.imageUrl} alt="Aperçu de la carte" /> : <span>APERÇU<br />DE L’IMAGE</span>}</div>
              <div><strong>{form.name_fr || form.name || "Nom de la carte"}</strong><span>Chapitre {form.setCode} · {form.collection_number || "numéro à renseigner"}</span><small>L’identifiant est créé automatiquement. La synchronisation Lorcast ne remplacera pas cette carte.</small></div>
            </div>

            <button className="saveButton" type="submit" disabled={saving}>{saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Ajouter au Grimoire"}</button>
          </form>

          <aside className="helpCard">
            <span>✦</span>
            <h2>Comment remplir une promo ?</h2>
            <ol>
              <li>Choisis le chapitre auquel la carte est rattachée.</li>
              <li>Recopie le numéro complet imprimé, par exemple <b>13/P4</b>.</li>
              <li>Ajoute l’adresse de l’image anglaise ou française.</li>
              <li>Le nom français peut rester vide si tu ne le connais pas encore.</li>
            </ol>
            <p>Une fois ajoutée, la carte apparaît dans le chapitre, la recherche et la gestion de collection.</p>
          </aside>
        </div>

        <section className="existingSection">
          <div className="sectionTitle"><div><p>CATALOGUE SPÉCIAL</p><h2>Cartes promotionnelles déjà connues</h2></div><span>{cards.length} carte{cards.length > 1 ? "s" : ""}</span></div>
          {loading ? <p className="emptyState">Chargement…</p> : cards.length === 0 ? <p className="emptyState">Aucune carte promotionnelle enregistrée.</p> : (
            <div className="promoGrid">
              {cards.map((card) => (
                <article className="promoCard" key={card.id}>
                  <div className="promoImage">{card.imageUrl ? <img src={card.imageUrl} alt={card.name_fr || card.name || "Carte promotionnelle"} /> : <span>Pas d’image</span>}</div>
                  <div className="promoInfo"><small>CHAPITRE {card.setCode || "—"} · {card.collection_number || "—"}</small><h3>{card.name_fr || card.name || "Sans nom"}</h3>{card.name_fr && card.name && card.name_fr !== card.name && <p>{card.name}</p>}<em>{card.rarity || "Promo"}</em></div>
                  {card.editable ? <div className="cardActions"><button type="button" onClick={() => startEditing(card)}>Modifier</button><button type="button" className="danger" onClick={() => void removeCard(card)}>Supprimer</button></div> : <span className="protectedBadge">Carte existante</span>}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        .manualPage{width:min(1180px,calc(100% - 30px));margin:34px auto 80px;color:#302641}.pageHeading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:24px 0}.pageHeading p,.sectionTitle p{margin:0 0 7px;color:#8c7b9f;font-size:10px;font-weight:900;letter-spacing:.16em}.pageHeading h1{margin:0;font-family:Georgia,serif;font-size:clamp(30px,5vw,48px);letter-spacing:-.045em}.pageHeading span{display:block;margin-top:9px;color:#756a80;font-size:13px}.pageHeading a{flex:0 0 auto;padding:10px 14px;border:1px solid #ded4e7;border-radius:99px;background:#fff;color:#5d4677;text-decoration:none;font-size:12px;font-weight:900}.contentGrid{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:18px;align-items:start}.cardForm,.helpCard,.existingSection{border:1px solid rgba(84,56,119,.13);border-radius:24px;background:rgba(255,253,249,.92);box-shadow:0 18px 44px rgba(45,30,68,.09)}.cardForm{padding:22px}.formTitle,.formTitle>div,.previewLine,.sectionTitle,.cardActions{display:flex;align-items:center}.formTitle{justify-content:space-between;gap:12px;margin-bottom:18px}.formTitle>div{gap:11px}.formTitle>div>span{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(135deg,#ffe596,#d8a53b);font-size:23px;font-weight:900}.formTitle h2,.formTitle p{margin:0}.formTitle h2{font-size:20px}.formTitle p{margin-top:3px;color:#887e91;font-size:11px}.quietButton{border:0;border-radius:10px;padding:9px 12px;background:#eee8f3;color:#5c4c6e;font-weight:800;cursor:pointer}.message{margin-bottom:15px;padding:11px 13px;border-radius:12px;font-size:12px;font-weight:800}.message.success{background:#e8f7ed;color:#2d6c43}.message.error{background:#fde9e7;color:#9a3730}.fields{display:grid;gap:13px}.twoColumns{grid-template-columns:repeat(2,minmax(0,1fr))}.fields label,.fullField{display:grid;gap:6px;color:#665a70;font-size:11px;font-weight:900}.fields input,.fields select,.fullField textarea{width:100%;min-width:0;border:1px solid #ded5e5;border-radius:12px;background:#fff;padding:11px 12px;color:#302641;font:inherit;font-size:13px;outline:none}.fields input:focus,.fields select:focus,.fullField textarea:focus{border-color:#9d78ca;box-shadow:0 0 0 3px rgba(157,120,202,.12)}.fullField{margin-top:13px}.fullField textarea{resize:vertical}.previewLine{gap:15px;margin-top:18px;padding:14px;border-radius:17px;background:#f5f0f7}.imagePreview{width:68px;height:95px;flex:0 0 auto;display:grid;place-items:center;overflow:hidden;border-radius:8px;background:#e7deeb;color:#8d7b98;text-align:center;font-size:8px;font-weight:900}.imagePreview img{width:100%;height:100%;object-fit:cover}.previewLine strong,.previewLine span,.previewLine small{display:block}.previewLine strong{font-size:15px}.previewLine span{margin-top:4px;color:#766a80;font-size:11px}.previewLine small{max-width:500px;margin-top:8px;color:#9a8fa2;font-size:10px;line-height:1.4}.saveButton{width:100%;margin-top:17px;border:0;border-radius:14px;padding:13px 16px;background:linear-gradient(135deg,#654590,#432b68);box-shadow:0 9px 20px rgba(68,42,105,.22);color:#fff;font-weight:900;cursor:pointer}.saveButton:disabled{opacity:.6;cursor:wait}.helpCard{position:sticky;top:100px;padding:22px;background:linear-gradient(150deg,#33224f,#1e1532);color:#f8f2ff}.helpCard>span{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:#f1c75a;color:#382341;font-size:22px}.helpCard h2{margin:15px 0 10px;font:700 21px Georgia,serif}.helpCard ol{margin:0;padding-left:18px;color:#ddd3ea;font-size:12px;line-height:1.55}.helpCard li+li{margin-top:7px}.helpCard p{margin:16px 0 0;padding-top:14px;border-top:1px solid rgba(255,255,255,.12);color:#c5b7d5;font-size:11px;line-height:1.5}.existingSection{margin-top:22px;padding:22px}.sectionTitle{justify-content:space-between;gap:14px;margin-bottom:16px}.sectionTitle h2{margin:0;font-size:22px}.sectionTitle>span{padding:7px 10px;border-radius:99px;background:#eee7f3;color:#665277;font-size:11px;font-weight:900}.promoGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}.promoCard{position:relative;display:grid;grid-template-columns:66px minmax(0,1fr);gap:12px;min-height:110px;padding:10px;border:1px solid #ebe4ed;border-radius:16px;background:#fff}.promoImage{width:66px;height:92px;display:grid;place-items:center;overflow:hidden;border-radius:8px;background:#eee9ef;color:#978b9c;font-size:9px}.promoImage img{width:100%;height:100%;object-fit:cover}.promoInfo{min-width:0;padding:5px 0 30px}.promoInfo small{color:#8b7d98;font-size:8px;font-weight:900;letter-spacing:.08em}.promoInfo h3{margin:5px 0 0;overflow:hidden;text-overflow:ellipsis;font-size:13px;white-space:nowrap}.promoInfo p{margin:3px 0 0;overflow:hidden;text-overflow:ellipsis;color:#8d8294;font-size:10px;white-space:nowrap}.promoInfo em{display:inline-block;margin-top:7px;padding:4px 7px;border-radius:99px;background:#f5e5b3;color:#725419;font-size:9px;font-style:normal;font-weight:900}.cardActions{position:absolute;right:9px;bottom:8px;gap:5px}.cardActions button{border:0;border-radius:8px;padding:5px 7px;background:#eee9f3;color:#59486a;font-size:9px;font-weight:900;cursor:pointer}.cardActions .danger{background:#fbe9e7;color:#9a3e36}.protectedBadge{position:absolute;right:9px;bottom:9px;color:#9a8ea2;font-size:8px;font-weight:800}.emptyState{padding:24px;text-align:center;color:#8d8295;font-size:12px}@media(max-width:820px){.contentGrid{grid-template-columns:1fr}.helpCard{position:static}.pageHeading{align-items:flex-start;flex-direction:column}.pageHeading a{align-self:flex-start}}@media(max-width:560px){.manualPage{width:calc(100% - 18px);margin-top:22px}.cardForm,.existingSection{padding:15px;border-radius:19px}.twoColumns{grid-template-columns:1fr}.promoGrid{grid-template-columns:1fr}.pageHeading h1{font-size:32px}}
      `}</style>
    </>
  );
}
