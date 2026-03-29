import "dotenv/config"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth/hash"

const BETA_USERS = [
  { username: "efe",     displayName: "Efe",     password: "efe123"     },
  { username: "breen",   displayName: "Breen",   password: "breen123"   },
  { username: "merdi",   displayName: "Merdi",   password: "merdi123"   },
  { username: "rubbert", displayName: "Rubbert", password: "rubbert123" },
]

async function main() {
  for (const u of BETA_USERS) {
    const passwordHash = await hashPassword(u.password)

    await prisma.user.upsert({
      where: { username: u.username },
      update: { displayName: u.displayName, passwordHash },
      create: {
        username: u.username,
        displayName: u.displayName,
        passwordHash,
        externalId: u.username,
      },
    })

    console.log(`✓ ${u.username} / ${u.password}`)
  }
}

main()
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
