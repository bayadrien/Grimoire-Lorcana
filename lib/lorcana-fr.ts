const normalize = (v?: string | null) =>
  (v ?? "").toLowerCase();

export const INK_FR: Record<string, string> = {
  amber: "Ambre",
  amethyst: "Améthyste",
  emerald: "Émeraude",
  ruby: "Rubis",
  sapphire: "Saphir",
  steel: "Acier",
};

export const RARITY_FR: Record<string, string> = {
  common: "Commune",
  uncommon: "Peu commune",
  rare: "Rare",
  superrare: "Super rare",
  legendary: "Légendaire",
  enchanted: "Enchantée",
  promo: "Promo",
};

export function tInk(ink?: string | null) {
  if (!ink) return "—";
  return INK_FR[normalize(ink)] ?? ink;
}

export function tRarity(rarity?: string | null) {
  if (!rarity) return "—";
  return RARITY_FR[normalize(rarity)] ?? rarity;
}
