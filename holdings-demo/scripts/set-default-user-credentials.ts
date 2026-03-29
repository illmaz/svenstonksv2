// scripts/set-default-user-credentials.ts
// One-time script: sets username and passwordHash on the default user.
// Run: npx tsx scripts/set-default-user-credentials.ts

import "dotenv/config"
import { prisma } from "../lib/prisma"
import { hashPassword } from "../lib/auth/hash"

const USERNAME = "efe"
const TEMP_PASSWORD = "changeme123"

async function main() {
  const user = await prisma.user.findUnique({
    where: { externalId: "default" },
  })

  if (!user) {
    console.error("ERROR: No user with externalId = 'default' found. Run seed-default-user.ts first.")
    process.exit(1)
  }

  const passwordHash = await hashPassword(TEMP_PASSWORD)

  await prisma.user.update({
    where: { id: user.id },
    data: { username: USERNAME, passwordHash },
  })

  console.log("Updated user:", user.id)
  console.log("Username set:", USERNAME)
  console.log("Temporary password:", TEMP_PASSWORD)
  console.log("Change this password after first login.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
