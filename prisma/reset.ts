import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function reset() {
  console.log("🗑️ Clearing all data...");

  // Delete in order to respect foreign key constraints
  await prisma.activity.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.document.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.projectInfluencer.deleteMany();
  await prisma.project.deleteMany();
  await prisma.influencer.deleteMany();
  await prisma.client.deleteMany();
  // Keep users for login
  // await prisma.user.deleteMany();

  console.log("✅ All data cleared!");
}

reset()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

