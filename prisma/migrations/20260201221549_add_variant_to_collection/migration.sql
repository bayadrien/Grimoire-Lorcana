/*
  Migration corrigée manuellement :
  - Ajout du variant avec valeur par défaut
  - Préservation des données existantes
*/

-- 1️⃣ Créer l'enum
CREATE TYPE "Variant" AS ENUM ('normal', 'foil');

-- 2️⃣ Supprimer l'ancienne clé primaire si elle existe
ALTER TABLE "Collection"
DROP CONSTRAINT IF EXISTS "Collection_pkey";

-- 3️⃣ Ajouter la colonne `variant` avec une valeur par défaut
ALTER TABLE "Collection"
ADD COLUMN "variant" "Variant" NOT NULL DEFAULT 'normal';

-- 4️⃣ Supprimer la valeur par défaut (pour forcer le choix à l’avenir)
ALTER TABLE "Collection"
ALTER COLUMN "variant" DROP DEFAULT;

-- 5️⃣ Ajouter la contrainte unique finale
CREATE UNIQUE INDEX "Collection_userId_cardId_variant_key"
ON "Collection" ("userId", "cardId", "variant");
