// @ts-nocheck
// scripts/seed-default-user.ts
// One-time backfill: creates a default User row and assigns all unowned holdings to it.
// Safe to run once. Do not run in production after real auth is wired.
//
// Run: npx tsx scripts/seed-default-user.ts

import "dotenv/config"
import { prisma } from "../lib/prisma"

async function main() {
  // Step 1: find or create the default user
  let user = await prisma.user.findUnique({
    where: { externalId: "default" },
  })

  if (user) {
    console.log("Default user already exists:", user.id)
  } else {
    user = await prisma.user.create({
      data: {
        externalId: "default",
        displayName: "Default User",
        email: null,
      },
    })
    console.log("Created default user:", user.id)
  }

  // Step 2: count unowned holdings before update
  const nullCount = await prisma.holding.count({
    where: { userId: null },
  })
  console.log("Holdings with userId = NULL:", nullCount)

  // Step 3: backfill all unowned holdings to the default user
  const updated = await prisma.holding.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  })
  console.log("Holdings backfilled:", updated.count)

  // Step 4: verify no nulls remain
  const remaining = await prisma.holding.count({
    where: { userId: null },
  })
  console.log("Holdings still with userId = NULL:", remaining)

  if (remaining === 0) {
    console.log("OK: all holdings now have an owner.")
  } else {
    console.error("WARNING: some holdings still have no owner.")
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
