import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { id: "adrien" },
    update: {},
    create: { id: "adrien", name: "Adrien" },
  });

  await prisma.user.upsert({
    where: { id: "angele" },
    update: {},
    create: { id: "angele", name: "Angèle" },
  });

  console.log("Seed OK: adrien + angele ✅");
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
